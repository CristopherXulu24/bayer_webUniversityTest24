// VISTA: funciones puras que devuelven HTML. No acceden a datos ni a la API.
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const n = v => v == null ? '' : Number(v).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const i0 = v => v == null ? '' : Number(v).toLocaleString('es-GT');
export const d = v => v ? String(v).slice(0, 10) : '';
export const hoy = (dias = 0) => new Date(Date.now() + dias * 864e5).toISOString().slice(0, 10);
const tone = v => /BLOQ|VENCIDO|CRITICO|RETIRADO|CANCEL|INACTIVO|RECHAZ/.test(v) ? 'bad' : /ALTO|INSPEC|MEDIO|PENDIENTE/.test(v) ? 'warn' : 'ok';
export const badge = v => `<span class="b ${tone(String(v))}">${esc(v)}</span>`;
export const msg = (t, ok) => `<div class="msg ${ok ? 'ok' : 'bad'}">${esc(t)}</div>`;
export const card = (t, h) => `<div class="card">${t ? `<b>${t}</b>` : ''}${h}</div>`;
export const filtro = (id, ph) => `<input id="${id}" placeholder="${ph}" style="max-width:320px;margin-bottom:10px">`;
export const opts = (l, val, txt, sel) => l.map(x => `<option value="${esc(x[val])}" ${x[val] == sel ? 'selected' : ''}>${esc(typeof txt === 'function' ? txt(x) : x[txt])}</option>`).join('');
export const kpis = l => `<div class="kpis">${l.map(([t, v]) => `<div class="card kpi muted">${t}<b>${v}</b></div>`).join('')}</div>`;

export function barras(mapa) {
  const k = Object.keys(mapa).sort(), mx = Math.max(...k.map(x => mapa[x]), 1);
  return k.map(x => `<div class="bar"><span>${x}</span><i style="width:${mapa[x] / mx * 70}%"></i><span>${n(mapa[x])}</span></div>`).join('');
}

/** cols: [campo, titulo, formateador?]. El formateador recibe (valor, fila). */
export function table(rows, cols) {
  if (!rows.length) return '<p class="muted">Sin datos.</p>';
  const celda = (r, c) => { const f = c[2], v = r[c[0]]; return `<td class="${f === n || f === i0 ? 'num' : ''}">${f ? f(v, r) : esc(v)}</td>`; };
  return `<div class="tw"><table><thead><tr>${cols.map(c => `<th>${c[1]}</th>`).join('')}</tr></thead><tbody>` +
    rows.map(r => `<tr>${cols.map(c => celda(r, c)).join('')}</tr>`).join('') + '</tbody></table></div>';
}

/** campos: {n:nombre, l:etiqueta, t:tipo, o:[[valor,texto]] (select), num:true, v:valor, req:false, min, step} */
export function formulario(id, titulo, campos, boton = 'Guardar') {
  const ctl = c => {
    const base = `name="${c.n}" ${c.req === false ? '' : 'required'}`;
    if (c.o) return `<select ${base} ${c.num ? 'data-num="1"' : ''}>${opts(c.o, 0, 1, c.v)}</select>`;
    return `<input ${base} type="${c.t || 'text'}" value="${esc(c.v ?? '')}" ${c.min != null ? `min="${c.min}"` : ''} ${c.t === 'number' ? `step="${c.step || 1}"` : ''}>`;
  };
  return `<form id="${id}" class="card"><b>${titulo}</b><div class="row">${campos.map(c => `<div><label>${c.l}</label>${ctl(c)}</div>`).join('')}</div>` +
    `<button class="go">${boton}</button><div id="${id}-m"></div></form>`;
}
