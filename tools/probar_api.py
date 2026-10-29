"""Prueba de humo de la API REST (solo libreria estandar).
Uso: python tools/probar_api.py https://oracleapex.com/ords/TU_ALIAS/bayer/
Verifica que cada endpoint GET responda JSON. No prueba CORS (eso solo lo valida el navegador)."""
import json, sys, urllib.request

RUTAS = ["productos", "clientes", "bodegas", "lotes", "inventario", "vencimientos", "conciliacion", "resumen_ordenes",
         "ventas", "top_productos", "calidad", "trazabilidad", "ordenes", "detalle_ordenes", "despachos"]
base = (sys.argv[1] if len(sys.argv) > 1 else "https://oracleapex.com/ords/universityproject24/bayer/").rstrip("/") + "/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json",
}
fallos = 0
for r in RUTAS:
    try:
        req = urllib.request.Request(f"{base}{r}?limit=1", headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as x:
            raw = x.read().decode("utf-8", errors="replace").strip()
            if raw.startswith("<"):
                fallos += 1
                print("AVISO", r, "-> Oracle APEX devolvio pagina HTML de mantenimiento temporal (fw_error_www)")
            else:
                print("OK   ", r, "->", len(json.loads(raw).get("items", [])), "fila(s)")
    except Exception as e:
        fallos += 1
        print("FALLA", r, "->", e)
sys.exit(1 if fallos else 0)
