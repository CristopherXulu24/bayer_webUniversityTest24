import { Modelo } from '../models/api.js';
import { table, badge, d, hoy, icon, filtro, formulario } from '../views/ui.js';
import { enlazar, filtrar } from './base.js';

export default async function (el, recargar) {
  const [lo, pr, cc] = await Promise.all([Modelo.lotes(), Modelo.productos(), Modelo.calidad()]);
  const lotesPorCad = [...lo].sort((a, b) => String(a.fecha_caducidad).localeCompare(String(b.fecha_caducidad)));
  const activos = pr.filter(p => p.estado === 'ACTIVO');

  el.innerHTML =
    '<h2>Lotes</h2>' +
    filtro('q-lote', 'Buscar lote o medicamento…', [
      ['', 'Todos'],
      ['APROBADO', 'Aprobados'],
      ['PENDIENTE', 'En inspección'],
      ['BLOQUEADO', 'Bloqueados'],
      ['RECHAZADO', 'Rechazados'],
      ['VENCIDO', 'Vencidos'],
    ]) +
    '<div id="t-lote" style="margin-bottom:14px"></div>' +
    formulario('f-lote', `${icon('plus')} Registrar lote`, [
      { n: 'numero', l: 'Número de lote', ph: 'Ej. LT-24-A' },
      { n: 'id_producto', l: 'Producto', num: true, o: activos.map(p => [p.id_producto, `${p.cod_producto} · ${p.nombre}`]) },
      { n: 'fab', l: 'Fecha de fabricación', t: 'date', v: hoy() },
      { n: 'cad', l: 'Fecha de caducidad', t: 'date', v: hoy(365) },
      { n: 'estado', l: 'Estado inicial', o: ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'BLOQUEADO', 'VENCIDO'].map(t => [t, t]) },
    ], 'Guardar lote', true, false) +
    '<h2>Control de calidad</h2>' +
    filtro('q-cal', 'Buscar inspección por lote, producto o representante…', [
      ['', 'Todos'],
      ['APROBADO', 'Aprobados'],
      ['PENDIENTE', 'Pendientes'],
      ['RECHAZADO', 'Rechazados'],
    ]) +
    '<div id="t-cal" style="margin-bottom:14px"></div>' +
    formulario('f-cal', `${icon('flask')} Registrar inspección`, [
      { n: 'id_lote', l: 'Lote (o haz clic en Inspeccionar en la tabla de arriba)', num: true, o: lo.map(l => [l.id_lote, `${l.numero_lote} · ${l.producto} (${l.estado_lote})`]) },
      { n: 'resultado', l: 'Resultado', o: ['APROBADO', 'PENDIENTE', 'RECHAZADO'].map(t => [t, t]) },
      { n: 'representante', l: 'Representante', v: 'QA Planta Guatemala', req: false },
      { n: 'observaciones', l: 'Observaciones del dictamen', v: 'Inspección conforme a especificaciones', req: false },
    ], 'Guardar inspección', true, false);

  const formCal = el.querySelector('#f-cal');
  const expCal = el.querySelector('#exp-f-cal');

  filtrar(el, '#q-lote', lotesPorCad, filas => {
    el.querySelector('#t-lote').innerHTML = table(filas, [
      ['id_lote', 'ID'],
      ['numero_lote', 'Número de lote'],
      ['producto', 'Producto'],
      ['fecha_fabricacion', 'Fabricación', d],
      ['fecha_caducidad', 'Caducidad', d],
      ['estado_lote', 'Estado', badge],
      ['id_lote', 'Calidad', id => `<button type="button" class="btn-mini" data-insp="${id}">${icon('flask')} Inspeccionar</button>`],
    ]);
  }, (r, pill) => r.estado_lote === pill);

  el.querySelector('#t-lote').onclick = e => {
    const btn = e.target.closest('button[data-insp]');
    if (!btn || !formCal) return;
    formCal.elements.id_lote.value = btn.dataset.insp;
    if (expCal) {
      expCal.open = true;
      expCal.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  filtrar(el, '#q-cal', cc, filas => {
    el.querySelector('#t-cal').innerHTML = table(filas, [
      ['id_control_calidad', 'ID'],
      ['numero_lote', 'Lote'],
      ['producto', 'Producto'],
      ['fecha_inspeccion', 'Fecha inspección', d],
      ['resultado', 'Resultado', badge],
      ['representante', 'Representante'],
      ['observaciones', 'Observaciones'],
    ]);
  }, (r, pill) => r.resultado === pill);

  enlazar(el, 'f-lote', 'lote_nuevo', recargar);
  enlazar(el, 'f-cal', 'inspeccion_nueva', recargar);
}
