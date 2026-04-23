from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse, RefreshResponse
import uuid

router = APIRouter()


def set_refresh_cookie(response: Response, token: str):
    response.set_cookie(
        "refreshToken",
        token,
        httponly=True,
        samesite="lax",
        max_age=7 * 24 * 3600,
    )


@router.post("/register", response_model=AuthResponse)
async def register(body: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        id=str(uuid.uuid4()),
        email=body.email,
        hashed_password=hash_password(body.password),
        role="analyst",  # R08: always analyst on self-register
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    access = create_access_token({"sub": user.id})
    refresh = create_refresh_token({"sub": user.id})
    set_refresh_cookie(response, refresh)
    return AuthResponse(
        user={"id": user.id, "email": user.email, "role": user.role},
        accessToken=access,
    )


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access = create_access_token({"sub": user.id})
    refresh = create_refresh_token({"sub": user.id})
    set_refresh_cookie(response, refresh)
    return AuthResponse(
        user={"id": user.id, "email": user.email, "role": user.role},
        accessToken=access,
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(request: Request, db: AsyncSession = Depends(get_db)):
    token = request.cookies.get("refreshToken")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    payload = decode_refresh_token(token)
    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access = create_access_token({"sub": user.id})
    return RefreshResponse(accessToken=access)


@router.post("/logout", status_code=204)
async def logout(response: Response):
    response.delete_cookie("refreshToken")
