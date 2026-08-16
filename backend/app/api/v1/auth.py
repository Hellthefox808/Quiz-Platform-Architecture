from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address
from backend.app.api.deps import get_current_user, limiter
from backend.app.core.database import get_db
from backend.app.models.user import User
from backend.app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from backend.app.schemas.common import MessageResponse
from backend.app.schemas.user import UserResponse
from backend.app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=201)
@limiter.limit("10/minute")
async def register(
    request: Request,
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    ip_address = request.client.host if request.client else None
    user = await AuthService.register(db=db, data=data, ip_address=ip_address)
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("15/minute")
async def login(
    request: Request,
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    token_response = await AuthService.login(
        db=db,
        data=data,
        ip_address=ip_address,
        user_agent=user_agent
    )
    return token_response


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit("5/minute")
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    ip_address = request.client.host if request.client else None
    raw_token = await AuthService.request_password_reset(db=db, email=data.email, ip_address=ip_address)
    # Generic security message (in local development we could also attach token for convenience)
    return MessageResponse(
        message=f"If an account with that email exists, a password reset link has been generated. Token for dev/testing: {raw_token}"
    )


@router.post("/reset-password", response_model=MessageResponse)
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    ip_address = request.client.host if request.client else None
    await AuthService.reset_password(
        db=db,
        raw_token=data.token,
        new_password=data.new_password,
        ip_address=ip_address
    )
    return MessageResponse(message="Password has been reset successfully. You can now login.")


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await AuthService.change_password(
        db=db,
        user=current_user,
        current_password=data.current_password,
        new_password=data.new_password,
    )
    return MessageResponse(message="Password changed successfully.")
