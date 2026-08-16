from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.api.deps import require_admin
from backend.app.core.database import get_db
from backend.app.core.exceptions import BadRequestException, NotFoundException
from backend.app.models.attempt import AssessmentAttempt, AttemptStatus
from backend.app.models.audit import AuditAction
from backend.app.models.user import User, UserRole, UserStatus
from backend.app.schemas.common import PaginatedResponse
from backend.app.schemas.user import UserAdminResponse, UserResponse, UserUpdateStatusRequest
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="/users", tags=["Users (Admin)"])


@router.get("", response_model=PaginatedResponse[UserAdminResponse])
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[UserRole] = None,
    status: Optional[UserStatus] = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).options(selectinload(User.attempts))
    if search:
        stmt = stmt.where(User.name.ilike(f"%{search.strip()}%") | User.email.ilike(f"%{search.strip()}%"))
    if role:
        stmt = stmt.where(User.role == role)
    if status:
        stmt = stmt.where(User.status == status)

    count_stmt = select(func.count(User.id))
    if search:
        count_stmt = count_stmt.where(User.name.ilike(f"%{search.strip()}%") | User.email.ilike(f"%{search.strip()}%"))
    if role:
        count_stmt = count_stmt.where(User.role == role)
    if status:
        count_stmt = count_stmt.where(User.status == status)

    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    users = list((await db.execute(stmt)).scalars().all())

    items = []
    for u in users:
        completed = [a for a in u.attempts if a.status in [AttemptStatus.COMPLETED, AttemptStatus.EXPIRED]]
        passed = [a for a in completed if a.passed]
        avg_score = sum(a.percentage for a in completed) / len(completed) if completed else 0.0

        items.append(
            UserAdminResponse(
                id=u.id,
                name=u.name,
                email=u.email,
                role=u.role,
                status=u.status,
                created_at=u.created_at,
                last_login_at=u.last_login_at,
                total_attempts=len(completed),
                passed_attempts=len(passed),
                average_score=round(avg_score, 1),
            )
        )

    total_pages = (total + page_size - 1) // page_size
    return PaginatedResponse[UserAdminResponse](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{user_id}", response_model=UserAdminResponse)
async def get_user_detail(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(User.id == user_id).options(selectinload(User.attempts))
    u = (await db.execute(stmt)).scalar_one_or_none()
    if not u:
        raise NotFoundException(message="User not found")

    completed = [a for a in u.attempts if a.status in [AttemptStatus.COMPLETED, AttemptStatus.EXPIRED]]
    passed = [a for a in completed if a.passed]
    avg_score = sum(a.percentage for a in completed) / len(completed) if completed else 0.0

    return UserAdminResponse(
        id=u.id,
        name=u.name,
        email=u.email,
        role=u.role,
        status=u.status,
        created_at=u.created_at,
        last_login_at=u.last_login_at,
        total_attempts=len(completed),
        passed_attempts=len(passed),
        average_score=round(avg_score, 1),
    )


@router.patch("/{user_id}/status", response_model=UserResponse)
async def update_user_status(
    user_id: str,
    data: UserUpdateStatusRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if user_id == admin.id:
        raise BadRequestException(message="Administrators cannot modify their own account status")

    stmt = select(User).where(User.id == user_id)
    u = (await db.execute(stmt)).scalar_one_or_none()
    if not u:
        raise NotFoundException(message="User not found")

    u.status = data.status
    action = AuditAction.USER_ACTIVATED if data.status == UserStatus.ACTIVE else AuditAction.USER_SUSPENDED
    await AuditService.log_event(
        db=db,
        action=action,
        user_id=admin.id,
        resource_type="User",
        resource_id=u.id,
        details={"target_email": u.email, "new_status": u.status.value},
    )
    await db.commit()
    await db.refresh(u)
    return u
