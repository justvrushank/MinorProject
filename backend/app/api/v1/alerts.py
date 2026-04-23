from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.alert import Alert
from app.models.user import User
from app.schemas.alert import AlertOut

router = APIRouter()


def a_to_out(a: Alert) -> dict:
    return {
        "id": a.id,
        "type": a.type,
        "title": a.title,
        "message": a.message,
        "read": a.read,
        "projectId": a.project_id,
        "createdAt": a.created_at.isoformat() if a.created_at else None,
    }


@router.get("", response_model=list[AlertOut])
async def list_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Alert))
    return [a_to_out(a) for a in result.scalars().all()]


@router.post("/{id}/read", response_model=AlertOut)
async def mark_read(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Alert).where(Alert.id == id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.read = True
    await db.commit()
    await db.refresh(alert)
    return a_to_out(alert)
