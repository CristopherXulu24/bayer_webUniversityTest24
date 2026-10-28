// CONTROLADOR frontal: enrutador por hash (#modulo) que invoca al controlador de cada modulo.
import resumen from './controllers/resumen.js';
import medicamentos from './controllers/medicamentos.js';
import clientes from './controllers/clientes.js';
import lotes from './controllers/lotes.js';
import inventario from './controllers/inventario.js';
import vencimientos from './controllers/vencimientos.js';
import trazabilidad from './controllers/trazabilidad.js';
import pedidos from './controllers/pedidos.js';
import finanzas from './controllers/finanzas.js';
import laboratorio from './controllers/laboratorio.js';
import { msg } from './views/ui.js';

const MODULOS = {
  resumen: ['Resumen', resumen], medicamentos: ['Medicamentos', medicamentos], clientes: ['Clientes y bodegas', clientes],
  lotes: ['Lotes y calidad', lotes], inventario: ['Inventario', inventario], vencimientos: ['Vencimientos', vencimientos],
  trazabilidad: ['Trazabilidad y recall', trazabilidad], pedidos: ['Pedidos B2B', pedidos], finanzas: ['Finanzas', finanzas], laboratorio: ['Laboratorio', laboratorio],
};
const nav = document.querySelector('#nav'), vista = document.querySelector('#view');
nav.innerHTML = Object.entries(MODULOS).map(([k, [t]]) => `<button data-t="${k}">${t}</button>`).join('');

async function mostrar(k) {
  if (!MODULOS[k]) k = 'resumen';
  nav.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === k));
  vista.innerHTML = '<p class="muted">Cargando…</p>';
  try { await MODULOS[k][1](vista, () => mostrar(k)); }
  catch (e) { vista.innerHTML = msg(`No se pudo consultar la API: ${e.message}. Revisa API_BASE en js/config.js, que el módulo REST esté publicado y el CORS (Origins Allowed).`, false); }
}
nav.onclick = e => { if (e.target.dataset.t) { location.hash = e.target.dataset.t; } };
window.onhashchange = () => mostrar(location.hash.slice(1));
mostrar(location.hash.slice(1));
