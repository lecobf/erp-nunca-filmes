from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..utils.deps import get_db
from ..models.usuario import Usuario
from ..schemas.usuario import UsuarioCreate, LoginRequest, TokenResponse, UsuarioUpdate, UsuarioOut
from ..core.security import hash_password, verify_password, create_access_token, get_current_user_id

ADMIN_EMAIL = "admin@nuncafilmes.com"

router = APIRouter(prefix="/auth", tags=["auth"])


def require_admin(usuario_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)) -> Usuario:
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario or usuario.email != ADMIN_EMAIL:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito ao administrador")
    return usuario


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
        email=usuario.email,
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
        email=usuario.email,
    )


@router.put("/me", response_model=UsuarioOut)
def update_me(
    payload: UsuarioUpdate,
    usuario_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if payload.nome is not None:
        usuario.nome = payload.nome

    if payload.senha_nova:
        if not payload.senha_atual:
            raise HTTPException(status_code=400, detail="Informe a senha atual para alterar a senha")
        if not verify_password(payload.senha_atual, usuario.senha_hash):
            raise HTTPException(status_code=400, detail="Senha atual incorreta")
        usuario.senha_hash = hash_password(payload.senha_nova)

    db.commit()
    db.refresh(usuario)
    return usuario


# ── Admin: gerência de usuários ────────────────────────────

@router.get("/users", response_model=list[UsuarioOut])
def list_users(admin: Usuario = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(Usuario).order_by(Usuario.id).all()


@router.post("/users", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UsuarioCreate, admin: Usuario = Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    usuario = Usuario(
        nome=payload.nome,
        email=payload.email,
        senha_hash=hash_password(payload.senha),
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.put("/users/{user_id}", response_model=UsuarioOut)
def update_user(user_id: int, payload: UsuarioUpdate, admin: Usuario = Depends(require_admin), db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if payload.nome is not None:
        usuario.nome = payload.nome
    if payload.senha_nova:
        usuario.senha_hash = hash_password(payload.senha_nova)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, admin: Usuario = Depends(require_admin), db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if usuario.email == ADMIN_EMAIL:
        raise HTTPException(status_code=400, detail="Não é possível excluir o administrador")
    db.delete(usuario)
    db.commit()
