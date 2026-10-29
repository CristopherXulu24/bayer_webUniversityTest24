import { Modelo } from '../models/api.js';
import { table, badge, n, icon, filtro, formulario } from '../views/ui.js';
import { enlazar, filtrar } from './base.js';

export default async function (el, recargar) {
  const pr = await Modelo.productos();
  const ordenados = [...pr].sort((a, b) => a.id_producto - b.id_producto);
  const sigCod = `BAY-${String(pr.length + 1).padStart(3, '0')}`;

  el.innerHTML =
    '<h2>Catálogo de medicamentos</h2>' +
    filtro('q-prod', 'Buscar por código, nombre o línea…', [
      ['', 'Todos'],
      ['ACTIVO', 'Activos'],
      ['OTC', 'OTC'],
      ['ETICO', 'Éticos'],
      ['FRIO', 'Cadena de frío'],
    ]) +
    '<div id="t-prod" style="margin-bottom:16px"></div>' +
    formulario('f-prod', `${icon('plus')} Registrar producto`, [
      { n: 'cod', l: 'Código', v: sigCod, ph: 'Ej. BAY-024' },
      { n: 'nombre', l: 'Nombre del medicamento', ph: 'Ej. Aspirina Forte 500 mg' },
      { n: 'linea', l: 'Línea farmacéutica', o: [['OTC', 'OTC (Venta libre)'], ['ETICO', 'Ético (Prescripción)']] },
      { n: 'cadena_frio', l: 'Requiere cadena de frío', o: [['N', 'No'], ['S', 'Sí (2 °C a 8 °C)']] },
      { n: 'precio', l: 'Precio unitario (Q)', t: 'number', step: '0.01', min: 0, v: 100 },
    ], 'Guardar producto', true, false) +
    formulario('f-edit', `${icon('edit')} Cambiar estado o precio`, [
      { n: 'id_producto', l: 'Seleccionar medicamento (o haz clic en Editar en la tabla)', num: true, o: ordenados.map(p => [p.id_producto, `#${p.id_producto} · ${p.cod_producto} — ${p.nombre}`]) },
      { n: 'estado', l: 'Estado', o: [['ACTIVO', 'ACTIVO'], ['INACTIVO', 'INACTIVO']] },
      { n: 'precio', l: 'Nuevo precio unitario (Q)', t: 'number', step: '0.01', min: 0 },
    ], 'Actualizar producto', true, false);

  const formEdit = el.querySelector('#f-edit');
  const expEdit = el.querySelector('#exp-f-edit');

  const sincronizarEdicion = (idProd) => {
    const prod = pr.find(x => x.id_producto == idProd);
    if (!prod || !formEdit) return;
    formEdit.elements.id_producto.value = prod.id_producto;
    formEdit.elements.estado.value = prod.estado;
    formEdit.elements.precio.value = prod.precio_unitario;
  };

  if (ordenados.length) sincronizarEdicion(ordenados[0].id_producto);
  formEdit.elements.id_producto.onchange = e => sincronizarEdicion(e.target.value);

  const dibujar = filas => {
    el.querySelector('#t-prod').innerHTML = table(filas, [
      ['id_producto', 'ID'],
      ['cod_producto', 'Código'],
      ['nombre', 'Nombre'],
      ['linea', 'Línea', badge],
      ['cadena_frio', 'Frío', v => v === 'S' ? badge('SÍ · 2-8 °C') : '<span class="muted">No</span>'],
      ['estado', 'Estado', badge],
      ['precio_unitario', 'Precio unitario', n],
      ['id_producto', 'Acción', id => `<button type="button" class="btn-mini" data-edit="${id}">${icon('edit')} Editar</button>`],
    ]);
  };

  el.querySelector('#t-prod').onclick = e => {
    const btn = e.target.closest('button[data-edit]');
    if (!btn) return;
    sincronizarEdicion(btn.dataset.edit);
    if (expEdit) {
      expEdit.open = true;
      expEdit.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => formEdit.elements.precio.focus(), 200);
    }
  };

  filtrar(el, '#q-prod', ordenados, dibujar, (r, pill) => {
    if (pill === 'ACTIVO') return r.estado === 'ACTIVO';
    if (pill === 'OTC' || pill === 'ETICO') return r.linea === pill;
    if (pill === 'FRIO') return r.cadena_frio === 'S';
    return true;
  });

  enlazar(el, 'f-prod', 'producto_nuevo', recargar);
  enlazar(el, 'f-edit', 'producto_editar', recargar);
}
