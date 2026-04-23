from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.verification import Verification
from app.models.user import User
from app.schemas.verification import VerificationCreate, VerificationUpdate, VerificationOut
import uuid

router = APIRouter()


def v_to_out(v: Verification) -> dict:
    return {
        "id": v.id,
        "job_id": v.job_id,
        "project_id": v.project_id,
        "verifier_id": v.verifier_id,
        "status": v.status,
        "notes": v.notes,
        "createdAt": v.created_at.isoformat() if v.created_at else None,
    }


@router.get("", response_model=list[VerificationOut])
async def list_verifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Verification))
    return [v_to_out(v) for v in result.scalars().all()]


@router.post("", response_model=VerificationOut, status_code=201)
async def create_verification(
    body: VerificationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    v = Verification(id=str(uuid.uuid4()), verifier_id=current_user.id, **body.model_dump())
    db.add(v)
    await db.commit()
    await db.refresh(v)
    return v_to_out(v)


@router.put("/{id}", response_model=VerificationOut)
async def update_verification(
    id: str,
    body: VerificationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Verification).where(Verification.id == id))
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Verification not found")
    for k, val in body.model_dump(exclude_none=True).items():
        setattr(v, k, val)
    await db.commit()
    await db.refresh(v)
    return v_to_out(v)
