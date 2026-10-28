import { Modelo } from '../models/api.js';
import { msg, opts, i0, n } from '../views/ui.js';

const esperar = ms => new Promise(r => setTimeout(r, ms));

export default async function (el) {
  const [cl, pr, bo] = await Promise.all([Modelo.clientes(), Modelo.productos(), Modelo.bodegas()]);
  const por = pr.find(x => x.cod_producto === 'TEST-CRIT-A') || pr[0];
  el.innerHTML = `<h2>Laboratorio de concurrencia y recuperación</h2><div class="card"><b>Parámetros</b><div class="row">
    <div><label>Producto (usa TEST-CRIT-A, creado en 06 · PASO 0)</label><select id="p">${opts(pr, 'id_producto', x => `${x.cod_producto} · ${x.nombre}`, por.id_producto)}</select></div>
    <div><label>Bodega</label><select id="b">${opts(bo, 'id_bodega', 'nombre')}</select></div>
    <div><label>Cantidad</label><input id="q" type="number" value="100"></div></div></div>
    <div class="two"><div class="card"><b>Concurrencia (RNF-01)</b><p class="muted">Dos clientes piden el mismo lote a la vez. El primero retiene el bloqueo 8 s; el segundo espera y se revierte sin sobreventa.</p>
    <button class="go" id="g1">Lanzar 2 compras simultáneas</button><div id="o1"></div></div>
    <div class="card"><b>Crash test (RF-02)</b><p class="muted">Falla simulada con el crédito ya descontado. El ROLLBACK debe dejar intactos reservas y saldo.</p>
    <button class="go" id="g2">Provocar falla a mitad del proceso</button><div id="o2"></div></div></div>`;

  const sel = () => ({ p: pr.find(x => x.id_producto == el.querySelector('#p').value), b: bo.find(x => x.id_bodega == el.querySelector('#b').value), q: +el.querySelector('#q').value });
  const foto = async ids => {
    const [c, inv] = await Promise.all([Modelo.clientes(), Modelo.inventario()]), s = sel();
    return { saldos: ids.map(i => c.find(x => x.id_clienteb2b == i).saldo_utilizado),
      res: inv.filter(r => r.producto === s.p.nombre && r.bodega === s.b.nombre).reduce((a, r) => a + r.reservas, 0) };
  };

  el.querySelector('#g1').onclick = async () => {
    const s = sel(), A = cl[0], B = cl[1], o = el.querySelector('#o1');
    o.innerHTML = '<p class="muted">Ejecutando (≈10 s)…</p>';
    try {
      const antes = await foto([A.id_clienteb2b, B.id_clienteb2b]), t0 = Date.now(), cuerpo = { id_producto: s.p.id_producto, id_bodega: s.b.id_bodega, cantidad: s.q };
      const [ra, rb] = await Promise.all([Modelo.guardar('checkout', { ...cuerpo, id_cliente: A.id_clienteb2b, pausa: 8 }),
        esperar(1500).then(() => Modelo.guardar('checkout', { ...cuerpo, id_cliente: B.id_clienteb2b })).then(r => ({ ...r, ms: Date.now() - t0 }))]);
      const des = await foto([A.id_clienteb2b, B.id_clienteb2b]);
      o.innerHTML = msg(`Sesión 1 (${A.nombre}): ${ra.mensaje}`, ra.id_orden > 0) + msg(`Sesión 2 (${B.nombre}, esperó ${(rb.ms / 1000).toFixed(1)} s): ${rb.mensaje}`, rb.id_orden > 0) +
        `<p>Reservas: <b>${i0(antes.res)} → ${i0(des.res)}</b> · Saldo sesión 2: <b>${n(antes.saldos[1])} → ${n(des.saldos[1])}</b></p>`;
    } catch (e) { o.innerHTML = msg(e.message, false); }
  };

  el.querySelector('#g2').onclick = async () => {
    const s = sel(), A = cl[0], o = el.querySelector('#o2');
    o.innerHTML = '<p class="muted">Ejecutando…</p>';
    try {
      const antes = await foto([A.id_clienteb2b]);
      const r = await Modelo.guardar('checkout', { id_cliente: A.id_clienteb2b, id_producto: s.p.id_producto, id_bodega: s.b.id_bodega, cantidad: Math.min(s.q, 10), simular_fallo: 2 });
      const des = await foto([A.id_clienteb2b]), igual = antes.res === des.res && antes.saldos[0] === des.saldos[0];
      o.innerHTML = msg(r.mensaje, false) + `<p>Reservas: <b>${i0(antes.res)} → ${i0(des.res)}</b> · Saldo: <b>${n(antes.saldos[0])} → ${n(des.saldos[0])}</b></p>` +
        msg(igual ? 'ROLLBACK verificado: inventario y crédito intactos.' : 'Los valores cambiaron: revisar.', igual);
    } catch (e) { o.innerHTML = msg(e.message, false); }
  };
}
