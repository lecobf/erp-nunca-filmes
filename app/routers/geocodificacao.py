"""
Geocodificação de endereços para o módulo de Rotas via HERE Geocoding & Search.

A base de endereços do HERE tem os números das casas no Brasil muito mais
completos que o OpenStreetMap, e os termos do HERE permitem exibir os
resultados em mapas de terceiros (Leaflet/OpenStreetMap) desde que com
atribuição — ao contrário do Google Places, que proíbe uso com mapas que não
sejam do Google.

A chave fica apenas no servidor (variável HERE_API_KEY no .env) e nunca chega
ao navegador. Sem a variável configurada, /geocodificacao/status responde
here=false e o frontend usa o Photon (OpenStreetMap) como antes.
"""
import os
from typing import Optional

import requests
from fastapi import APIRouter, Depends, HTTPException, Query

from ..core.security import get_current_user_id

router = APIRouter(prefix="/geocodificacao", tags=["geocodificacao"])

AUTOSUGGEST_URL = "https://autosuggest.search.hereapi.com/v1/autosuggest"
CENTRO_PADRAO = (-30.0346, -51.2177)  # Porto Alegre; o HERE exige um ponto de referência


def _chave() -> Optional[str]:
    return os.getenv("HERE_API_KEY") or None


@router.get("/status")
def status_geocodificacao(current_user_id: int = Depends(get_current_user_id)):
    return {"here": _chave() is not None}


@router.get("/sugestoes")
def sugestoes(
    q: str = Query(..., min_length=3),
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    current_user_id: int = Depends(get_current_user_id),
):
    chave = _chave()
    if not chave:
        raise HTTPException(status_code=503, detail="Geocodificação HERE não configurada.")

    if lat is None or lon is None:
        lat, lon = CENTRO_PADRAO
    params = {
        "q": q,
        "at": f"{lat},{lon}",
        "in": "countryCode:BRA",
        "lang": "pt-BR",
        "limit": 8,
        "apiKey": chave,
    }
    try:
        res = requests.get(AUTOSUGGEST_URL, params=params, timeout=10)
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="Serviço de endereços HERE indisponível.")
    data = res.json() if res.content else {}
    if not res.ok:
        mensagem = data.get("title") or data.get("error_description") or f"HTTP {res.status_code}"
        raise HTTPException(status_code=502, detail=f"HERE recusou a consulta: {mensagem}")

    resultado = []
    for item in data.get("items", []):
        pos = item.get("position")
        if not pos:  # sugestões de categoria/rede ("farmácia") não têm posição
            continue
        resultado.append({
            "id": item.get("id"),
            "endereco": (item.get("address") or {}).get("label") or item.get("title", ""),
            "coords": [pos["lat"], pos["lng"]],
            # só a rua (sem o número) → posição aproximada, usuário ajusta no mapa
            "aproximado": item.get("resultType") == "street",
        })
    return resultado
