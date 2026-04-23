from pydantic import BaseModel


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    role: str
    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    user: UserOut
    accessToken: str


class RefreshResponse(BaseModel):
    accessToken: str
