import { Modelo } from '../models/api.js';
import { table, badge, n, formulario } from '../views/ui.js';
import { enlazar } from './base.js';

export default async function (el, recargar) {
  const pr = await Modelo.productos();
  el.innerHTML = '<h2>Catálogo de medicamentos</h2>' +
    table(pr, [['cod_producto', 'Código'], ['nombre', 'Nombre'], ['linea', 'Línea'], ['cadena_frio', 'Frío'], ['estado', 'Estado', badge], ['precio_unitario', 'Precio', n]]) +
    '<div class="two">' +
    formulario('f-prod', 'Registrar producto', [{ n: 'cod', l: 'Código' }, { n: 'nombre', l: 'Nombre' },
      { n: 'linea', l: 'Línea', o: [['OTC', 'OTC'], ['ETICO', 'Ético']] }, { n: 'cadena_frio', l: 'Cadena de frío', o: [['N', 'No'], ['S', 'Sí']] },
      { n: 'precio', l: 'Precio unitario', t: 'number', step: '0.01', min: 0 }]) +
    formulario('f-edit', 'Cambiar estado o precio', [{ n: 'id_producto', l: 'Producto', num: true, o: pr.map(p => [p.id_producto, `${p.cod_producto} · ${p.nombre}`]) },
      { n: 'estado', l: 'Estado', o: [['ACTIVO', 'Activo'], ['INACTIVO', 'Inactivo']] }, { n: 'precio', l: 'Nuevo precio', t: 'number', step: '0.01', min: 0 }], 'Actualizar') + '</div>';
  enlazar(el, 'f-prod', 'producto_nuevo', recargar);
  enlazar(el, 'f-edit', 'producto_editar', recargar);
}
