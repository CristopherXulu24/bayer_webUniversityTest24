"""Prueba de humo de la API REST (solo libreria estandar).
Uso: python tools/probar_api.py https://oracleapex.com/ords/TU_ALIAS/bayer/
Verifica que cada endpoint GET responda JSON. No prueba CORS (eso solo lo valida el navegador)."""
import json, sys, urllib.request

RUTAS = ["productos", "clientes", "bodegas", "lotes", "inventario", "vencimientos", "conciliacion", "resumen_ordenes",
         "ventas", "top_productos", "calidad", "trazabilidad", "ordenes", "detalle_ordenes", "despachos"]
base = sys.argv[1].rstrip("/") + "/"
fallos = 0
for r in RUTAS:
    try:
        with urllib.request.urlopen(f"{base}{r}?limit=1", timeout=30) as x:
            print("OK  ", r, "->", len(json.load(x).get("items", [])), "fila(s)")
    except Exception as e:
        fallos += 1
        print("FALLA", r, "->", e)
sys.exit(1 if fallos else 0)
