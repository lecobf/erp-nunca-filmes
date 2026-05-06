from datetime import date
import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, exists
from typing import Optional
from ..utils.deps import get_db
from ..models.servico import Servico
from ..models.servico_data import ServicoDatas
from ..models.pagamento import Pagamento
from ..models.custo import Custo
from ..models.cliente import Cliente
from ..models.equipamento import Equipamento
from ..models.servico_equipamento import ServicoEquipamento
from ..schemas.servico import ServicoCreate, ServicoOut, ServicoEquipamentoIn
from ..core.security import get_current_user_id

router = APIRouter(prefix="/servicos", tags=["servicos"])


# ---------- Helpers ----------
def _default_previsao_pagamento(data_contratacao: Optional[datetime.date]) -> datetime.date:
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
    itens_obj: list[ServicoEquipamento] = []
    valor_diaria_equipamentos_calc = float(valor_diaria_equipamentos or 0.0)

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

    t = (tipo_servico or "").lower()
    if t == "aluguel":
        valor_diaria_cache = 0.0
        if valor_diaria_equipamentos_calc <= 0.0:
            raise HTTPException(
                status_code=400,
                detail="Em Aluguel, valor_diaria_equipamentos deve ser > 0 (ou selecionar equipamentos).",
            )
    elif t == "job":
        pass
    else:
        raise HTTPException(status_code=400, detail="tipo_servico deve ser 'Job' ou 'Aluguel'.")

    valor_total = (float(valor_diaria_cache or 0.0) * numero_diarias) + (
        valor_diaria_equipamentos_calc * numero_diarias
    )
    return valor_diaria_equipamentos_calc, valor_total, itens_obj


def _recalcular_pendente_e_status(db: Session, servico: Servico) -> None:
    soma_pag = (
        db.query(func.sum(Pagamento.valor_pago))
        .filter(Pagamento.servico_id == servico.id)
        .scalar()
        or 0.0
    )
    servico.valor_pendente_atual = max((servico.valor_final or 0.0) - soma_pag, 0.0)
    servico.status = (
        "pago"
        if soma_pag >= (servico.valor_final or 0.0)
        else ("parcial" if soma_pag > 0 else "pendente")
    )


def _datas_de_servico(db: Session, servico_id: int) -> list[datetime.date]:
    rows = (
        db.query(ServicoDatas.data)
        .filter(ServicoDatas.servico_id == servico_id)
        .order_by(ServicoDatas.data)
        .all()
    )
    return [r.data for r in rows]


def _substituir_datas(db: Session, servico_id: int, datas: list[datetime.date]) -> None:
    db.query(ServicoDatas).filter(ServicoDatas.servico_id == servico_id).delete()
    for d in datas:
        db.add(ServicoDatas(servico_id=servico_id, data=d))


# ---------- LISTAR ----------
@router.get("", response_model=list[dict])
def listar_servicos(
    db: Session = Depends(get_db),
    status: str | None = Query(None),
    cliente_id: int | None = Query(None),
    tipo_servico: str | None = Query(None),
    ano: int | None = Query(None),
    mes: int | None = Query(None),
    current_user_id: int = Depends(get_current_user_id),
):
    query = db.query(Servico).filter(Servico.usuario_id == current_user_id)

    if status:
        query = query.filter(Servico.status == status)
    if cliente_id:
        query = query.filter(Servico.cliente_id == cliente_id)
    if tipo_servico:
        query = query.filter(Servico.tipo_servico == tipo_servico)
    if ano:
        query = query.filter(func.extract("year", Servico.data_contratacao) == ano)
    if mes:
        query = query.filter(func.extract("month", Servico.data_contratacao) == mes)

    servicos = query.order_by(Servico.data_contratacao.desc()).all()

    resultado = []
    for s in servicos:
        soma_pag = (
            db.query(func.sum(Pagamento.valor_pago))
            .filter(Pagamento.servico_id == s.id)
            .scalar()
            or 0.0
        )
        soma_custos = (
            db.query(func.sum(Custo.valor)).filter(Custo.servico_id == s.id).scalar() or 0.0
        )
        cliente = db.query(Cliente).filter(Cliente.id == s.cliente_id).first()
        valor_a_receber = max((s.valor_final or 0.0) - soma_pag, 0.0)
        lucro_liquido = (s.valor_final or 0.0) - soma_custos
        data_ultimo_pagamento = (
            db.query(func.max(Pagamento.data_pagamento))
            .filter(Pagamento.servico_id == s.id)
            .scalar()
        )
        datas = _datas_de_servico(db, s.id)

        resultado.append(
            {
                "id": s.id,
                "data_contratacao": s.data_contratacao,
                "tipo_servico": s.tipo_servico,
                "cliente_id": s.cliente_id,
                "cliente_nome": cliente.nome if cliente else None,
                "descricao": s.descricao,
                "datas": datas,
                "numero_diarias": len(datas),
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
                "data_ultimo_pagamento": data_ultimo_pagamento,
            }
        )
    return resultado


