import { Modelo } from '../models/api.js';
import { table, badge, d, i0, filtro, formulario } from '../views/ui.js';
import { enlazar, filtrar } from './base.js';

export default async function (el, recargar) {
  const [inv, lo, bo] = await Promise.all([Modelo.inventario(), Modelo.lotes(), Modelo.bodegas()]);
  el.innerHTML = '<h2>Existencias por bodega y lote</h2>' + filtro('q', 'Filtrar por producto, lote, bodega…') + '<div id="t"></div>' +
    formulario('f-inv', 'Registrar existencia inicial', [{ n: 'id_lote', l: 'Lote', num: true, o: lo.map(l => [l.id_lote, `${l.numero_lote} · ${l.producto}`]) },
      { n: 'id_bodega', l: 'Bodega', num: true, o: bo.map(b => [b.id_bodega, b.nombre]) }, { n: 'stock', l: 'Unidades', t: 'number', min: 0 }]);
  const dibujar = r => el.querySelector('#t').innerHTML = table(r, [['bodega', 'Bodega'], ['producto', 'Producto'], ['numero_lote', 'Lote'], ['estado_lote', 'Estado', badge],
    ['fecha_caducidad', 'Caduca', d], ['stock', 'Stock', i0], ['reservas', 'Reservas', i0], ['disponible', 'Disponible', i0]]);
  dibujar(inv); filtrar(el, '#q', inv, dibujar);
  enlazar(el, 'f-inv', 'inventario_nuevo', recargar);
}
