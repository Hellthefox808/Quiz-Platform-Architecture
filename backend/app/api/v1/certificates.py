from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.api.deps import get_current_user
from backend.app.core.database import get_db
from backend.app.models.user import User
from backend.app.schemas.certificate import CertificateResponse, CertificateVerifyResponse
from backend.app.services.certificate_service import CertificateService

router = APIRouter(prefix="/certificates", tags=["Certificates"])


@router.get("/my", response_model=List[CertificateResponse])
async def get_my_certificates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await CertificateService.get_user_certificates(db=db, user_id=current_user.id)


@router.get("/verify/{code}", response_model=CertificateVerifyResponse)
async def verify_certificate(
    code: str,
    db: AsyncSession = Depends(get_db),
):
    return await CertificateService.verify_certificate(db=db, code=code)
