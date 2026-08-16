import re
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.api.deps import get_current_user_optional, require_admin
from backend.app.core.database import get_db
from backend.app.core.exceptions import BadRequestException, ConflictException, NotFoundException
from backend.app.models.audit import AuditAction
from backend.app.models.category import Category
from backend.app.models.quiz import Quiz
from backend.app.models.user import User, UserRole
from backend.app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="/categories", tags=["Categories"])


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text


@router.get("", response_model=List[CategoryResponse])
async def list_categories(
    include_inactive: bool = Query(False),
    user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Category).options(selectinload(Category.quizzes))
    if not include_inactive or (not user or user.role != UserRole.ADMIN):
        stmt = stmt.where(Category.is_active == True)

    stmt = stmt.order_by(Category.name.asc())
    categories = list((await db.execute(stmt)).scalars().all())

    return [
        CategoryResponse(
            id=c.id,
            name=c.name,
            slug=c.slug,
            description=c.description,
            is_active=c.is_active,
            quiz_count=len(c.quizzes),
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c in categories
    ]


@router.post("", response_model=CategoryResponse, status_code=201)
async def create_category(
    data: CategoryCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    slug = data.slug or slugify(data.name)
    
    # Check uniqueness
    existing_stmt = select(Category).where((Category.name == data.name.strip()) | (Category.slug == slug))
    existing = (await db.execute(existing_stmt)).scalar_one_or_none()
    if existing:
        raise ConflictException(message="A category with this name or slug already exists")

    new_cat = Category(
        name=data.name.strip(),
        slug=slug,
        description=data.description.strip() if data.description else None,
        is_active=data.is_active,
    )
    db.add(new_cat)
    await db.flush()

    await AuditService.log_event(
        db=db,
        action=AuditAction.CATEGORY_CREATED,
        user_id=admin.id,
        resource_type="Category",
        resource_id=new_cat.id,
        details={"name": new_cat.name, "slug": new_cat.slug},
    )
    await db.commit()
    await db.refresh(new_cat)

    return CategoryResponse(
        id=new_cat.id,
        name=new_cat.name,
        slug=new_cat.slug,
        description=new_cat.description,
        is_active=new_cat.is_active,
        quiz_count=0,
        created_at=new_cat.created_at,
        updated_at=new_cat.updated_at,
    )


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    data: CategoryUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Category).where(Category.id == category_id).options(selectinload(Category.quizzes))
    cat = (await db.execute(stmt)).scalar_one_or_none()
    if not cat:
        raise NotFoundException(message="Category not found")

    if data.name is not None:
        cat.name = data.name.strip()
    if data.slug is not None:
        cat.slug = data.slug.strip()
    elif data.name is not None:
        cat.slug = slugify(data.name)
    if data.description is not None:
        cat.description = data.description.strip() if data.description else None
    if data.is_active is not None:
        cat.is_active = data.is_active

    await AuditService.log_event(
        db=db,
        action=AuditAction.CATEGORY_UPDATED,
        user_id=admin.id,
        resource_type="Category",
        resource_id=cat.id,
        details={"name": cat.name, "is_active": cat.is_active},
    )
    await db.commit()
    await db.refresh(cat)

    return CategoryResponse(
        id=cat.id,
        name=cat.name,
        slug=cat.slug,
        description=cat.description,
        is_active=cat.is_active,
        quiz_count=len(cat.quizzes),
        created_at=cat.created_at,
        updated_at=cat.updated_at,
    )


@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Category).where(Category.id == category_id).options(selectinload(Category.quizzes))
    cat = (await db.execute(stmt)).scalar_one_or_none()
    if not cat:
        raise NotFoundException(message="Category not found")

    # Safe deletion policy: Do not delete category if quizzes are attached
    if len(cat.quizzes) > 0:
        # Deactivate / archive instead of cascade deleting
        cat.is_active = False
        await AuditService.log_event(
            db=db,
            action=AuditAction.CATEGORY_DELETED,
            user_id=admin.id,
            resource_type="Category",
            resource_id=cat.id,
            details={"action": "archived_due_to_existing_quizzes", "quizzes_count": len(cat.quizzes)},
        )
        await db.commit()
        return {"message": "Category has quizzes attached and has been deactivated instead of deleted", "is_active": False}

    await db.delete(cat)
    await AuditService.log_event(
        db=db,
        action=AuditAction.CATEGORY_DELETED,
        user_id=admin.id,
        resource_type="Category",
        resource_id=category_id,
    )
    await db.commit()
    return {"message": "Category deleted successfully"}
