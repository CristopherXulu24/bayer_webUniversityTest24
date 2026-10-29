import { Modelo } from '../models/api.js';
import { table, badge, d, i0, icon, filtro, formulario } from '../views/ui.js';
import { enlazar, filtrar } from './base.js';

export default async function (el, recargar) {
  const [inv, lo, bo] = await Promise.all([Modelo.inventario(), Modelo.lotes(), Modelo.bodegas()]);
  const pillsBodega = [['', 'Todas las bodegas'], ...bo.map(b => [b.nombre, b.nombre])];

  el.innerHTML =
    '<h2>Existencias por bodega y lote</h2>' +
    filtro('q', 'Filtrar por producto, lote o bodega…', pillsBodega) +
    '<div id="t" style="margin-bottom:14px"></div>' +
    formulario('f-inv', `${icon('plus')} Registrar existencia inicial`, [
      { n: 'id_lote', l: 'Lote', num: true, o: lo.map(l => [l.id_lote, `${l.numero_lote} · ${l.producto}`]) },
      { n: 'id_bodega', l: 'Bodega', num: true, o: bo.map(b => [b.id_bodega, b.nombre]) },
      { n: 'stock', l: 'Unidades', t: 'number', min: 1, v: 100 },
    ], 'Guardar existencia', true, false).replace('<button', '<p id="inv-hint" class="muted" style="margin:6px 0 2px;font-size:12.5px"></p><button');

  const f = el.querySelector('#f-inv');
  const actualizarPista = () => {
    const loteSel = lo.find(x => x.id_lote == f.elements.id_lote.value);
    const bodSel = bo.find(x => x.id_bodega == f.elements.id_bodega.value);
    if (!loteSel || !bodSel) return;
    const existente = inv.find(r => r.numero_lote === loteSel.numero_lote && r.bodega === bodSel.nombre);
    const hint = el.querySelector('#inv-hint');
    if (existente) {
      hint.innerHTML = `[!] El lote <b>${loteSel.numero_lote}</b> ya tiene existencia registrada en <b>${bodSel.nombre}</b> (${i0(existente.stock)} u.). Elige una bodega donde aún no esté dado de alta.`;
    } else {
      hint.innerHTML = `[✓] Combinación disponible: <b>${loteSel.numero_lote}</b> en <b>${bodSel.nombre}</b>.`;
    }
  };
  f.elements.id_lote.onchange = actualizarPista;
  f.elements.id_bodega.onchange = actualizarPista;
  actualizarPista();

  const dibujar = r => {
    el.querySelector('#t').innerHTML = table(r, [
      ['id_inventario', 'ID'],
      ['bodega', 'Bodega'],
      ['numero_lote', 'Lote'],
      ['producto', 'Producto'],
      ['estado_lote', 'Estado', badge],
      ['fecha_caducidad', 'Caduca', d],
      ['stock', 'Stock', i0],
      ['reservas', 'Reservas', i0],
      ['disponible', 'Disponible', i0],
    ]);
  };

  filtrar(el, '#q', inv, dibujar, (r, pill) => r.bodega === pill);
  enlazar(el, 'f-inv', 'inventario_nuevo', recargar);
}
