import { Modelo } from '../models/api.js';
import { card, table, badge, d, n, filtro } from '../views/ui.js';
import { filtrar } from './base.js';

export default async function (el) {
  const [rows, cl] = await Promise.all([Modelo.conciliacion(), Modelo.clientes()]);
  el.innerHTML = '<h2>Conciliación financiera y créditos (RF-05)</h2>' +
    card('Crédito por cliente', table(cl, [['cod_clienteb2b', 'Código'], ['nombre', 'Cliente'], ['limite_credito', 'Límite', n], ['saldo_utilizado', 'Utilizado', n], ['credito_disponible', 'Disponible', n]])) +
    filtro('q', 'Filtrar órdenes…') + '<div id="t"></div>';
  const dibujar = r => el.querySelector('#t').innerHTML = table(r, [['numero_orden', 'Orden'], ['fecha_orden', 'Fecha', d], ['estado', 'Estado', badge], ['cliente', 'Cliente'],
    ['valor_bruto', 'Bruto', n], ['descuento', 'Desc.', n], ['monto_impuesto', 'Impuesto', n], ['comision_distribucion', 'Comisión', n], ['total_orden', 'Total', n]]);
  dibujar(rows); filtrar(el, '#q', rows, dibujar);
}
