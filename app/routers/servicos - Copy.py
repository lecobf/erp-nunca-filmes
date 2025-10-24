import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..utils.deps import get_db
from ..models.servico import Servico
from ..models.pagamento import Pagamento
from ..models.custo import Custo
from ..models.cliente import Cliente
from ..models.equipamento import Equipamento
from ..models.servico_equipamento import ServicoEquipamento
from ..schemas.servico import ServicoCreate, ServicoOut, ServicoEquipamentoIn
from sqlalchemy.orm import joinedload

router = APIRouter(prefix="/servicos", tags=["servicos"])

# ---------- Helpers ----------
def _default_previsao_pagamento(data_contratacao: datetime.date | None) -> datetime.date:
    if not data_contratacao:
        data_contratacao = datetime.date.today()
    return data_contratacao + datetime.timedelta(days=30)

def _aplicar_regras_e_calcular(
    db: Session,
    tipo_servico: str,
    numero_diarias: int,
    valor_diaria_cache: float,
    valor_diaria_equipamentos: float,
    equipamentos_in: list[ServicoEquipamentoIn] | None,
) -> tuple[float, float, list[ServicoEquipamento]]:
    """
    Aplica regras de negócio e retorna:
    - valor_diaria_equipamentos_calculado
    - valor_total_calculado (antes do desconto)
    - lista de objetos ServicoEquipamento (prontos para anexar ao Serviço)
    """
    itens_obj: list[ServicoEquipamento] = []
    valor_diaria_equipamentos_calc = float(valor_diaria_equipamentos or 0.0)

    # Se vier a lista de equipamentos, usamos a soma dos subtotais por diária
    if equipamentos_in:
        soma = 0.0
        for item in equipamentos_in:
            equip = db.query(Equipamento).filter(Equipamento.id == item.equipamento_id).first()
            if not equip:
                raise HTTPException(status_code=404, detail=f"Equipamento {item.equipamento_id} não encontrado")
            subtotal = (equip.valor_aluguel or 0.0) * (item.quantidade or 1)
            soma += subtotal

            itens_obj.append(
                ServicoEquipamento(
                    equipamento_id=equip.id,
                    quantidade=item.quantidade or 1,
                    valor_unit_diaria=equip.valor_aluguel or 0.0,
                    subtotal_diaria=subtotal,
                )
            )
        valor_diaria_equipamentos_calc = soma

    # Regras por tipo
    t = (tipo_servico or "").lower()
    if t == "aluguel":
        valor_diaria_cache = 0.0  # sempre 0 em Aluguel
        if valor_diaria_equipamentos_calc <= 0.0:
            # Em aluguel, precisa ter diária de equipamentos > 0 (via campo ou via equipamentos)
            raise HTTPException(status_code=400, detail="Em Aluguel, valor_diaria_equipamentos deve ser > 0 (ou selecionar equipamentos).")

    elif t == "job":
        # Cache pode ser >0 ou 0; equipamentos podem ser 0
        pass
    else:
        raise HTTPException(status_code=400, detail="tipo_servico deve ser 'Job' ou 'Aluguel'.")

    # Cálculo principal
    valor_total = (float(valor_diaria_cache or 0.0) * numero_diarias) + (valor_diaria_equipamentos_calc * numero_diarias)

    return valor_diaria_equipamentos_calc, valor_total, itens_obj

def _recalcular_pendente_e_status(db: Session, servico: Servico) -> None:
    soma_pag = db.query(func.sum(Pagamento.valor_pago)).filter(Pagamento.servico_id == servico.id).scalar() or 0.0
    servico.valor_pendente_atual = max((servico.valor_final or 0.0) - soma_pag, 0.0)
    servico.status = (
        "pago" if soma_pag >= (servico.valor_final or 0.0)
        else ("parcial" if soma_pag > 0 else "pendente")
    )

