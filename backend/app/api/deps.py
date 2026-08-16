from typing import Optional
from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address
from backend.app.core.database import get_db
from backend.app.core.exceptions import ForbiddenException, UnauthorizedException
from backend.app.core.security import decode_access_token
from backend.app.models.user import User, UserRole, UserStatus

security_scheme = HTTPBearer(auto_error=False)
limiter = Limiter(key_func=get_remote_address)


async def get_current_user_optional(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not auth or not auth.credentials:
        return None

    payload = decode_access_token(auth.credentials)
    if not payload or "sub" not in payload:
        return None

    user_id = payload["sub"]
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or user.status == UserStatus.SUSPENDED:
        return None

    return user


async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not auth or not auth.credentials:
        raise UnauthorizedException(message="Authentication credentials were not provided")

    payload = decode_access_token(auth.credentials)
    if not payload or "sub" not in payload:
        raise UnauthorizedException(message="Invalid or expired access token")

    user_id = payload["sub"]
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise UnauthorizedException(message="User account no longer exists")

    if user.status == UserStatus.SUSPENDED:
        raise ForbiddenException(message="Account is suspended")

    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise ForbiddenException(message="Administrative privileges are required for this action")
    return current_user


async def require_student(current_user: User = Depends(get_current_user)) -> User:
    return current_user
