import { Modelo } from '../models/api.js';
import { card, table, badge, d, i0, filtro } from '../views/ui.js';
import { filtrar } from './base.js';

const VENTANAS = ['VENCIDO', '30 DIAS (CRITICO)', '60 DIAS (ALTO)', '90 DIAS (MEDIO)', '180 DIAS (BAJO)'];

export default async function (el) {
  const ven = await Modelo.vencimientos(), P = {};
  ven.forEach(r => { const c = P[r.centro_distribucion] ||= {}; c[r.ventana_vencimiento] = (c[r.ventana_vencimiento] || 0) + r.stock_fisico; });
  const pivote = Object.keys(P).map(k => ({ centro: k, ...P[k] }));
  el.innerHTML = '<h2>Alerta temprana de vencimientos (FEFO)</h2>' +
    card('Unidades físicas por centro y ventana', table(pivote, [['centro', 'Centro'], ...VENTANAS.map(w => [w, w, v => v == null ? '–' : i0(v)])])) +
    filtro('q', 'Filtrar detalle…') + '<div id="t"></div>';
  const dibujar = r => el.querySelector('#t').innerHTML = table(r, [['centro_distribucion', 'Centro'], ['producto', 'Producto'], ['numero_lote', 'Lote'],
    ['fecha_caducidad', 'Caduca', d], ['dias_para_vencer', 'Días', i0], ['stock_fisico', 'Físico', i0], ['stock_disponible', 'Disponible', i0], ['ventana_vencimiento', 'Ventana', badge]]);
  dibujar(ven); filtrar(el, '#q', ven, dibujar);
}
