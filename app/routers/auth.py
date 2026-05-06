from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..utils.deps import get_db
from ..models.usuario import Usuario
from ..schemas.usuario import UsuarioCreate, LoginRequest, TokenResponse
from ..core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UsuarioCreate, db: Session = Depends(get_db)):
    existing = db.query(Usuario).filter(Usuario.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    usuario = Usuario(
        nome=payload.nome,
        email=payload.email,
        senha_hash=hash_password(payload.senha),
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    token = create_access_token({"sub": str(usuario.id)})
    return TokenResponse(
        access_token=token,
        usuario_id=usuario.id,
        nome=usuario.nome,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == payload.email).first()
    if not usuario or not verify_password(payload.senha, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha inválidos",
        )

    token = create_access_token({"sub": str(usuario.id)})
    return TokenResponse(
        access_token=token,
        usuario_id=usuario.id,
        nome=usuario.nome,
    )
