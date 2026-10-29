import { Modelo } from '../models/api.js';
import { card, expander, table, badge, msg, toast, d, i0, icon, opts, filtro } from '../views/ui.js';
import { filtrar } from './base.js';

export default async function (el, recargar) {
  const [tr, lo] = await Promise.all([Modelo.trazabilidad(), Modelo.lotes()]);
  const bloqueados = lo.filter(l => l.estado_lote === 'BLOQUEADO');

  const panelRecall =
    `<div class="row" style="align-items:end">` +
      `<div><label>Seleccionar lote</label><select id="l">${opts(lo, 'numero_lote', x => `${x.numero_lote} · ${x.producto} (${x.estado_lote})`)}</select></div>` +
      `<div><label>O buscar número de lote exacto</label><input id="l-txt" placeholder="Ej. LT-09-A o LT-21-A"></div>` +
    `</div>` +
    (bloqueados.length
      ? `<div style="margin-top:8px;display:flex;align-items:center;gap:6px;flex-wrap:wrap"><span class="muted" style="font-size:12px">Lotes con alerta/recall activo:</span>` +
        bloqueados.map(b => `<button type="button" class="btn-mini" data-quick-lot="${b.numero_lote}">${icon('alert')} ${b.numero_lote} (${b.producto})</button>`).join('') +
        `</div>`
      : '') +
    `<button class="go" id="go" type="button">Buscar historial de distribución</button>` +
    `<div id="o" style="margin-top:14px"></div>`;

  el.innerHTML =
    '<h2>Historial de movimientos</h2>' +
    filtro('q', 'Filtrar movimientos por lote, producto, referencia o bodega…', [
      ['', 'Todos'],
      ['ENTRADA', 'Entradas'],
      ['SALIDA', 'Salidas'],
      ['TRANSFERENCIA', 'Transferencias'],
    ]) +
    '<div id="t" style="margin-bottom:16px"></div>' +
    expander(`${icon('search')} Consultar recall y bloqueo sanitario por lote`, panelRecall, true, 'exp-recall');

  const selLote = el.querySelector('#l');
  const txtLote = el.querySelector('#l-txt');

  const consultarRecall = async (loteBuscado) => {
    const lote = (loteBuscado || txtLote.value.trim() || selLote.value).toUpperCase();
    if (selLote.querySelector(`option[value="${lote}"]`)) selLote.value = lote;
    txtLote.value = lote;

    const o = el.querySelector('#o');
    o.innerHTML = '<div class="loading-state"><div class="spinner"></div><p class="muted" style="margin:0">Consultando distribución del lote…</p></div>';
    try {
      const r = await Modelo.recall(lote);
      const infoLote = lo.find(x => x.numero_lote === lote);
      const totalUnidades = r.reduce((a, x) => a + x.cantidad, 0);
      o.innerHTML =
        card(
          `Lote ${lote} ${infoLote ? `(${infoLote.producto})` : ''} · ${r.length} orden(es) · ${i0(totalUnidades)} unidades distribuidas`,
          table(r, [
            ['numero_lote', 'Lote'],
            ['producto', 'Producto'],
            ['cliente_institucional', 'Cliente'],
            ['nit', 'NIT'],
            ['numero_orden', 'Orden'],
            ['fecha_orden', 'Fecha orden', d],
            ['cantidad', 'Cant. solicitada', i0],
            ['numero_guia', 'Guía despacho'],
            ['fecha_despacho', 'Fecha despacho', d],
            ['estado_despacho', 'Estado', v => v ? badge(v) : '–'],
          ])
        ) +
        card(
          'Control de Calidad · Bloqueo sanitario preventivo',
          `<div class="row"><div><label>Motivo del bloqueo para ${lote}</label><input id="m" value="Alerta sanitaria: retención preventiva de lote"></div></div>` +
          `<button class="go danger" type="button" id="bl">Bloquear lote ${lote}</button><div id="r"></div>`
        );

      o.querySelector('#bl').onclick = async () => {
        try {
          const x = await Modelo.guardar('bloquear_lote', { lote, motivo: o.querySelector('#m').value });
          o.querySelector('#r').innerHTML = msg(x.mensaje, true);
          toast(x.mensaje, true);
          setTimeout(recargar, 900);
        } catch (e) {
          o.querySelector('#r').innerHTML = msg(e.message, false);
        }
      };
    } catch (e) {
      o.innerHTML = msg(e.message, false);
    }
  };

  el.querySelector('#go').onclick = () => consultarRecall();
  selLote.onchange = () => { txtLote.value = selLote.value; };

  el.querySelector('#exp-recall').addEventListener('click', e => {
    const btn = e.target.closest('button[data-quick-lot]');
    if (btn) consultarRecall(btn.dataset.quickLot);
  });

  const dibujar = r => {
    el.querySelector('#t').innerHTML = table(r, [
      ['id_trazabilidad', 'ID'],
      ['numero_lote', 'Lote'],
      ['producto', 'Producto'],
      ['tipo_movimiento', 'Movimiento', badge],
      ['fecha_movimiento', 'Fecha', d],
      ['cantidad', 'Cantidad', i0],
      ['referencia', 'Referencia'],
      ['bodega_origen', 'Bodega origen'],
      ['bodega_destino', 'Bodega destino'],
      ['numero_lote', 'Recall', l => `<button type="button" class="btn-mini" data-trace-lot="${l}">${icon('search')} Recall</button>`],
    ]);
  };

  el.querySelector('#t').onclick = e => {
    const btn = e.target.closest('button[data-trace-lot]');
    if (!btn) return;
    const exp = el.querySelector('#exp-recall');
    if (exp) {
      exp.open = true;
      exp.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    consultarRecall(btn.dataset.traceLot);
  };

  filtrar(el, '#q', tr, dibujar, (r, pill) => r.tipo_movimiento === pill);
}
