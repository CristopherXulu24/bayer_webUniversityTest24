import { Modelo } from '../models/api.js';
import { card, table, badge, kpis, barras, n, i0, d } from '../views/ui.js';

export default async function (el) {
  const [prod, inv, ord, ven, res, vt, top, cl] = await Promise.all([Modelo.productos(), Modelo.inventario(), Modelo.ordenes(),
    Modelo.vencimientos(), Modelo.resumen_ordenes(), Modelo.ventas(), Modelo.top_productos(), Modelo.clientes()]);
  const proximos = ven.filter(r => r.dias_para_vencer >= 0 && r.dias_para_vencer <= 90 && r.estado_lote === 'APROBADO');
  const meses = {};
  vt.forEach(r => { const k = d(r.mes).slice(0, 7); meses[k] = (meses[k] || 0) + r.venta_bruta; });
  el.innerHTML = '<h2>Resumen</h2>' + kpis([
    ['Productos activos', i0(prod.filter(p => p.estado === 'ACTIVO').length)],
    ['Unidades disponibles', i0(inv.reduce((a, r) => a + r.disponible, 0))],
    ['Pedidos pendientes', i0(ord.filter(o => ['PENDIENTE', 'CONFIRMADA', 'EN_PROCESO'].includes(o.estado)).length)],
    ['Lotes por caducar (90 días)', i0(proximos.length)],
    ['Crédito utilizado', n(cl.reduce((a, r) => a + r.saldo_utilizado, 0))]]) +
    '<div class="two">' + card('Órdenes por estado', table(res, [['estado', 'Estado', badge], ['total_ordenes', 'Total', i0]])) +
    card('Top 10 productos solicitados', table(top, [['producto', 'Producto'], ['unidades_solicitadas', 'Unidades', i0]])) + '</div>' +
    card('Venta bruta mensual', barras(meses)) +
    card('Alertas de vencimiento (90 días)', table(proximos.slice(0, 15), [['centro_distribucion', 'Bodega'], ['producto', 'Producto'], ['numero_lote', 'Lote'],
      ['fecha_caducidad', 'Caduca', d], ['dias_para_vencer', 'Días', i0], ['stock_disponible', 'Disponible', i0]]));
}
