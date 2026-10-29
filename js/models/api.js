// MODELO: unico punto de acceso a datos (API REST de Oracle APEX / ORDS) con cache de 30s (como @st.cache_data(ttl=30) en Python).
import { API_BASE } from '../config.js';
import { leerRespaldo, escribirRespaldo } from './respaldo_sql.js';

const CACHE_TTL_MS = 30000;
const cache = new Map();
let modoRespaldo = false;
let notificarEstado = null;

function emitirEstado(modo, sub) {
  if (notificarEstado) notificarEstado({ modo, sub });
}

async function parseJson(resp, ruta) {
  const texto = await resp.text();
  if (!resp.ok) throw new Error(`HTTP ${resp.status} en /${ruta}`);
  const limpio = texto.trim();
  if (limpio.startsWith('<')) {
    throw new Error(`Oracle APEX devolvió HTML de mantenimiento en /${ruta}`);
  }
  return JSON.parse(limpio);
}

/** GET paginado con cache de 30s: recorre todas las paginas de ORDS y devuelve un arreglo de filas. */
export async function get(ruta) {
  const ahora = Date.now();
  const hit = cache.get(ruta);
  if (hit && ahora - hit.ts < CACHE_TTL_MS) {
    return hit.datos;
  }

  if (modoRespaldo) {
    const respaldo = leerRespaldo(ruta);
    cache.set(ruta, { ts: ahora, datos: respaldo });
    return respaldo;
  }

  try {
    let filas = [], offset = 0;
    for (;;) {
      const sep = ruta.includes('?') ? '&' : '?';
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 9000);
      let resp;
      try {
        resp = await fetch(`${API_BASE}${ruta}${sep}limit=500&offset=${offset}`, {
          headers: { 'Accept': 'application/json' },
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      const j = await parseJson(resp, ruta);
      filas = filas.concat(j.items || []);
      if (!j.hasMore) break;
      offset += 500;
    }
    cache.set(ruta, { ts: Date.now(), datos: filas });
    emitirEstado('oracle', 'Oracle APEX · ORDS activo');
    return filas;
  } catch (err) {
    console.warn(`Aviso ORDS en /${ruta}: ${err.message}. Activando respaldo SQL del proyecto.`);
    modoRespaldo = true;
    emitirEstado('respaldo', 'Respaldo SQL activo (APEX en pausa)');
    const respaldo = leerRespaldo(ruta);
    cache.set(ruta, { ts: Date.now(), datos: respaldo });
    return respaldo;
  }
}

async function post(ruta, datos) {
  if (!modoRespaldo) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      let resp;
      try {
        resp = await fetch(API_BASE + ruta, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(datos),
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      const res = await parseJson(resp, ruta);
      cache.clear();
      emitirEstado('oracle', 'Oracle APEX · ORDS activo');
      return res;
    } catch (err) {
      console.warn(`Aviso POST ORDS en /${ruta}: ${err.message}. Ejecutando en respaldo SQL.`);
      modoRespaldo = true;
      emitirEstado('respaldo', 'Respaldo SQL activo (APEX en pausa)');
    }
  }
  const res = escribirRespaldo(ruta, datos);
  cache.clear();
  return res;
}

const LECTURAS = [
  'productos', 'clientes', 'bodegas', 'lotes', 'inventario', 'vencimientos',
  'conciliacion', 'resumen_ordenes', 'ventas', 'top_productos', 'calidad',
  'trazabilidad', 'ordenes', 'detalle_ordenes', 'despachos',
];

export const Modelo = Object.fromEntries(LECTURAS.map(r => [r, () => get(r)]));
Modelo.recall = lote => get('recall/' + encodeURIComponent(lote));
Modelo.guardar = post;
Modelo.limpiarCache = (reintentarOracle = false) => {
  cache.clear();
  if (reintentarOracle) modoRespaldo = false;
};
Modelo.onEstado = fn => { notificarEstado = fn; };
