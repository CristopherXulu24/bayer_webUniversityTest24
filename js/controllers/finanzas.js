import { Modelo } from '../models/api.js';
import { card, table, badge, d, n, icon, filtro } from '../views/ui.js';
import { filtrar } from './base.js';

export default async function (el) {
  const [rows, cl] = await Promise.all([Modelo.conciliacion(), Modelo.clientes()]);

  el.innerHTML =
    '<h2>Conciliación financiera y créditos (RF-05)</h2>' +
    card('Líneas de crédito corporativo por cliente B2B', table(cl, [
      ['cod_clienteb2b', 'Código'],
      ['nombre', 'Cliente'],
      ['limite_credito', 'Límite autorizado', n],
      ['saldo_utilizado', 'Saldo utilizado', n],
      ['credito_disponible', 'Crédito disponible', n],
      ['nombre', 'Órdenes', nom => `<button type="button" class="btn-mini" data-cli="${nom}">${icon('arrow')} Ver órdenes</button>`],
    ])) +
    '<h2>Conciliación detallada por orden</h2>' +
    filtro('q', 'Filtrar por número de orden, cliente o estado…', [
      ['', 'Todas'],
      ['CONFIRMADA', 'Confirmadas'],
      ['DESPACHADA', 'Despachadas'],
      ['ENTREGADA', 'Entregadas'],
    ]) +
    '<div id="t"></div>';

  const dibujar = r => {
    el.querySelector('#t').innerHTML = table(r, [
      ['numero_orden', 'Orden'],
      ['fecha_orden', 'Fecha', d],
      ['estado', 'Estado', badge],
      ['cliente', 'Cliente'],
      ['valor_bruto', 'Bruto', n],
      ['descuento', 'Descuento', n],
      ['monto_impuesto', 'Impuesto (12%)', n],
      ['comision_distribucion', 'Comisión (2%)', n],
      ['total_orden', 'Total cargado', n],
    ]);
  };

  el.onclick = e => {
    const btn = e.target.closest('button[data-cli]');
    if (!btn) return;
    const input = el.querySelector('#q');
    if (input) {
      input.value = btn.dataset.cli;
      input.dispatchEvent(new Event('input'));
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  filtrar(el, '#q', rows, dibujar, (r, pill) => r.estado === pill);
}
