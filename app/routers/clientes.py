from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from ..utils.deps import get_db
from ..models.cliente import Cliente
from ..schemas.cliente import ClienteBase, ClienteOut

router = APIRouter(prefix="/clientes", tags=["clientes"])


from sqlalchemy import func

from sqlalchemy import text

@router.get("/com-pagamentos")
def clientes_com_pagamentos(db: Session = Depends(get_db)):
    """
    Retorna todos os clientes que possuem pelo menos um pagamento registrado,
    de forma compatível com SQLite (usando SQL puro).
    """
    sql = text("""
        SELECT DISTINCT c.id, c.nome
        FROM clientes c
        JOIN servicos s ON s.cliente_id = c.id
        JOIN pagamentos p ON p.servico_id = s.id
        ORDER BY c.nome;
    """)

    result = db.execute(sql).fetchall()
    clientes = [{"id": row[0], "nome": row[1]} for row in result]

    print(f"[DEBUG] Clientes com pagamentos encontrados: {len(clientes)}")
    return clientes



# ✅ LISTAR CLIENTES COM FILTRO OPCIONAL (nome, email ou telefone)
@router.get("", response_model=List[ClienteOut])
def listar_clientes(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Busca parcial por nome, email ou telefone"),
):
    query = db.query(Cliente)
    if search:
        termo = f"%{search.strip()}%"
        query = query.filter(
            (Cliente.nome.ilike(termo))
            | (Cliente.email.ilike(termo))
            | (Cliente.telefone.ilike(termo))
        )
    return query.order_by(Cliente.nome.asc()).all()


# ✅ CRIAR CLIENTE
@router.post("", response_model=ClienteOut)
def criar_cliente(cliente: ClienteBase, db: Session = Depends(get_db)):
    db_cliente = Cliente(**cliente.dict())
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente


# ✅ ATUALIZAR CLIENTE
@router.put("/{cliente_id}", response_model=ClienteOut)
def atualizar_cliente(cliente_id: int, cliente: ClienteBase, db: Session = Depends(get_db)):
    db_cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    for field, value in cliente.dict().items():
        setattr(db_cliente, field, value)

    db.commit()
    db.refresh(db_cliente)
    return db_cliente


# ✅ DELETAR CLIENTE
@router.delete("/{cliente_id}")
def deletar_cliente(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    db.delete(cliente)
    db.commit()
    return {"ok": True}


# ✅ IMPORTAÇÃO EM MASSA
class ClienteImport(BaseModel):
    nome: str
    email: Optional[str] = None
    telefone: Optional[str] = None
    cpf_cnpj: Optional[str] = None


@router.post("/importar")
def importar_clientes(dados: List[ClienteImport], db: Session = Depends(get_db)):
    novos = []
    for item in dados:
        cliente = Cliente(
            nome=item.nome,
            email=item.email,
            telefone=item.telefone,
            cpf_cnpj=item.cpf_cnpj,
        )
        db.add(cliente)
        novos.append(cliente)

    db.commit()
    return {"msg": f"{len(novos)} clientes importados com sucesso"}
