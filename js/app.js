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
import { Modelo } from './models/api.js';
import { icon, msg, toast } from './views/ui.js';

// Los 7 módulos principales en el mismo orden que la app Python + 3 módulos complementarios del proyecto
const MODULOS = {
  resumen:      ['Resumen', resumen, icon('grid')],
  medicamentos: ['Medicamentos', medicamentos, icon('pill')],
  clientes:     ['Clientes y bodegas', clientes, icon('building')],
  lotes:        ['Lotes y calidad', lotes, icon('flask')],
  inventario:   ['Inventario', inventario, icon('box')],
  trazabilidad: ['Trazabilidad y recall', trazabilidad, icon('search')],
  pedidos:      ['Pedidos B2B', pedidos, icon('cart')],
  vencimientos: ['Vencimientos FEFO', vencimientos, icon('clock'), 'Analítica y Laboratorio'],
  finanzas:     ['Finanzas y crédito', finanzas, icon('card')],
  laboratorio:  ['Laboratorio ACID', laboratorio, icon('activity')],
};

const nav = document.querySelector('#nav');
const vista = document.querySelector('#view');
const sidebar = document.querySelector('#sidebar');
const backdrop = document.querySelector('#sidebar-backdrop');
const connDot = document.querySelector('#conn-dot');
const connTitle = document.querySelector('#conn-title');
const connSub = document.querySelector('#conn-sub');
const darkToggle = document.querySelector('#dark-mode-toggle');

const toggleSidebar = abrir => {
  sidebar?.classList.toggle('open', abrir);
  backdrop?.classList.toggle('open', abrir);
  document.body.classList.toggle('menu-open', abrir);
};

nav.innerHTML = Object.entries(MODULOS).map(([k, [t, , ico, sep]]) =>
  (sep ? `<div class="sidebar-group-sep">${sep}</div>` : '') +
  `<button type="button" data-t="${k}"><span class="nav-icon">${ico}</span><span>${t}</span></button>`
).join('');

// Opción de Modo oscuro dentro de Configuraciones (barra lateral)
const aplicarModoOscuro = activo => {
  if (activo) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  if (darkToggle) darkToggle.checked = activo;
  try { localStorage.setItem('bayer_dark_mode', activo ? '1' : '0'); } catch (_) {}
};

try {
  if (localStorage.getItem('bayer_dark_mode') === '1') aplicarModoOscuro(true);
} catch (_) {}

darkToggle?.addEventListener('change', e => aplicarModoOscuro(e.target.checked));

Modelo.onEstado(({ modo, sub }) => {
  if (!connDot) return;
  connDot.className = 'conn-dot ' + (modo === 'oracle' ? '' : 'warn');
  if (connTitle) connTitle.textContent = modo === 'oracle' ? 'Conexión directa a Oracle' : 'Conexión SQL activa';
  if (connSub) connSub.textContent = sub;
});

async function mostrar(k) {
  if (!MODULOS[k]) k = 'resumen';
  nav.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === k));
  toggleSidebar(false);
  vista.innerHTML = `<div class="loading-state"><div class="spinner"></div><p class="muted" style="margin:0">Cargando ${MODULOS[k][0]}…</p></div>`;
  try {
    await MODULOS[k][1](vista, () => mostrar(k));
  } catch (e) {
    vista.innerHTML = msg(`No se pudo cargar el módulo: ${e.message}. Verifica API_BASE en js/config.js y el servicio ORDS.`, false);
  }
}

nav.onclick = e => {
  const btn = e.target.closest('button[data-t]');
  if (btn) location.hash = btn.dataset.t;
};

document.querySelector('#btn-refresh')?.addEventListener('click', async () => {
  Modelo.limpiarCache(true);
  toggleSidebar(false);
  await mostrar(location.hash.slice(1));
  toast('Datos actualizados desde la base de datos.');
});

document.querySelector('#menu-toggle')?.addEventListener('click', () => toggleSidebar(true));
document.querySelector('#sidebar-close')?.addEventListener('click', () => toggleSidebar(false));
backdrop?.addEventListener('click', () => toggleSidebar(false));

window.onhashchange = () => mostrar(location.hash.slice(1));
mostrar(location.hash.slice(1));
