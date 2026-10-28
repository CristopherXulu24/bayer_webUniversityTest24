// MODELO: unico punto de acceso a datos (API REST de Oracle APEX / ORDS).
import { API_BASE } from '../config.js';

async function json(resp, ruta) {
  if (!resp.ok) throw new Error(`HTTP ${resp.status} en /${ruta}`);
  return resp.json();
}

/** GET paginado: recorre todas las paginas de ORDS y devuelve un arreglo de filas. */
export async function get(ruta) {
  let filas = [], offset = 0;
  for (;;) {
    const sep = ruta.includes('?') ? '&' : '?';
    const j = await json(await fetch(`${API_BASE}${ruta}${sep}limit=500&offset=${offset}`), ruta);
    filas = filas.concat(j.items || []);
    if (!j.hasMore) return filas;
    offset += 500;
  }
}

async function post(ruta, datos) {
  const resp = await fetch(API_BASE + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
  return json(resp, ruta);
}

const LECTURAS = ['productos', 'clientes', 'bodegas', 'lotes', 'inventario', 'vencimientos', 'conciliacion', 'resumen_ordenes',
  'ventas', 'top_productos', 'calidad', 'trazabilidad', 'ordenes', 'detalle_ordenes', 'despachos'];

export const Modelo = Object.fromEntries(LECTURAS.map(r => [r, () => get(r)]));
Modelo.recall = lote => get('recall/' + encodeURIComponent(lote));
Modelo.guardar = post; // altas, ediciones, checkout y bloqueo de lote
