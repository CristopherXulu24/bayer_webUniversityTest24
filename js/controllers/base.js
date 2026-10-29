// CONTROLADOR base: conecta formularios y buscadores interactivos con el modelo.
import { Modelo } from '../models/api.js';
import { msg, toast } from '../views/ui.js';

/** Envia el formulario `id` a `ruta`; si sale bien ejecuta alExito (normalmente recargar el modulo). */
export function enlazar(raiz, id, ruta, alExito, { ok = r => r.ok == 1, texto = r => r.mensaje } = {}) {
  const f = raiz.querySelector('#' + id), salida = raiz.querySelector(`#${id}-m`);
  if (!f) return;
  f.onsubmit = async e => {
    e.preventDefault();
    const boton = f.querySelector('.go'), textoOriginal = boton.innerHTML, datos = {};
    boton.disabled = true;
    boton.textContent = 'Procesando…';
    for (const x of f.elements) {
      if (!x.name) continue;
      datos[x.name] = (x.type === 'number' || x.dataset.num) ? (x.value === '' ? null : +x.value) : x.value;
    }
    try {
      const r = await Modelo.guardar(ruta, datos), bien = ok(r);
      const mensaje = texto(r) || (bien ? 'Guardado correctamente.' : 'No se pudo completar la operación.');
      salida.innerHTML = msg(mensaje, bien);
      toast(mensaje, bien);
      if (bien && alExito) setTimeout(alExito, 650);
    } catch (err) {
      salida.innerHTML = msg(err.message, false);
      toast(err.message, false);
    }
    boton.disabled = false;
    boton.innerHTML = textoOriginal;
  };
}

/** Filtro de texto en vivo + pills de categoría + contador de registros sobre un arreglo de filas. */
export function filtrar(raiz, selectorInput, filas, dibujar, fnPredicadoPill = null) {
  const input = raiz.querySelector(selectorInput);
  if (!input) return;
  const idBase = selectorInput.replace(/^#/, '');
  const contador = raiz.querySelector(`#${idBase}-count`);
  const grupoPills = raiz.querySelector(`.pill-group[data-for="${idBase}"]`);
  let pillActiva = '';

  const aplicar = () => {
    const q = (input.value || '').trim().toLowerCase();
    const filtradas = filas.filter(r => {
      if (pillActiva && fnPredicadoPill && !fnPredicadoPill(r, pillActiva)) return false;
      if (!q) return true;
      return Object.values(r).join(' ').toLowerCase().includes(q);
    });
    if (contador) {
      contador.textContent = filtradas.length === filas.length
        ? `${filas.length} registro(s)`
        : `Mostrando ${filtradas.length} de ${filas.length}`;
    }
    dibujar(filtradas);
  };

  input.oninput = aplicar;

  if (grupoPills) {
    grupoPills.onclick = e => {
      const btn = e.target.closest('.pill-btn');
      if (!btn) return;
      grupoPills.querySelectorAll('.pill-btn').forEach(b => b.classList.toggle('active', b === btn));
      pillActiva = btn.dataset.pill || '';
      aplicar();
    };
  }

  aplicar();
}
