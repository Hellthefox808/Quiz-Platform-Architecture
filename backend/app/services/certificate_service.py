from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.core.exceptions import NotFoundException
from backend.app.models.certificate import Certificate
from backend.app.schemas.certificate import CertificateResponse, CertificateVerifyResponse


class CertificateService:
    @staticmethod
    async def get_user_certificates(db: AsyncSession, user_id: str) -> List[CertificateResponse]:
        stmt = (
            select(Certificate)
            .where(Certificate.user_id == user_id)
            .options(
                selectinload(Certificate.user),
                selectinload(Certificate.quiz),
                selectinload(Certificate.attempt),
            )
            .order_by(Certificate.issued_at.desc())
        )
        res = await db.execute(stmt)
        certs = list(res.scalars().all())

        return [
            CertificateResponse(
                id=c.id,
                certificate_code=c.certificate_code,
                user_id=c.user_id,
                user_name=c.user.name,
                quiz_id=c.quiz_id,
                quiz_title=c.quiz.title,
                score=c.attempt.score,
                percentage=c.attempt.percentage,
                issued_at=c.issued_at,
            )
            for c in certs
        ]

    @staticmethod
    async def verify_certificate(db: AsyncSession, code: str) -> CertificateVerifyResponse:
        stmt = (
            select(Certificate)
            .where(Certificate.certificate_code == code.strip().upper())
            .options(
                selectinload(Certificate.user),
                selectinload(Certificate.quiz),
                selectinload(Certificate.attempt),
            )
        )
        res = await db.execute(stmt)
        cert = res.scalar_one_or_none()
        if not cert:
            raise NotFoundException(message="Certificate not found or verification code is invalid")

        return CertificateVerifyResponse(
            is_valid=True,
            certificate_code=cert.certificate_code,
            recipient_name=cert.user.name,
            quiz_title=cert.quiz.title,
            percentage=cert.attempt.percentage,
            issue_date=cert.issued_at,
        )
