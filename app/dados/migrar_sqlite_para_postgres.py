# migrar_sqlite_para_postgres.py
# -*- coding: utf-8 -*-

import argparse
import sqlite3
import re
from datetime import datetime, date
from typing import Dict, List, Tuple, Optional, Any
import psycopg2
from psycopg2.extras import execute_batch

# -----------------------------
# Util: Mapeamento de tipos
# -----------------------------
def map_sqlite_type(declared: str) -> Tuple[str, str]:
    """
    Mapeia o tipo declarado do SQLite para um tipo equivalente no Postgres.
    Retorna (pg_type, kind) onde kind ∈ {"int","real","text","numeric","bool","date","timestamp","other"}.
    """
    t = (declared or "").strip().upper()

    # Normaliza palavras-chave mais comuns
    if "BOOL" in t:
        return ("BOOLEAN", "bool")

    if "DATE" in t and "TIME" not in t:
        return ("DATE", "date")

    if "DATETIME" in t or "TIMESTAMP" in t or ("DATE" in t and "TIME" in t):
        return ("TIMESTAMP", "timestamp")

    if "INT" in t:
        return ("INTEGER", "int")

    if "REAL" in t or "DOUBLE" in t or "FLOAT" in t:
        return ("DOUBLE PRECISION", "real")

    if "NUMERIC" in t or "DECIMAL" in t:
        # genérico o suficiente para valores monetários e numéricos
        return ("DOUBLE PRECISION", "numeric")

    # TEXT, CHAR, CLOB etc.
    return ("TEXT", "text")


# -----------------------------
# Util: Defaults e parsing de valores
# -----------------------------
_BOOL_TRUE = {"1", "TRUE", "T", "YES", "Y", "ON"}
_BOOL_FALSE = {"0", "FALSE", "F", "NO", "N", "OFF"}

def normalize_default_for_pg(pg_type: str, default_value: Optional[str]) -> Optional[str]:
    """Transforma default do SQLite em expressão válida para Postgres."""
    if default_value is None:
        return None

    dv = default_value.strip()

    # Remove aspas externas simples ou duplas se envolverem tudo
    if (dv.startswith("'") and dv.endswith("'")) or (dv.startswith('"') and dv.endswith('"')):
        dv_un = dv[1:-1]
    else:
        dv_un = dv

    if pg_type == "BOOLEAN":
        upper = dv_un.strip().upper()
        if upper in _BOOL_TRUE:
            return "TRUE"
        if upper in _BOOL_FALSE:
            return "FALSE"
        # Se veio número cru
        if upper.isdigit():
            return "TRUE" if upper != "0" else "FALSE"
        return None

    # CURRENT_TIMESTAMP / CURRENT_DATE etc.
    if dv_un.upper() in ("CURRENT_TIMESTAMP", "CURRENT_DATE", "CURRENT_TIME", "NOW()"):
        return dv_un.upper()

    # Números
    if pg_type in ("INTEGER", "DOUBLE PRECISION"):
        # tenta número “puro”
        num = dv_un.replace(",", ".")
        if re.fullmatch(r"[-+]?\d+(\.\d+)?", num):
            return num
        return None

    # TEXT / DATE / TIMESTAMP defaults como literais de string
    # Para DATE/TIMESTAMP é mais seguro não injetar default textual genérico
    if pg_type in ("DATE", "TIMESTAMP"):
        return None

    # TEXT
    # Escapa aspas simples
    esc = dv_un.replace("'", "''")
    return f"'{esc}'"


def parse_date_value(val: Any) -> Optional[date]:
    """Converte para date, se possível."""
    if val is None:
        return None
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        return val.date()
    s = str(val).strip()
    if not s:
        return None
    # formatos comuns
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    # tenta parse ISO com tempo
    try:
        return datetime.fromisoformat(s).date()
    except Exception:
        return None


