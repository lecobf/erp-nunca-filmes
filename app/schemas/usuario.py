from typing import Optional
from pydantic import BaseModel


class UsuarioCreate(BaseModel):
    nome: str
    email: str
    senha: str


class UsuarioOut(BaseModel):
    id: int
    nome: str
    email: str

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: str
    senha: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario_id: int
    nome: str


class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    senha_atual: Optional[str] = None
    senha_nova: Optional[str] = None
