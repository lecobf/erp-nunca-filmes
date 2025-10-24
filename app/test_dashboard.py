import requests

BASE_URL = "https://erp-nunca-filmes.onrender.com"

# Teste 1 — Endpoint de período
r1 = requests.get(f"{BASE_URL}/dashboard/periodo", params={"ano": 2025})
print("=== /dashboard/periodo ===")
print("Status:", r1.status_code)
print("Resposta:", r1.text)
print()

# Teste 2 — Endpoint de top clientes
r2 = requests.get(f"{BASE_URL}/dashboard/top-clientes-pagamentos", params={"ano": 2025})
print("=== /dashboard/top-clientes-pagamentos ===")
print("Status:", r2.status_code)
print("Resposta:", r2.text)
print()

# Opcional: verificar CORS
print("=== Cabeçalhos de resposta ===")
print(r2.headers)