# ---------- CRIAR ----------
@router.post("", response_model=dict)
def criar_servico(
    payload: ServicoCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    datas = sorted(payload.datas or [])
    numero_diarias = max(len(datas), 1)
    data_contratacao = datas[0] if datas else datetime.date.today()

    data_prev = payload.data_previsao_pagamento or _default_previsao_pagamento(data_contratacao)
    vd_equip_calc, valor_total, itens = _aplicar_regras_e_calcular(
        db,
        payload.tipo_servico,
        numero_diarias,
        payload.valor_diaria_cache,
        payload.valor_diaria_equipamentos,
        payload.equipamentos or [],
    )
    valor_final = max(valor_total - (payload.valor_desconto or 0.0), 0.0)
    s = Servico(
        data_contratacao=data_contratacao,
        tipo_servico=payload.tipo_servico,
        cliente_id=payload.cliente_id,
        descricao=payload.descricao,
        valor_diaria_cache=payload.valor_diaria_cache if payload.tipo_servico.lower() == "job" else 0.0,
        valor_diaria_equipamentos=vd_equip_calc,
        valor_total=valor_total,
        valor_desconto=payload.valor_desconto or 0.0,
        valor_final=valor_final,
        data_previsao_pagamento=data_prev,
        status="pendente",
        is_pacote=payload.is_pacote,
        valor_pendente_atual=valor_final,
        usuario_id=current_user_id,
    )
    db.add(s)
    db.flush()

    for it in itens:
        it.servico_id = s.id
        db.add(it)

    for d in datas:
        db.add(ServicoDatas(servico_id=s.id, data=d))

    db.commit()
    db.refresh(s)

    return {
        "id": s.id,
        "data_contratacao": s.data_contratacao,
        "tipo_servico": s.tipo_servico,
        "cliente_id": s.cliente_id,
        "descricao": s.descricao,
        "datas": datas,
        "numero_diarias": len(datas),
        "valor_diaria_cache": s.valor_diaria_cache,
        "valor_diaria_equipamentos": s.valor_diaria_equipamentos,
        "valor_total": s.valor_total,
        "valor_desconto": s.valor_desconto,
        "valor_final": s.valor_final,
        "data_previsao_pagamento": s.data_previsao_pagamento,
        "status": s.status,
        "valor_pendente_atual": s.valor_pendente_atual,
        "is_pacote": s.is_pacote,
    }


# ---------- ATUALIZAR ----------
@router.put("/{servico_id}", response_model=dict)
def atualizar_servico(
    servico_id: int,
    payload: ServicoCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    s = db.query(Servico).filter(Servico.id == servico_id, Servico.usuario_id == current_user_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")

    datas = sorted(payload.datas or [])
    numero_diarias = max(len(datas), 1)
    data_contratacao = datas[0] if datas else s.data_contratacao

    vd_equip_calc, valor_total, itens = _aplicar_regras_e_calcular(
        db,
        payload.tipo_servico,
        numero_diarias,
        payload.valor_diaria_cache,
        payload.valor_diaria_equipamentos,
        payload.equipamentos or [],
    )
    s.data_contratacao = data_contratacao
    s.tipo_servico = payload.tipo_servico
    s.cliente_id = payload.cliente_id
    s.descricao = payload.descricao
    s.valor_diaria_cache = payload.valor_diaria_cache if payload.tipo_servico.lower() == "job" else 0.0
    s.valor_diaria_equipamentos = vd_equip_calc
    s.valor_desconto = payload.valor_desconto or 0.0
    s.valor_total = valor_total
    s.valor_final = max(valor_total - s.valor_desconto, 0.0)
    s.data_previsao_pagamento = payload.data_previsao_pagamento or _default_previsao_pagamento(data_contratacao)
    s.is_pacote = payload.is_pacote

    if payload.equipamentos is not None:
        db.query(ServicoEquipamento).filter(ServicoEquipamento.servico_id == s.id).delete()
        for it in itens:
            it.servico_id = s.id
            db.add(it)

    _substituir_datas(db, s.id, datas)
    _recalcular_pendente_e_status(db, s)
    db.commit()
    db.refresh(s)

    return {
        "id": s.id,
        "data_contratacao": s.data_contratacao,
        "tipo_servico": s.tipo_servico,
        "cliente_id": s.cliente_id,
        "descricao": s.descricao,
        "datas": datas,
        "numero_diarias": len(datas),
        "valor_diaria_cache": s.valor_diaria_cache,
        "valor_diaria_equipamentos": s.valor_diaria_equipamentos,
        "valor_total": s.valor_total,
        "valor_desconto": s.valor_desconto,
        "valor_final": s.valor_final,
        "data_previsao_pagamento": s.data_previsao_pagamento,
        "status": s.status,
        "valor_pendente_atual": s.valor_pendente_atual,
        "is_pacote": s.is_pacote,
    }


# ---------- DELETAR ----------
@router.delete("/{servico_id}")
def deletar_servico(
    servico_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    s = db.query(Servico).filter(Servico.id == servico_id, Servico.usuario_id == current_user_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    db.delete(s)
    db.commit()
    return {"ok": True}


# ---------- LISTAR / PERÍODO ----------
@router.get("/periodo")
def listar_servicos_periodo(
    db: Session = Depends(get_db),
    data_inicio: Optional[datetime.date] = Query(None),
    data_fim: Optional[datetime.date] = Query(None),
    ano: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    current_user_id: int = Depends(get_current_user_id),
):
    query = db.query(Servico).filter(Servico.usuario_id == current_user_id)
    if data_inicio and data_fim:
        query = query.filter(Servico.data_contratacao.between(data_inicio, data_fim))
    elif ano and mes:
        query = query.filter(func.extract("year", Servico.data_contratacao) == ano)
        query = query.filter(func.extract("month", Servico.data_contratacao) == mes)
    elif ano:
        query = query.filter(func.extract("year", Servico.data_contratacao) == ano)
    servicos = query.all()
    resultado = []
    for s in servicos:
        soma_pag = (
            db.query(func.sum(Pagamento.valor_pago))
            .filter(Pagamento.servico_id == s.id)
            .scalar()
            or 0.0
        )
        soma_custos = (
            db.query(func.sum(Custo.valor)).filter(Custo.servico_id == s.id).scalar() or 0.0
        )
        cliente = db.query(Cliente).filter(Cliente.id == s.cliente_id).first()
        valor_a_receber = max((s.valor_final or 0.0) - soma_pag, 0.0)
        lucro_liquido = (s.valor_final or 0.0) - soma_custos
        datas = _datas_de_servico(db, s.id)
        resultado.append(
            {
                "id": s.id,
                "data_contratacao": s.data_contratacao,
                "tipo_servico": s.tipo_servico,
                "cliente_id": s.cliente_id,
                "cliente_nome": cliente.nome if cliente else None,
                "descricao": s.descricao,
                "datas": datas,
                "numero_diarias": len(datas),
                "valor_diaria_cache": s.valor_diaria_cache,
                "valor_diaria_equipamentos": s.valor_diaria_equipamentos,
                "valor_total": s.valor_total,
                "valor_desconto": s.valor_desconto,
                "valor_final": s.valor_final,
                "data_previsao_pagamento": s.data_previsao_pagamento,
                "status": s.status,
                "valor_a_receber": valor_a_receber,
                "lucro_liquido": lucro_liquido,
            }
        )
    return resultado


# ---------- COMBO ----------
@router.get("/combo")
def listar_servicos_combo(
    pendentes: bool = False,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    servicos = (
        db.query(
            Servico.id,
            Servico.descricao,
            Cliente.nome.label("cliente_nome"),
            Servico.valor_final,
        )
        .join(Cliente, Cliente.id == Servico.cliente_id)
        .filter(Servico.usuario_id == current_user_id)
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
            continue
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


# ---------- EQUIPAMENTOS DE UM SERVIÇO ----------
@router.get("/{servico_id}/equipamentos", response_model=list[dict])
def listar_itens_servico(
    servico_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    s = db.query(Servico).filter(Servico.id == servico_id, Servico.usuario_id == current_user_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    itens = db.query(ServicoEquipamento).filter(ServicoEquipamento.servico_id == s.id).all()
    return [
        {
            "id": it.id,
            "equipamento_id": it.equipamento_id,
            "nome_equipamento": it.equipamento.nome if it.equipamento else None,
            "quantidade": it.quantidade,
            "valor_unit_diaria": it.valor_unit_diaria,
            "subtotal_diaria": it.subtotal_diaria,
        }
        for it in itens
    ]


# ---------- CALENDÁRIO ----------
@router.get("/calendario")
def listar_servicos_calendario(
    inicio: date = Query(...),
    fim: date = Query(...),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    """Retorna serviços que possuem ao menos uma data dentro do intervalo informado."""
    servicos = (
        db.query(Servico)
        .filter(
            Servico.usuario_id == current_user_id,
            exists().where(
                ServicoDatas.servico_id == Servico.id,
                ServicoDatas.data >= inicio,
                ServicoDatas.data <= fim,
            ),
        )
        .all()
    )

    resultado = []
    for s in servicos:
        cliente = db.query(Cliente).filter(Cliente.id == s.cliente_id).first()
        # Retorna apenas as datas dentro do intervalo exibido
        datas_no_periodo = (
            db.query(ServicoDatas.data)
            .filter(
                ServicoDatas.servico_id == s.id,
                ServicoDatas.data >= inicio,
                ServicoDatas.data <= fim,
            )
            .order_by(ServicoDatas.data)
            .all()
        )
        resultado.append(
            {
                "id": s.id,
                "data_contratacao": s.data_contratacao,
                "tipo_servico": s.tipo_servico,
                "descricao": s.descricao,
                "datas": [r.data for r in datas_no_periodo],
                "numero_diarias": len(datas_no_periodo),
                "cliente_id": s.cliente_id,
                "cliente_nome": cliente.nome if cliente else None,
            }
        )
    return resultado


# ---------- DETALHE ----------
@router.get("/{servico_id}", response_model=dict)
def obter_servico(
    servico_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    s = (
        db.query(Servico)
        .options(joinedload(Servico.servico_equipamentos).joinedload(ServicoEquipamento.equipamento))
        .filter(Servico.id == servico_id, Servico.usuario_id == current_user_id)
        .first()
    )
    if not s:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
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
    datas = _datas_de_servico(db, s.id)
    return {
        "id": s.id,
        "data_contratacao": s.data_contratacao,
        "tipo_servico": s.tipo_servico,
        "cliente_id": s.cliente_id,
        "descricao": s.descricao,
        "datas": datas,
        "numero_diarias": len(datas),
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