def parse_timestamp_value(val: Any) -> Optional[datetime]:
    """Converte para datetime, se possível."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    if isinstance(val, date):
        # promove para datetime meia-noite
        return datetime(val.year, val.month, val.day)
    s = str(val).strip()
    if not s:
        return None
    # ISO e comuns
    for fmt in (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%Y/%m/%d %H:%M:%S",
        "%Y/%m/%d %H:%M",
    ):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            pass
    try:
        return datetime.fromisoformat(s)
    except Exception:
        return None


def coerce_value(val: Any, kind: str):
    """Converte o valor Python para o tipo esperado antes do INSERT."""
    if val is None:
        return None

    if kind == "bool":
        if isinstance(val, bool):
            return val
        s = str(val).strip().upper()
        if s in _BOOL_TRUE:
            return True
        if s in _BOOL_FALSE:
            return False
        if s.isdigit():
            return s != "0"
        return None

    if kind == "date":
        return parse_date_value(val)

    if kind == "timestamp":
        return parse_timestamp_value(val)

    if kind in ("int", "real", "numeric"):
        s = str(val).strip()
        # sqlite pode ter vindo como texto numérico
        s = s.replace(",", ".")
        try:
            if kind == "int":
                return int(float(s))
            return float(s)
        except Exception:
            return None

    if kind == "text":
        return str(val)

    return val


# -----------------------------
# SQLite introspection
# -----------------------------
def get_sqlite_tables(conn: sqlite3.Connection) -> List[str]:
    cur = conn.cursor()
    cur.execute("""
        SELECT name
        FROM sqlite_master
        WHERE type='table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name;
    """)
    return [r[0] for r in cur.fetchall()]


def get_sqlite_table_info(conn: sqlite3.Connection, table: str) -> List[Dict[str, Any]]:
    cur = conn.cursor()
    cur.execute(f'PRAGMA table_info("{table}")')
    cols = []
    for cid, name, decl_type, notnull, dflt_value, pk in cur.fetchall():
        cols.append({
            "cid": cid,
            "name": name,
            "type": decl_type,
            "notnull": bool(notnull),
            "default": dflt_value,
            "pk": pk,  # 0 = não PK, >0 = ordem no PK composto
        })
    return cols


def get_sqlite_foreign_keys(conn: sqlite3.Connection, table: str) -> List[Dict[str, Any]]:
    cur = conn.cursor()
    cur.execute(f'PRAGMA foreign_key_list("{table}")')
    fks = []
    for row in cur.fetchall():
        # PRAGMA foreign_key_list: (id, seq, table, from, to, on_update, on_delete, match)
        fks.append({
            "table": row[2],  # tabela referenciada
            "from": row[3],   # coluna local
            "to": row[4],     # coluna remota
            "on_update": row[5],
            "on_delete": row[6],
            "match": row[7],
        })
    return fks


# -----------------------------
# Geração de CREATE TABLE (sem FK)
# -----------------------------
def build_create_table_sql(schema: str, table: str, cols: List[Dict[str, Any]]) -> Tuple[str, Dict[str, str]]:
    """
    Cria SQL de CREATE TABLE (sem foreign keys).
    Retorna (sql, kinds_by_col) onde kinds_by_col ajuda nos coerces na inserção.
    """
    col_defs = []
    kinds = {}

    # Identifica PK composto (ordem pelo pk > 0)
    pk_cols = [c for c in cols if c["pk"] > 0]
    pk_cols_sorted = sorted(pk_cols, key=lambda x: x["pk"])
    pk_composto = [f'"{c["name"]}"' for c in pk_cols_sorted] if len(pk_cols) > 1 else []

    for c in cols:
        pg_type, kind = map_sqlite_type(c["type"])
        kinds[c["name"]] = kind

        line = f'"{c["name"]}" {pg_type}'
        if c["notnull"]:
            line += " NOT NULL"

        # Default
        dflt = normalize_default_for_pg(pg_type, c["default"])
        if dflt is not None:
            line += f" DEFAULT {dflt}"

        # PK somente se for PK simples (não composto)
        if c["pk"] > 0 and not pk_composto:
            line += " PRIMARY KEY"

        col_defs.append(line)

    constraints = []
    if pk_composto:
        constraints.append(f"PRIMARY KEY ({', '.join(pk_composto)})")

    full = f'CREATE TABLE IF NOT EXISTS {schema}."{table}" ({", ".join(col_defs + constraints)});'
    return full, kinds


# -----------------------------
# Dependências e ordenação
# -----------------------------
def compute_dependency_order(tables: List[str], fk_map: Dict[str, List[Dict[str, Any]]]) -> Tuple[List[str], List[Tuple[str, Dict[str, Any]]]]:
    """
    Retorna (ordem_criacao, fks_deferidas)
    - ordem_criacao: lista de tabelas em ordem segura (sem ciclos)
    - fks_deferidas: pares (table, fk_dict) de FKs que serão criadas depois via ALTER TABLE
    """
    # Grafo: table -> set(referenced_tables)
    dep: Dict[str, set] = {t: set() for t in tables}
    for t in tables:
        for fk in fk_map.get(t, []):
            dep[t].add(fk["table"])

    # Kahn's algorithm
    incoming = {t: 0 for t in tables}
    for t in tables:
        for r in dep[t]:
            if r in incoming:
                incoming[r] += 1

    queue = [t for t in tables if incoming[t] == 0]
    order = []
    while queue:
        n = queue.pop(0)
        order.append(n)
        for r in dep[n]:
            incoming[r] -= 1
            if incoming[r] == 0:
                queue.append(r)

    # Se faltou algo, há ciclo: vamos criar na ordem encontrada (para garantir) e deferir TODAS as FKs
    if len(order) != len(tables):
        # fallback: nenhuma ordenação segura, cria tudo e aplica FKs depois
        order = tables[:]
        deferred = []
        for t in tables:
            for fk in fk_map.get(t, []):
                deferred.append((t, fk))
        return order, deferred

    # Sem ciclo: só FKs cujas tabelas de destino ainda não existiam no momento da criação (raro aqui)
    # Mas por segurança: se alvo vier depois na ordem, defere essa FK
    pos = {t: i for i, t in enumerate(order)}
    deferred = []
    for t in order:
        for fk in fk_map.get(t, []):
            if pos[fk["table"]] > pos[t]:
                deferred.append((t, fk))

    return order, deferred


def build_add_fk_sql(schema: str, table: str, fk: Dict[str, Any], idx: int) -> str:
    """
    Gera ALTER TABLE para adicionar uma FK.
    """
    on_update = fk.get("on_update") or "NO ACTION"
    on_delete = fk.get("on_delete") or "NO ACTION"
    fk_name = f'{table}_fk_{idx}'

    return (
        f'ALTER TABLE {schema}."{table}" '
        f'ADD CONSTRAINT "{fk_name}" FOREIGN KEY ("{fk["from"]}") '
        f'REFERENCES {schema}."{fk["table"]}" ("{fk["to"]}") '
        f'ON UPDATE {on_update} ON DELETE {on_delete};'
    )


# -----------------------------
# Migração de dados
# -----------------------------
def fetch_sqlite_rows(conn: sqlite3.Connection, table: str, col_names: List[str], offset: int, limit: int):
    cur = conn.cursor()
    quoted_cols = ", ".join([f'"{c}"' for c in col_names])
    cur.execute(f'SELECT {quoted_cols} FROM "{table}" LIMIT {limit} OFFSET {offset}')
    return cur.fetchall()

def insert_pg_batch(cur, schema: str, table: str, col_names: List[str], kinds: Dict[str, str], rows: List[Tuple[Any, ...]]):
    placeholders = ", ".join(["%s"] * len(col_names))
    cols_sql = ", ".join([f'"{c}"' for c in col_names])
    sql = f'INSERT INTO {schema}."{table}" ({cols_sql}) VALUES ({placeholders});'

    # Coerce por linha
    coerced_rows = []
    for r in rows:
        coerced = []
        for c, val in zip(col_names, r):
            coerced.append(coerce_value(val, kinds.get(c, "other")))
        coerced_rows.append(tuple(coerced))

    execute_batch(cur, sql, coerced_rows, page_size=1000)


# -----------------------------
# Main
# -----------------------------
def migrate(sqlite_path: str, pg_dsn: str, schema: str, reset: bool, chunk: int = 2000):
    # SQLite
    sconn = sqlite3.connect(sqlite_path)
    sconn.row_factory = sqlite3.Row

    tables = get_sqlite_tables(sconn)

    # Coleta metadata
    table_cols: Dict[str, List[Dict[str, Any]]] = {t: get_sqlite_table_info(sconn, t) for t in tables}
    table_fks: Dict[str, List[Dict[str, Any]]] = {t: get_sqlite_foreign_keys(sconn, t) for t in tables}

    # Ordenação por dependência e FKs deferidas
    order, deferred_fks = compute_dependency_order(tables, table_fks)

    # Postgres
    with psycopg2.connect(pg_dsn) as pgconn:
        pgconn.autocommit = True
        cur = pgconn.cursor()

        # Schema
        if reset:
            print(f"[INFO] Resetando schema {schema} no Postgres...")
            cur.execute(f'DROP SCHEMA IF EXISTS {schema} CASCADE;')
        cur.execute(f'CREATE SCHEMA IF NOT EXISTS {schema};')
        # Definir search_path para o schema alvo
        cur.execute(f"SET search_path TO {schema};")

        # Cria tabelas SEM FKs
        create_kinds_by_table: Dict[str, Dict[str, str]] = {}
        for t in order:
            print(f"\n[MIGRANDO TABELA] {t}")
            create_sql, kinds = build_create_table_sql(schema, t, table_cols[t])
            create_kinds_by_table[t] = kinds
            print(f"[SQL] {create_sql}")
            cur.execute(create_sql)

            # Migra dados em lotes
            col_names = [c["name"] for c in table_cols[t]]
            # Conta linhas
            sc = sconn.cursor()
            sc.execute(f'SELECT COUNT(*) FROM "{t}"')
            total = sc.fetchone()[0]
            if total == 0:
                print(f"[INFO] Tabela {t} sem registros.")
                continue

            print(f"[INFO] Inserindo {total} registros na tabela {t}...")
            offset = 0
            while offset < total:
                rows = fetch_sqlite_rows(sconn, t, col_names, offset, min(chunk, total - offset))
                insert_pg_batch(cur, schema, t, col_names, kinds, rows)
                offset += len(rows)

            print(f"[OK] {t} migrada com sucesso!")

        # Aplica FKs (todas as não criadas)
        if deferred_fks:
            print("\n[INFO] Aplicando Foreign Keys pendentes...")
            idx = 1
            for t, fk in deferred_fks:
                try:
                    alter = build_add_fk_sql(schema, t, fk, idx)
                    cur.execute(alter)
                    print(f"[FK-OK] {t}: {fk['from']} -> {fk['table']}.{fk['to']}")
                    idx += 1
                except Exception as e:
                    print(f"[FK-ERRO] {t}: {fk['from']} -> {fk['table']}.{fk['to']} :: {e}")

        print("\n[SUCESSO] Migração concluída.")

    sconn.close()


def main():
    ap = argparse.ArgumentParser(description="Migrar um SQLite para Postgres com FKs e ordenação por dependências.")
    ap.add_argument("--sqlite", required=True, help="Caminho do arquivo SQLite (por ex.: ./nunca.db)")
    ap.add_argument("--pg", required=True, help='DSN do Postgres (ex.: "postgresql://user:pass@host/db?sslmode=require")')
    ap.add_argument("--schema", default="public", help="Schema de destino no Postgres (default: public)")
    ap.add_argument("--reset", action="store_true", help="Derruba e recria o schema de destino")
    ap.add_argument("--chunk", type=int, default=2000, help="Tamanho do lote de INSERT (default: 2000)")
    args = ap.parse_args()

    migrate(args.sqlite, args.pg, args.schema, args.reset, args.chunk)


if __name__ == "__main__":
    main()
