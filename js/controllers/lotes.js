import { Modelo } from '../models/api.js';
import { table, badge, d, hoy, formulario } from '../views/ui.js';
import { enlazar } from './base.js';

export default async function (el, recargar) {
  const [lo, pr, cc] = await Promise.all([Modelo.lotes(), Modelo.productos(), Modelo.calidad()]);
  el.innerHTML = '<h2>Lotes</h2>' +
    table(lo, [['numero_lote', 'Lote'], ['producto', 'Producto'], ['fecha_fabricacion', 'Fabricación', d], ['fecha_caducidad', 'Caducidad', d], ['estado_lote', 'Estado', badge]]) +
    formulario('f-lote', 'Registrar lote', [{ n: 'numero', l: 'Número de lote' },
      { n: 'id_producto', l: 'Producto', num: true, o: pr.filter(p => p.estado === 'ACTIVO').map(p => [p.id_producto, p.nombre]) },
      { n: 'fab', l: 'Fabricación', t: 'date', v: hoy() }, { n: 'cad', l: 'Caducidad', t: 'date', v: hoy(365) },
      { n: 'estado', l: 'Estado inicial', o: ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'BLOQUEADO', 'VENCIDO'].map(t => [t, t]) }]) +
    '<h2>Control de calidad</h2>' +
    table(cc, [['numero_lote', 'Lote'], ['producto', 'Producto'], ['fecha_inspeccion', 'Fecha', d], ['resultado', 'Resultado', badge], ['representante', 'Representante'], ['observaciones', 'Observaciones']]) +
    formulario('f-cal', 'Registrar inspección', [{ n: 'id_lote', l: 'Lote', num: true, o: lo.map(l => [l.id_lote, `${l.numero_lote} · ${l.producto}`]) },
      { n: 'resultado', l: 'Resultado', o: ['PENDIENTE', 'APROBADO', 'RECHAZADO'].map(t => [t, t]) },
      { n: 'representante', l: 'Representante', req: false }, { n: 'observaciones', l: 'Observaciones', req: false }], 'Guardar inspección');
  enlazar(el, 'f-lote', 'lote_nuevo', recargar);
  enlazar(el, 'f-cal', 'inspeccion_nueva', recargar);
}
