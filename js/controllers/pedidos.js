import { Modelo } from '../models/api.js';
import { table, badge, d, n, i0, filtro, formulario } from '../views/ui.js';
import { enlazar, filtrar } from './base.js';

export default async function (el, recargar) {
  const [cl, pr, bo, inv, ord, det] = await Promise.all([Modelo.clientes(), Modelo.productos(), Modelo.bodegas(), Modelo.inventario(), Modelo.ordenes(), Modelo.detalle_ordenes()]);
  el.innerHTML = '<h2>Procesar pedido B2B (FEFO atómico)</h2>' +
    formulario('f-chk', 'Nueva orden: reserva lotes APROBADOS por fecha de caducidad y afecta el crédito', [
      { n: 'id_cliente', l: 'Cliente', num: true, o: cl.map(c => [c.id_clienteb2b, `${c.cod_clienteb2b} · ${c.nombre}`]) },
      { n: 'id_producto', l: 'Producto', num: true, o: pr.filter(p => p.estado === 'ACTIVO').map(p => [p.id_producto, p.nombre]) },
      { n: 'id_bodega', l: 'Bodega', num: true, o: bo.map(b => [b.id_bodega, b.nombre]) },
      { n: 'cantidad', l: 'Cantidad', t: 'number', min: 1, v: 10 }], 'Procesar pedido').replace('<button', '<p id="h" class="muted"></p><button') +
    '<h2>Pedidos y estado</h2>' + filtro('q', 'Filtrar pedidos…') + '<div id="t"></div><h2>Detalle de pedidos</h2>' + filtro('q2', 'Filtrar detalle…') + '<div id="t2"></div>';

  const f = el.querySelector('#f-chk'), val = x => f.elements[x].value;
  const pista = () => {
    const c = cl.find(x => x.id_clienteb2b == val('id_cliente')), p = pr.find(x => x.id_producto == val('id_producto')), b = bo.find(x => x.id_bodega == val('id_bodega'));
    const disp = inv.filter(r => r.producto === p.nombre && r.bodega === b.nombre && r.estado_lote === 'APROBADO').reduce((a, r) => a + r.disponible, 0);
    el.querySelector('#h').textContent = `Crédito disponible: ${n(c.credito_disponible)} · Precio: ${n(p.precio_unitario)} · Disponible APROBADO: ${i0(disp)} u.`;
  };
  ['id_cliente', 'id_producto', 'id_bodega'].forEach(x => f.elements[x].onchange = pista);
  if (cl.length && pr.length && bo.length) pista();
  enlazar(el, 'f-chk', 'checkout', recargar, { ok: r => r.id_orden > 0, texto: r => (r.id_orden > 0 ? `Orden #${r.id_orden}: ` : '') + r.mensaje });

  const t1 = r => el.querySelector('#t').innerHTML = table(r, [['numero_orden', 'Orden'], ['fecha_orden', 'Fecha', d], ['estado', 'Estado', badge], ['cliente', 'Cliente'],
    ['descuento', 'Descuento', n], ['impuesto', 'Impuesto %', n], ['comision_pct', 'Comisión %', n]]);
  const t2 = r => el.querySelector('#t2').innerHTML = table(r, [['numero_orden', 'Orden'], ['cliente', 'Cliente'], ['producto', 'Producto'], ['numero_lote', 'Lote'],
    ['cantidad_solicitada', 'Cant.', i0], ['precio_unitario', 'Precio', n], ['subtotal', 'Subtotal', n]]);
  t1(ord); filtrar(el, '#q', ord, t1); t2(det); filtrar(el, '#q2', det, t2);
}
