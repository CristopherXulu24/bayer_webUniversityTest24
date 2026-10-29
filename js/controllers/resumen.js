import { Modelo } from '../models/api.js';
import { card, table, badge, kpis, barras, filtro, n, i0, d } from '../views/ui.js';
import { filtrar } from './base.js';

export default async function (el) {
  const [prod, inv, ord, ven, res, vt, top, cl] = await Promise.all([
    Modelo.productos(), Modelo.inventario(), Modelo.ordenes(),
    Modelo.vencimientos(), Modelo.resumen_ordenes(), Modelo.ventas(),
    Modelo.top_productos(), Modelo.clientes(),
  ]);

  const proximos = ven.filter(r => r.dias_para_vencer >= 0 && r.dias_para_vencer <= 90 && r.estado_lote === 'APROBADO' && r.stock_disponible > 0);
  const meses = {};
  vt.forEach(r => {
    const k = d(r.mes).slice(0, 7);
    meses[k] = (meses[k] || 0) + r.venta_bruta;
  });

  el.innerHTML =
    kpis([
      ['Productos activos', i0(prod.filter(p => p.estado === 'ACTIVO').length), `De ${prod.length} en catálogo`],
      ['Unidades disponibles', i0(inv.reduce((a, r) => a + r.disponible, 0)), `En ${new Set(inv.map(x => x.bodega)).size} bodegas`],
      ['Pedidos pendientes', i0(ord.filter(o => ['PENDIENTE', 'CONFIRMADA', 'EN_PROCESO'].includes(o.estado)).length), `${ord.length} órdenes totales`],
      ['Lotes por caducar (90 días)', i0(proximos.length), 'Lotes aprobados con stock'],
      ['Crédito utilizado', 'Q ' + n(cl.reduce((a, r) => a + r.saldo_utilizado, 0)), `${cl.length} clientes B2B`],
    ]) +
    '<div class="two">' +
      card('Inventario por bodega', filtro('q-inv-res', 'Filtrar bodega, producto o lote…') + '<div id="t-inv-res"></div>') +
      card('Alertas de vencimiento (próximos 90 días)', filtro('q-ven-res', 'Filtrar alertas de caducidad…') + '<div id="t-ven-res"></div>') +
    '</div>' +
    '<div class="two">' +
      card('Órdenes por estado', table(res, [['estado', 'Estado', badge], ['total_ordenes', 'Total', i0]])) +
      card('Top 10 productos solicitados', table(top, [['producto', 'Producto'], ['unidades_solicitadas', 'Unidades', i0]])) +
    '</div>' +
    card('Venta bruta mensual', barras(meses));

  const dibujarInv = filas => {
    el.querySelector('#t-inv-res').innerHTML = table(filas, [
      ['bodega', 'Bodega'],
      ['producto', 'Producto'],
      ['numero_lote', 'Lote'],
      ['stock', 'Stock', i0],
      ['reservas', 'Reservas', i0],
      ['disponible', 'Disponible', i0],
    ]);
  };

  const dibujarVen = filas => {
    el.querySelector('#t-ven-res').innerHTML = table(filas, [
      ['centro_distribucion', 'Bodega'],
      ['producto', 'Producto'],
      ['numero_lote', 'Lote'],
      ['fecha_caducidad', 'Caducidad', d],
      ['dias_para_vencer', 'Días', i0],
      ['stock_disponible', 'Disponible', i0],
    ]);
  };

  filtrar(el, '#q-inv-res', inv, dibujarInv);
  filtrar(el, '#q-ven-res', proximos, dibujarVen);
}
