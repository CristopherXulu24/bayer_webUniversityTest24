// VISTA: funciones puras que devuelven HTML. No acceden a datos ni a la API.
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const n = v => v == null ? '' : Number(v).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const i0 = v => v == null ? '' : Number(v).toLocaleString('es-GT');
export const d = v => v ? String(v).slice(0, 10) : '';
export const hoy = (dias = 0) => new Date(Date.now() + dias * 864e5).toISOString().slice(0, 10);

const SVG_PATHS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  pill: '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  flask: '<path d="M10 2v7.31L4.72 18.55A2 2 0 0 0 6.46 21.5h11.08a2 2 0 0 0 1.74-2.95L14 9.31V2"/><path d="M8.5 2h7M7 16h10"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
  activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  arrow: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
};

export const icon = name => SVG_PATHS[name]
  ? `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true">${SVG_PATHS[name]}</svg>`
  : '';

const tone = v => /BLOQ|VENCIDO|CRITICO|RETIRADO|CANCEL|INACTIVO|RECHAZ/.test(v)
  ? 'bad'
  : /ALTO|INSPEC|MEDIO|PENDIENTE|TRANSITO|PROCESO|FRIO|2-8/.test(v)
  ? 'warn'
  : 'ok';

export const badge = v => v == null || v === '' ? '–' : `<span class="b ${tone(String(v))}">${esc(v)}</span>`;
export const msg = (t, ok) => `<div class="msg ${ok ? 'ok' : 'bad'}">${esc(t)}</div>`;
export const card = (t, h) => `<div class="card">${t ? `<b>${t}</b>` : ''}${h}</div>`;

/** Bloque desplegable estilo st.expander() de Python Streamlit */
export const expander = (titulo, contenido, abierto = false, id = '') =>
  `<details class="expander" ${id ? `id="${id}"` : ''} ${abierto ? 'open' : ''}><summary><span class="summary-label">${titulo}</span></summary><div class="expander-body">${contenido}</div></details>`;

export const filtro = (id, ph, pills = []) =>
  `<div class="table-toolbar">` +
  `<input id="${id}" class="search-input" placeholder="${esc(ph)}">` +
  (pills.length
    ? `<div class="pill-group" data-for="${id}">${pills.map(([val, lbl], idx) =>
        `<button type="button" class="pill-btn ${idx === 0 ? 'active' : ''}" data-pill="${esc(val)}">${esc(lbl)}</button>`
      ).join('')}</div>`
    : '') +
  `<span class="row-count" id="${id}-count"></span></div>`;

export const opts = (l, val, txt, sel) =>
  l.map(x => `<option value="${esc(x[val])}" ${x[val] == sel ? 'selected' : ''}>${esc(typeof txt === 'function' ? txt(x) : x[txt])}</option>`).join('');

export const kpis = l =>
  `<div class="kpis">${l.map(([t, v, sub]) =>
    `<div class="card kpi"><span class="kpi-label">${t}</span><b>${v}</b>${sub ? `<span class="kpi-sub">${sub}</span>` : ''}</div>`
  ).join('')}</div>`;

export function barras(mapa) {
  const k = Object.keys(mapa).sort(), mx = Math.max(...k.map(x => mapa[x]), 1);
  if (!k.length) return '<p class="muted">Sin datos mensuales registrados.</p>';
  return k.map(x =>
    `<div class="bar"><span>${esc(x)}</span><div class="bar-track"><i style="width:${Math.max(4, (mapa[x] / mx) * 100)}%"></i></div><span class="bar-val">Q ${n(mapa[x])}</span></div>`
  ).join('');
}

/** cols: [campo, titulo, formateador?]. El formateador recibe (valor, fila). */
export function table(rows, cols) {
  if (!rows || !rows.length) return '<p class="muted" style="padding:10px 4px;margin:0">Sin registros que coincidan.</p>';
  const celda = (r, c) => {
    const f = c[2], v = r[c[0]];
    const esNum = f === n || f === i0;
    return `<td data-label="${esc(c[1])}" class="${esNum ? 'num' : ''}">${f ? f(v, r) : esc(v ?? '–')}</td>`;
  };
  return `<div class="tw"><table><thead><tr>${cols.map(c => {
    const esNum = c[2] === n || c[2] === i0;
    return `<th class="${esNum ? 'num' : ''}">${c[1]}</th>`;
  }).join('')}</tr></thead><tbody>` +
    rows.map(r => `<tr>${cols.map(c => celda(r, c)).join('')}</tr>`).join('') +
    '</tbody></table></div>';
}

/** campos: {n:nombre, l:etiqueta, t:tipo, o:[[valor,texto]] (select), num:true, v:valor, req:false, min, step, ph} */
export function formulario(id, titulo, campos, boton = 'Guardar', comoExpander = false, abierto = false) {
  const ctl = c => {
    const base = `name="${c.n}" ${c.req === false ? '' : 'required'} ${c.ph ? `placeholder="${esc(c.ph)}"` : ''}`;
    if (c.o) return `<select ${base} ${c.num ? 'data-num="1"' : ''}>${opts(c.o, 0, 1, c.v)}</select>`;
    return `<input ${base} type="${c.t || 'text'}" value="${esc(c.v ?? '')}" ${c.min != null ? `min="${c.min}"` : ''} ${c.t === 'number' ? `step="${c.step || 1}"` : ''}>`;
  };
  const formHtml = `<form id="${id}" class="card">${comoExpander ? '' : `<b>${titulo}</b>`}` +
    `<div class="row">${campos.map(c => `<div><label>${c.l}</label>${ctl(c)}</div>`).join('')}</div>` +
    `<button class="go">${boton}</button><div id="${id}-m"></div></form>`;
  return comoExpander ? expander(titulo, formHtml, abierto, `exp-${id}`) : formHtml;
}

export function toast(texto, ok = true) {
  const box = document.querySelector('#toast-container');
  if (!box) return;
  const el = document.createElement('div');
  el.className = `toast ${ok ? 'ok' : 'bad'}`;
  el.innerHTML = `${icon(ok ? 'check' : 'alert')}<span>${esc(texto)}</span>`;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3400);
}
