"""
Roteamento do módulo de Rotas via Google Routes API.

- /rotas/matriz:  tempo e distância de carro entre cada par origem → destino
                  (arestas do grafo dirigido; respeita a mão de direção das ruas)
- /rotas/trajeto: trajeto passando pelos pontos na ordem dada, para desenhar no mapa

Sempre o caminho mais rápido sem considerar trânsito (TRAFFIC_UNAWARE).
A chave fica apenas no servidor (GOOGLE_MAPS_API_KEY no .env) e nunca chega ao
navegador.
"""
import os
from typing import List, Optional

import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..core.security import get_current_user_id

router = APIRouter(prefix="/rotas", tags=["rotas"])

MATRIZ_URL = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix"
TRAJETO_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
MAX_ELEMENTOS_MATRIZ = 625  # limite do Google para TRAFFIC_UNAWARE
MAX_PARADAS_INTERMEDIARIAS = 25

Coordenada = List[float]  # [lat, lon]


class MatrizIn(BaseModel):
    origens: List[Coordenada] = Field(..., min_length=1)
    destinos: List[Coordenada] = Field(..., min_length=1)


class TrajetoIn(BaseModel):
    pontos: List[Coordenada] = Field(..., min_length=2)


def _waypoint(c: Coordenada) -> dict:
    return {"location": {"latLng": {"latitude": c[0], "longitude": c[1]}}}


def _segundos(duracao: Optional[str]) -> float:
    # a API devolve durações como "123s"; campos zerados são omitidos
    return float((duracao or "0s").rstrip("s"))


def _chamar_google(url: str, corpo: dict, campos: str):
    chave = (os.getenv("GOOGLE_MAPS_API_KEY") or "").strip()
    if not chave or chave.startswith("COLE_AQUI"):  # placeholder do CONFIGURAR_GOOGLE_MAPS.bat
        raise HTTPException(status_code=503, detail="GOOGLE_MAPS_API_KEY não configurada no servidor.")
    try:
        res = requests.post(
            url,
            json=corpo,
            headers={"X-Goog-Api-Key": chave, "X-Goog-FieldMask": campos},
            timeout=20,
        )
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="Google Routes indisponível.")
    data = res.json() if res.content else {}
    if not res.ok:
        erro = data[0].get("error", {}) if isinstance(data, list) and data else data.get("error", {})
        raise HTTPException(
            status_code=502,
            detail=f"Google Routes recusou a consulta: {erro.get('message') or f'HTTP {res.status_code}'}",
        )
    return data


@router.post("/matriz")
def matriz(corpo: MatrizIn, current_user_id: int = Depends(get_current_user_id)):
    """Matriz [i][j] com {duracao (s), distancia (m)} ou null quando não há caminho."""
    if len(corpo.origens) * len(corpo.destinos) > MAX_ELEMENTOS_MATRIZ:
        raise HTTPException(status_code=400, detail="Endereços demais para uma consulta.")
    elementos = _chamar_google(
        MATRIZ_URL,
        {
            "origins": [{"waypoint": _waypoint(c)} for c in corpo.origens],
            "destinations": [{"waypoint": _waypoint(c)} for c in corpo.destinos],
            "travelMode": "DRIVE",
            "routingPreference": "TRAFFIC_UNAWARE",
        },
        "originIndex,destinationIndex,duration,distanceMeters,condition,status",
    )
    resultado = [[None] * len(corpo.destinos) for _ in corpo.origens]
    for e in elementos:
        if e.get("condition") != "ROUTE_EXISTS":
            continue  # sem caminho respeitando o sentido das vias → aresta inexistente
        i, j = e.get("originIndex", 0), e.get("destinationIndex", 0)
        resultado[i][j] = {"duracao": _segundos(e.get("duration")), "distancia": e.get("distanceMeters", 0)}
    return resultado


@router.post("/trajeto")
def trajeto(corpo: TrajetoIn, current_user_id: int = Depends(get_current_user_id)):
    """Trajeto na ordem dada: polyline codificada (precisão 5) e duração/distância por trecho."""
    if len(corpo.pontos) - 2 > MAX_PARADAS_INTERMEDIARIAS:
        raise HTTPException(status_code=400, detail="Endereços demais para um trajeto.")
    data = _chamar_google(
        TRAJETO_URL,
        {
            "origin": _waypoint(corpo.pontos[0]),
            "destination": _waypoint(corpo.pontos[-1]),
            "intermediates": [_waypoint(c) for c in corpo.pontos[1:-1]],
            "travelMode": "DRIVE",
            "routingPreference": "TRAFFIC_UNAWARE",
            "polylineQuality": "HIGH_QUALITY",
            "languageCode": "pt-BR",
        },
        "routes.legs.duration,routes.legs.distanceMeters,routes.polyline.encodedPolyline",
    )
    rotas = data.get("routes") or []
    if not rotas:
        raise HTTPException(status_code=422, detail="Não existe trajeto de carro passando por esses endereços nessa ordem.")
    rota = rotas[0]
    return {
        "polyline": rota.get("polyline", {}).get("encodedPolyline", ""),
        "trechos": [
            {"duracao": _segundos(l.get("duration")), "distancia": l.get("distanceMeters", 0)}
            for l in rota.get("legs", [])
        ],
    }
