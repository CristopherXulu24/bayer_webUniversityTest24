// CONTROLADOR base: conecta formularios (vista) con el modelo.
import { Modelo } from '../models/api.js';
import { msg } from '../views/ui.js';

/** Envia el formulario `id` a `ruta`; si sale bien ejecuta alExito (normalmente recargar el modulo). */
export function enlazar(raiz, id, ruta, alExito, { ok = r => r.ok == 1, texto = r => r.mensaje } = {}) {
  const f = raiz.querySelector('#' + id), salida = raiz.querySelector(`#${id}-m`);
  f.onsubmit = async e => {
    e.preventDefault();
    const boton = f.querySelector('.go'), datos = {};
    boton.disabled = true;
    for (const x of f.elements) {
      if (!x.name) continue;
      datos[x.name] = (x.type === 'number' || x.dataset.num) ? (x.value === '' ? null : +x.value) : x.value;
    }
    try {
      const r = await Modelo.guardar(ruta, datos), bien = ok(r);
      salida.innerHTML = msg(texto(r), bien);
      if (bien && alExito) setTimeout(alExito, 900);
    } catch (err) { salida.innerHTML = msg(err.message, false); }
    boton.disabled = false;
  };
}

/** Filtro de texto en vivo sobre un arreglo de filas. */
export function filtrar(raiz, id, filas, dibujar) {
  raiz.querySelector(id).oninput = e => {
    const q = e.target.value.toLowerCase();
    dibujar(filas.filter(r => Object.values(r).join(' ').toLowerCase().includes(q)));
  };
}