# ---------- LISTAR ----------
@router.get("", response_model=list[dict])
def listar_servicos(
    db: Session = Depends(get_db),
    status: str | None = Query(None),
    cliente_id: int | None = Query(None),
    tipo_servico: str | None = Query(None),
    ano: int | None = Query(None),
    mes: int | None = Query(None),
):
    query = db.query(Servico)

    if status:
        query = query.filter(Servico.status == status)
    if cliente_id:
        query = query.filter(Servico.cliente_id == cliente_id)
    if tipo_servico:
        query = query.filter(Servico.tipo_servico == tipo_servico)

    # filtros de período (opcionais)
    if ano:
        query = query.filter(func.strftime("%Y", Servico.data_contratacao) == str(ano))
    if mes:
        query = query.filter(func.strftime("%m", Servico.data_contratacao) == f"{int(mes):02d}")

    servicos = query.order_by(Servico.data_contratacao.desc()).all()

    resultado = []
    for s in servicos:
        soma_pag = db.query(func.sum(Pagamento.valor_pago)).filter(Pagamento.servico_id == s.id).scalar() or 0.0
        soma_custos = db.query(func.sum(Custo.valor)).filter(Custo.servico_id == s.id).scalar() or 0.0
        cliente = db.query(Cliente).filter(Cliente.id == s.cliente_id).first()

        valor_a_receber = max((s.valor_final or 0.0) - soma_pag, 0.0)
        lucro_liquido = (s.valor_final or 0.0) - soma_custos

        resultado.append({
            "id": s.id,
            "data_contratacao": s.data_contratacao,
            "tipo_servico": s.tipo_servico,
            "cliente_id": s.cliente_id,
            "cliente_nome": cliente.nome if cliente else None,
            "descricao": s.descricao,

            "numero_diarias": s.numero_diarias,
            "valor_diaria_cache": s.valor_diaria_cache,
            "valor_diaria_equipamentos": s.valor_diaria_equipamentos,

            "valor_total": s.valor_total,
            "valor_desconto": s.valor_desconto,
            "valor_final": s.valor_final,

            "data_previsao_pagamento": s.data_previsao_pagamento,
            "status": s.status,
            "valor_a_receber": valor_a_receber,
            "lucro_liquido": lucro_liquido,
            "is_pacote": s.is_pacote, 
            "valor_pendente_atual": s.valor_pendente_atual,

        })
    return resultado

# ---------- CRIAR ----------
@router.post("", response_model=ServicoOut)
def criar_servico(payload: ServicoCreate, db: Session = Depends(get_db)):
    data_prev = payload.data_previsao_pagamento or _default_previsao_pagamento(payload.data_contratacao)

    vd_equip_calc, valor_total, itens = _aplicar_regras_e_calcular(
        db=db,
        tipo_servico=payload.tipo_servico,
        numero_diarias=payload.numero_diarias,
        valor_diaria_cache=payload.valor_diaria_cache,
        valor_diaria_equipamentos=payload.valor_diaria_equipamentos,
        equipamentos_in=payload.equipamentos or [],
    )

    valor_final = max(valor_total - (payload.valor_desconto or 0.0), 0.0)

    s = Servico(
        data_contratacao=payload.data_contratacao,
        tipo_servico=payload.tipo_servico,
        cliente_id=payload.cliente_id,
        descricao=payload.descricao,

        numero_diarias=payload.numero_diarias,
        valor_diaria_cache=payload.valor_diaria_cache if payload.tipo_servico.lower() == "job" else 0.0,
        valor_diaria_equipamentos=vd_equip_calc,

        valor_total=valor_total,
        valor_desconto=payload.valor_desconto or 0.0,
        valor_final=valor_final,

        data_previsao_pagamento=data_prev,
        status="pendente",
        is_pacote=payload.is_pacote,  # 👈 salva a flag
    )

    db.add(s)
    db.flush()  # garante s.id

    # anexar itens de equipamentos (se houver)
    for it in itens:
        it.servico_id = s.id
        db.add(it)

    # saldo inicial
    s.valor_pendente_atual = valor_final

    db.commit()
    db.refresh(s)
    return s

