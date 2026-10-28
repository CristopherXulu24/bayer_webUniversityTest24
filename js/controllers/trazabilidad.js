import { Modelo } from '../models/api.js';
import { card, table, badge, msg, d, i0, opts, filtro } from '../views/ui.js';
import { filtrar } from './base.js';

export default async function (el) {
  const [tr, lo] = await Promise.all([Modelo.trazabilidad(), Modelo.lotes()]);
  el.innerHTML = '<h2>Recall por lote</h2>' +
    card('', `<label>Lote</label><select id="l">${opts(lo, 'numero_lote', x => `${x.numero_lote} · ${x.producto} (${x.estado_lote})`)}</select><button class="go" id="go">Rastrear distribución</button>`) +
    '<div id="o"></div><h2>Historial de movimientos</h2>' + filtro('q', 'Filtrar…') + '<div id="t"></div>';
  const dibujar = r => el.querySelector('#t').innerHTML = table(r, [['numero_lote', 'Lote'], ['producto', 'Producto'], ['tipo_movimiento', 'Movimiento'],
    ['fecha_movimiento', 'Fecha', d], ['cantidad', 'Cant.', i0], ['referencia', 'Referencia'], ['bodega_origen', 'Origen'], ['bodega_destino', 'Destino']]);
  dibujar(tr); filtrar(el, '#q', tr, dibujar);

  el.querySelector('#go').onclick = async () => {
    const lote = el.querySelector('#l').value, o = el.querySelector('#o');
    o.innerHTML = '<p class="muted">Consultando…</p>';
    try {
      const r = await Modelo.recall(lote);
      o.innerHTML = card(`Lote ${lote}: ${r.length} orden(es) · ${i0(r.reduce((a, x) => a + x.cantidad, 0))} unidades`,
        table(r, [['cliente_institucional', 'Cliente'], ['nit', 'NIT'], ['numero_orden', 'Orden'], ['fecha_orden', 'Fecha', d], ['cantidad', 'Cant.', i0], ['numero_guia', 'Guía'],
          ['estado_despacho', 'Despacho', v => v ? badge(v) : '–']])) +
        card('Control de Calidad', '<label>Motivo del bloqueo</label><input id="m" value="Alerta sanitaria: retención preventiva"><button class="go" id="bl">Bloquear lote</button><div id="r"></div>');
      o.querySelector('#bl').onclick = async () => {
        try { const x = await Modelo.guardar('bloquear_lote', { lote, motivo: o.querySelector('#m').value }); o.querySelector('#r').innerHTML = msg(x.mensaje, true); }
        catch (e) { o.querySelector('#r').innerHTML = msg(e.message, false); }
      };
    } catch (e) { o.innerHTML = msg(e.message, false); }
  };
}
