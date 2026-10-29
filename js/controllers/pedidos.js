import { Modelo } from '../models/api.js';
import { table, badge, d, n, i0, icon, filtro, formulario } from '../views/ui.js';
import { enlazar, filtrar } from './base.js';

export default async function (el, recargar) {
  const [cl, pr, bo, inv, ord, det, desp] = await Promise.all([
    Modelo.clientes(), Modelo.productos(), Modelo.bodegas(),
    Modelo.inventario(), Modelo.ordenes(), Modelo.detalle_ordenes(), Modelo.despachos(),
  ]);

  const activos = pr.filter(p => p.estado === 'ACTIVO');

  el.innerHTML =
    formulario('f-chk', `${icon('cart')} Procesar pedido con FEFO (SP_CHECKOUT_B2B_FEFO)`, [
      { n: 'id_cliente', l: 'Cliente B2B', num: true, o: cl.map(c => [c.id_clienteb2b, `${c.cod_clienteb2b} · ${c.nombre}`]) },
      { n: 'id_producto', l: 'Producto activo', num: true, o: activos.map(p => [p.id_producto, `${p.cod_producto} · ${p.nombre}${p.cadena_frio === 'S' ? ' [Frío]' : ''}`]) },
      { n: 'id_bodega', l: 'Bodega de despacho', num: true, o: bo.map(b => [b.id_bodega, b.nombre]) },
      { n: 'cantidad', l: 'Cantidad solicitada', t: 'number', min: 1, v: 50 },
    ], 'Procesar pedido', true, true)
      .replace(
        '<button',
        '<p class="muted" style="margin:6px 0 4px;font-size:12.5px">Ejecuta <code>SP_CHECKOUT_B2B_FEFO</code> en Oracle: valida línea de crédito, reserva lotes aprobados por fecha de caducidad (FEFO) y revierte con ROLLBACK si no alcanza el stock.</p>' +
        '<div id="h" class="fefo-preview"></div><button'
      ) +
    '<h2>Pedidos y estado de despacho</h2>' +
    filtro('q', 'Filtrar pedidos por número, cliente o estado…', [
      ['', 'Todos'],
      ['CONFIRMADA', 'Confirmadas'],
      ['DESPACHADA', 'Despachadas'],
      ['ENTREGADA', 'Entregadas'],
    ]) +
    '<div id="t" style="margin-bottom:18px"></div>' +
    '<h2>Detalle de pedidos por lote</h2>' +
    filtro('q2', 'Filtrar detalle por orden, cliente, producto o lote…') +
    '<div id="t2" style="margin-bottom:18px"></div>' +
    '<h2>Guías y despachos registrados</h2>' +
    filtro('q3', 'Filtrar guías de despacho…') +
    '<div id="t3"></div>';

  const f = el.querySelector('#f-chk');
  const val = x => f.elements[x].value;

  const autoAjustarBodega = () => {
    const p = pr.find(x => x.id_producto == val('id_producto'));
    const bActual = bo.find(x => x.id_bodega == val('id_bodega'));
    if (!p || !bActual) return;
    const stockEnActual = inv
      .filter(r => r.producto === p.nombre && r.bodega === bActual.nombre && r.estado_lote === 'APROBADO')
      .reduce((a, r) => a + r.disponible, 0);
    if (stockEnActual === 0) {
      const mejorBodega = bo.find(b =>
        inv.some(r => r.producto === p.nombre && r.bodega === b.nombre && r.estado_lote === 'APROBADO' && r.disponible > 0)
      );
      if (mejorBodega) f.elements.id_bodega.value = mejorBodega.id_bodega;
    }
  };

  const pista = () => {
    const c = cl.find(x => x.id_clienteb2b == val('id_cliente'));
    const p = pr.find(x => x.id_producto == val('id_producto'));
    const b = bo.find(x => x.id_bodega == val('id_bodega'));
    const cant = Math.max(0, Number(val('cantidad') || 0));
    if (!c || !p || !b) return;

    const lotesDisp = inv
      .filter(r => r.producto === p.nombre && r.bodega === b.nombre && r.estado_lote === 'APROBADO' && r.disponible > 0)
      .sort((x, y) => String(x.fecha_caducidad).localeCompare(String(y.fecha_caducidad)));

    const dispTotal = lotesDisp.reduce((a, r) => a + r.disponible, 0);
    const bruto = cant * p.precio_unitario;
    const pctDesc = cant >= 5000 ? 8 : cant >= 1000 ? 5 : cant >= 500 ? 3 : 0;
    const desc = +(bruto * pctDesc / 100).toFixed(2);
    const neto = bruto - desc;
    const total = +(neto * 1.14).toFixed(2);

    const alcanzaStock = cant > 0 && dispTotal >= cant;
    const alcanzaCredito = c.credito_disponible >= total;

    let rem = cant;
    const asignacion = [];
    for (const l of lotesDisp) {
      if (rem <= 0) break;
      const tomar = Math.min(l.disponible, rem);
      asignacion.push(`${l.numero_lote} (vence ${d(l.fecha_caducidad)}): <b>${i0(tomar)} u.</b>`);
      rem -= tomar;
    }

    el.querySelector('#h').innerHTML =
      `<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">` +
        `<strong>Simulación previa FEFO y Financiera</strong>` +
        `<span>${alcanzaStock && alcanzaCredito
          ? '<span class="b ok">[✓] Viable para procesar</span>'
          : `<span class="b bad">[!] ${!alcanzaStock ? 'Stock insuficiente en bodega' : 'Crédito insuficiente'}</span>`}</span>` +
      `</div>` +
      `<div class="fefo-grid">` +
        `<div class="fefo-stat"><small>Crédito disponible cliente</small><strong>Q ${n(c.credito_disponible)}</strong></div>` +
        `<div class="fefo-stat"><small>Stock APROBADO en bodega</small><strong>${i0(dispTotal)} u.</strong></div>` +
        `<div class="fefo-stat"><small>Precio unitario · Desc. (${pctDesc}%)</small><strong>Q ${n(p.precio_unitario)} · -Q ${n(desc)}</strong></div>` +
        `<div class="fefo-stat"><small>Total orden (+12% IVA +2% com.)</small><strong>Q ${n(total)}</strong></div>` +
      `</div>` +
      `<div style="margin-top:8px;font-size:12.5px" class="muted">` +
        (asignacion.length
          ? `Lotes FEFO a reservar: ${asignacion.join(' &rarr; ')}`
          : `Sin lotes APROBADOS disponibles para <b>${p.nombre}</b> en <b>${b.nombre}</b>.`) +
      `</div>`;
  };

  f.elements.id_producto.onchange = () => { autoAjustarBodega(); pista(); };
  f.elements.id_cliente.onchange = pista;
  f.elements.id_bodega.onchange = pista;
  f.elements.cantidad.oninput = pista;
  if (cl.length && activos.length && bo.length) {
    autoAjustarBodega();
    pista();
  }

  enlazar(el, 'f-chk', 'checkout', recargar, {
    ok: r => r.id_orden > 0,
    texto: r => (r.id_orden > 0 ? `${r.mensaje} · Número interno de orden: ${r.id_orden}` : r.mensaje),
  });

  const t1 = r => {
    el.querySelector('#t').innerHTML = table(r, [
      ['id_orden', 'ID'],
      ['numero_orden', 'Número de orden'],
      ['fecha_orden', 'Fecha', d],
      ['estado', 'Estado', badge],
      ['cliente', 'Cliente'],
      ['descuento', 'Descuento', n],
      ['impuesto', 'Impuesto %', n],
      ['comision_pct', 'Comisión %', n],
      ['numero_orden', 'Detalle', num => `<button type="button" class="btn-mini" data-ver-orden="${num}">${icon('arrow')} Ver lotes</button>`],
    ]);
  };

  const t2 = r => {
    el.querySelector('#t2').innerHTML = table(r, [
      ['numero_orden', 'Número de orden'],
      ['cliente', 'Cliente'],
      ['producto', 'Producto'],
      ['numero_lote', 'Lote asignado'],
      ['cantidad_solicitada', 'Cantidad', i0],
      ['precio_unitario', 'Precio unitario', n],
      ['subtotal', 'Subtotal', n],
    ]);
  };

  const t3 = r => {
    el.querySelector('#t3').innerHTML = table(r, [
      ['numero_guia', 'Guía', v => v || '<span class="muted">Pendiente</span>'],
      ['fecha_despacho', 'Fecha despacho', d],
      ['estado_despacho', 'Estado despacho', badge],
      ['bodega_origen', 'Bodega origen'],
      ['numero_orden', 'Orden'],
      ['cliente', 'Cliente'],
    ]);
  };

  el.querySelector('#t').onclick = e => {
    const btn = e.target.closest('button[data-ver-orden]');
    if (!btn) return;
    const inputDet = el.querySelector('#q2');
    if (inputDet) {
      inputDet.value = btn.dataset.verOrden;
      inputDet.dispatchEvent(new Event('input'));
      inputDet.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  filtrar(el, '#q', ord, t1, (r, pill) => r.estado === pill);
  filtrar(el, '#q2', det, t2);
  filtrar(el, '#q3', desp, t3);
}
