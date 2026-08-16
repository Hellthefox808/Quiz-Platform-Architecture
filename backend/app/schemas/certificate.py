from datetime import datetime
from pydantic import BaseModel, ConfigDict


class CertificateResponse(BaseModel):
    id: str
    certificate_code: str
    user_id: str
    user_name: str
    quiz_id: str
    quiz_title: str
    score: float
    percentage: float
    issued_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CertificateVerifyResponse(BaseModel):
    is_valid: bool
    certificate_code: str
    recipient_name: str
    quiz_title: str
    percentage: float
    issue_date: datetime
