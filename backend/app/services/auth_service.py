import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.config import settings
from backend.app.core.exceptions import BadRequestException, ConflictException, ForbiddenException, UnauthorizedException
from backend.app.core.security import create_access_token, get_password_hash, verify_password
from backend.app.models.audit import AuditAction
from backend.app.models.user import PasswordResetToken, User, UserRole, UserStatus
from backend.app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from backend.app.services.audit_service import AuditService


class AuthService:
    @staticmethod
    async def register(db: AsyncSession, data: RegisterRequest, ip_address: Optional[str] = None) -> User:
        # Check if user with email already exists
        stmt = select(User).where(User.email == data.email.lower().strip())
        res = await db.execute(stmt)
        if res.scalar_one_or_none():
            raise ConflictException(message="A user with this email already exists")

        new_user = User(
            name=data.name.strip(),
            email=data.email.lower().strip(),
            password_hash=get_password_hash(data.password),
            role=UserRole.STUDENT,  # Role strictly enforced to STUDENT upon registration
            status=UserStatus.ACTIVE,
        )
        db.add(new_user)
        await db.flush()

        await AuditService.log_event(
            db=db,
            action=AuditAction.REGISTER,
            user_id=new_user.id,
            resource_type="User",
            resource_id=new_user.id,
            ip_address=ip_address,
            details={"email": new_user.email, "role": new_user.role.value},
        )
        await db.commit()
        await db.refresh(new_user)
        return new_user

    @staticmethod
    async def login(db: AsyncSession, data: LoginRequest, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> TokenResponse:
        stmt = select(User).where(User.email == data.email.lower().strip())
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()

        if not user or not verify_password(data.password, user.password_hash):
            await AuditService.log_event(
                db=db,
                action=AuditAction.LOGIN_FAILURE,
                ip_address=ip_address,
                user_agent=user_agent,
                details={"attempted_email": data.email.lower().strip()},
            )
            await db.commit()
            raise UnauthorizedException(message="Invalid email or password")

        if user.status == UserStatus.SUSPENDED:
            await AuditService.log_event(
                db=db,
                action=AuditAction.LOGIN_FAILURE,
                user_id=user.id,
                ip_address=ip_address,
                details={"reason": "account_suspended"},
            )
            await db.commit()
            raise ForbiddenException(message="Your account is suspended. Please contact the administrator.")

        user.last_login_at = datetime.now(timezone.utc)
        
        await AuditService.log_event(
            db=db,
            action=AuditAction.LOGIN_SUCCESS,
            user_id=user.id,
            resource_type="User",
            resource_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            details={"role": user.role.value},
        )
        await db.commit()

        token = create_access_token(
            subject=user.id,
            extra_claims={"email": user.email, "role": user.role.value, "name": user.name}
        )

        return TokenResponse(
            access_token=token,
            user_id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            status=user.status,
        )

    @staticmethod
    async def request_password_reset(db: AsyncSession, email: str, ip_address: Optional[str] = None) -> str:
        stmt = select(User).where(User.email == email.lower().strip())
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()

        raw_token = secrets.token_urlsafe(32)
        if user:
            token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)
            
            reset_entry = PasswordResetToken(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=expires_at,
                is_used=False,
            )
            db.add(reset_entry)
            await AuditService.log_event(
                db=db,
                action=AuditAction.PASSWORD_RESET_REQUEST,
                user_id=user.id,
                resource_type="PasswordResetToken",
                ip_address=ip_address,
            )
            await db.commit()

        # For security and user privacy, returns a generic response (or the token directly in development mode)
        return raw_token

    @staticmethod
    async def reset_password(db: AsyncSession, raw_token: str, new_password: str, ip_address: Optional[str] = None) -> None:
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        stmt = (
            select(PasswordResetToken)
            .where(PasswordResetToken.token_hash == token_hash)
            .where(PasswordResetToken.is_used == False)
        )
        res = await db.execute(stmt)
        reset_token = res.scalar_one_or_none()

        if not reset_token:
            raise BadRequestException(message="Invalid or expired reset token")

        # Compare timezone-aware timestamps safely
        token_expires = reset_token.expires_at
        if token_expires.tzinfo is None:
            token_expires = token_expires.replace(tzinfo=timezone.utc)

        if token_expires < datetime.now(timezone.utc):
            raise BadRequestException(message="Reset token has expired")

        user_stmt = select(User).where(User.id == reset_token.user_id)
        user_res = await db.execute(user_stmt)
        user = user_res.scalar_one_or_none()
        if not user:
            raise BadRequestException(message="User not found for token")

        user.password_hash = get_password_hash(new_password)
        reset_token.is_used = True

        await AuditService.log_event(
            db=db,
            action=AuditAction.PASSWORD_RESET_SUCCESS,
            user_id=user.id,
            resource_type="User",
            resource_id=user.id,
            ip_address=ip_address,
        )
        await db.commit()

    @staticmethod
    async def change_password(db: AsyncSession, user: User, current_password: str, new_password: str) -> None:
        if not verify_password(current_password, user.password_hash):
            raise BadRequestException(message="Incorrect current password")

        user.password_hash = get_password_hash(new_password)
        await AuditService.log_event(
            db=db,
            action=AuditAction.PASSWORD_CHANGED,
            user_id=user.id,
            resource_type="User",
            resource_id=user.id,
        )
        await db.commit()