# ---------- ATUALIZAR ----------
@router.put("/{servico_id}", response_model=ServicoOut)
def atualizar_servico(servico_id: int, payload: ServicoCreate, db: Session = Depends(get_db)):
    s = db.query(Servico).filter(Servico.id == servico_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")

    # (Re)calcular preços e (re)gravar itens se vierem
    vd_equip_calc, valor_total, itens = _aplicar_regras_e_calcular(
        db=db,
        tipo_servico=payload.tipo_servico,
        numero_diarias=payload.numero_diarias,
        valor_diaria_cache=payload.valor_diaria_cache,
        valor_diaria_equipamentos=payload.valor_diaria_equipamentos,
        equipamentos_in=payload.equipamentos or [],
    )

    s.data_contratacao = payload.data_contratacao
    s.tipo_servico = payload.tipo_servico
    s.cliente_id = payload.cliente_id
    s.descricao = payload.descricao

    s.numero_diarias = payload.numero_diarias
    s.valor_diaria_cache = payload.valor_diaria_cache if payload.tipo_servico.lower() == "job" else 0.0
    s.valor_diaria_equipamentos = vd_equip_calc

    s.valor_desconto = payload.valor_desconto or 0.0
    s.valor_total = valor_total
    s.valor_final = max(valor_total - s.valor_desconto, 0.0)

    s.data_previsao_pagamento = payload.data_previsao_pagamento or _default_previsao_pagamento(payload.data_contratacao)

    s.is_pacote = payload.is_pacote  # 👈 mantém a flag
    
    # Se o cliente enviou a lista de equipamentos, substituímos os existentes
    if payload.equipamentos is not None:
        db.query(ServicoEquipamento).filter(ServicoEquipamento.servico_id == s.id).delete()
        for it in itens:
            it.servico_id = s.id
            db.add(it)

    # Recalcular pendente/status com base nos pagamentos existentes
    _recalcular_pendente_e_status(db, s)

    db.commit()
    db.refresh(s)
    return s

# ---------- DELETAR ----------
@router.delete("/{servico_id}")
def deletar_servico(servico_id: int, db: Session = Depends(get_db)):
    s = db.query(Servico).filter(Servico.id == servico_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    db.delete(s)
    db.commit()
    return {"ok": True}

# ---------- LISTAR / PERÍODO ----------
@router.get("/periodo")
def listar_servicos_periodo(
    db: Session = Depends(get_db),
    data_inicio: datetime.date | None = Query(None),
    data_fim: datetime.date | None = Query(None),
    ano: int | None = Query(None),
    mes: int | None = Query(None)
):
    query = db.query(Servico)
    if data_inicio and data_fim:
        query = query.filter(Servico.data_contratacao.between(data_inicio, data_fim))
    elif ano and mes:
        query = query.filter(func.strftime("%Y", Servico.data_contratacao) == str(ano))
        query = query.filter(func.strftime("%m", Servico.data_contratacao) == f"{mes:02d}")
    elif ano:
        query = query.filter(func.strftime("%Y", Servico.data_contratacao) == str(ano))

    servicos = query.all()
    resultado = []
    for s in servicos:
        soma_pag = db.query(func.sum(Pagamento.valor_pago)).filter(Pagamento.servico_id == s.id).scalar() or 0.0
        soma_custos = db.query(func.sum(Custo.valor)).filter(Custo.servico_id == s.id).scalar() or 0.0
        cliente = db.query(Cliente).filter(Cliente.id == s.cliente_id).first()
        valor_a_receber = max((s.valor_final or 0.0) - soma_pag, 0.0)
        lucro_liquido = (s.valor_final or 0.0) - soma_custos

        resultado.append({
            "id": s.id,
            "data_contratacao": s.data_contratacao,
            "tipo_servico": s.tipo_servico,
            "cliente_id": s.cliente_id,
            "cliente_nome": cliente.nome if cliente else None,
            "descricao": s.descricao,

            "numero_diarias": s.numero_diarias,
            "valor_diaria_cache": s.valor_diaria_cache,
            "valor_diaria_equipamentos": s.valor_diaria_equipamentos,

            "valor_total": s.valor_total,
            "valor_desconto": s.valor_desconto,
            "valor_final": s.valor_final,

            "data_previsao_pagamento": s.data_previsao_pagamento,
            "status": s.status,
            "valor_a_receber": valor_a_receber,
            "lucro_liquido": lucro_liquido
        })
    return resultado

# ---------- COMBO ----------
@router.get("/combo")
def listar_servicos_combo(
    pendentes: bool = False, db: Session = Depends(get_db)
):
    """
    Retorna uma lista simplificada de serviços para uso em combos.
    Se pendentes=True, retorna apenas os serviços com saldo pendente > 0.
    """

    servicos = (
        db.query(
            Servico.id,
            Servico.descricao,
            Cliente.nome.label("cliente_nome"),
            Servico.valor_final,
        )
        .join(Cliente, Cliente.id == Servico.cliente_id)
        .order_by(Cliente.nome, Servico.descricao)
        .all()
    )

    saida = []
    for s in servicos:
        soma_pag = (
            db.query(func.sum(Pagamento.valor_pago))
            .filter(Pagamento.servico_id == s.id)
            .scalar()
            or 0.0
        )

        saldo_pendente = max((s.valor_final or 0.0) - soma_pag, 0.0)
        if pendentes and saldo_pendente <= 0:
            continue  # ignora serviços totalmente pagos

        saida.append(
            {
                "id": s.id,
                "descricao": s.descricao,
                "cliente_nome": s.cliente_nome,
                "valor_final": s.valor_final,
                "valor_pago_total": soma_pag,
                "valor_pendente": saldo_pendente,
            }
        )

    return saida


# ---------- Equipamentos de um serviço (opcional, útil p/ modal) ----------
@router.get("/{servico_id}/equipamentos", response_model=list[dict])
def listar_itens_servico(servico_id: int, db: Session = Depends(get_db)):
    s = db.query(Servico).filter(Servico.id == servico_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    itens = db.query(ServicoEquipamento).filter(ServicoEquipamento.servico_id == s.id).all()
    out = []
    for it in itens:
        out.append({
            "id": it.id,
            "equipamento_id": it.equipamento_id,
            "nome_equipamento": it.equipamento.nome if it.equipamento else None,
            "quantidade": it.quantidade,
            "valor_unit_diaria": it.valor_unit_diaria,
            "subtotal_diaria": it.subtotal_diaria,
        })
    return out



@router.get("/{servico_id}", response_model=dict)
def obter_servico(servico_id: int, db: Session = Depends(get_db)):
    """
    Retorna um serviço completo, incluindo equipamentos vinculados.
    """
    s = (
        db.query(Servico)
        .options(joinedload(Servico.servico_equipamentos).joinedload(ServicoEquipamento.equipamento))
        .filter(Servico.id == servico_id)
        .first()
    )

    if not s:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")

    # Monta lista de equipamentos vinculados
    equipamentos = [
        {
            "equipamento_id": se.equipamento_id,
            "nome": se.equipamento.nome if se.equipamento else None,
            "quantidade": se.quantidade,
            "valor_diaria": se.valor_unit_diaria,
            "subtotal": se.subtotal_diaria,
        }
        for se in (s.servico_equipamentos or [])
    ]

    return {
        "id": s.id,
        "data_contratacao": s.data_contratacao,
        "tipo_servico": s.tipo_servico,
        "cliente_id": s.cliente_id,
        "descricao": s.descricao,
        "numero_diarias": s.numero_diarias,
        "valor_diaria_cache": s.valor_diaria_cache,
        "valor_diaria_equipamentos": s.valor_diaria_equipamentos,
        "valor_total": s.valor_total,
        "valor_desconto": s.valor_desconto,
        "valor_final": s.valor_final,
        "data_previsao_pagamento": s.data_previsao_pagamento,
        "status": s.status,
        "equipamentos": equipamentos,
        "is_pacote": s.is_pacote,
    }
