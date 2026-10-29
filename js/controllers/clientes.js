import { Modelo } from '../models/api.js';
import { table, badge, n, icon, filtro, formulario } from '../views/ui.js';
import { enlazar, filtrar } from './base.js';

export default async function (el, recargar) {
  const [cl, bo] = await Promise.all([Modelo.clientes(), Modelo.bodegas()]);
  const tiposBodega = ['PRINCIPAL', 'DISTRIBUCION', 'FRIO', 'CUARENTENA', 'OTRA'].map(t => [t, t]);
  const sigCli = `CLI-${String(cl.length + 1).padStart(3, '0')}`;

  el.innerHTML =
    '<div class="two">' +
      '<div>' +
        '<h2>Clientes B2B</h2>' +
        filtro('q-cli', 'Buscar cliente, código o NIT…') +
        '<div id="t-cli" style="margin-bottom:14px"></div>' +
        formulario('f-cli', `${icon('plus')} Registrar cliente`, [
          { n: 'cod', l: 'Código del cliente', v: sigCli },
          { n: 'nombre', l: 'Nombre o razón social', ph: 'Ej. Farmacias del Sur S.A.' },
          { n: 'nit', l: 'NIT', ph: 'Ej. 9876543-2' },
          { n: 'tipo', l: 'Tipo', o: ['DISTRIBUIDOR', 'FARMACIA', 'HOSPITAL', 'CLINICA', 'OTRO'].map(t => [t, t]) },
          { n: 'limite', l: 'Límite de crédito inicial (Q)', t: 'number', step: '0.01', min: 0, v: 500000 },
        ], 'Guardar cliente', true, false) +
      '</div>' +
      '<div>' +
        '<h2>Bodegas</h2>' +
        filtro('q-bod', 'Buscar bodega o ubicación…') +
        '<div id="t-bod" style="margin-bottom:14px"></div>' +
        formulario('f-bod', `${icon('plus')} Registrar bodega`, [
          { n: 'nombre', l: 'Nombre de la bodega', ph: 'Ej. Bodega Regional Occidente' },
          { n: 'ubicacion', l: 'Ubicación física', ph: 'Ej. Quetzaltenango, Zona 3' },
          { n: 'tipo', l: 'Tipo de bodega', o: tiposBodega },
        ], 'Guardar bodega', true, false) +
      '</div>' +
    '</div>';

  filtrar(el, '#q-cli', cl, filas => {
    el.querySelector('#t-cli').innerHTML = table(filas, [
      ['id_clienteb2b', 'ID'],
      ['cod_clienteb2b', 'Código'],
      ['nombre', 'Nombre'],
      ['nit', 'NIT'],
      ['tipo_cliente', 'Tipo', badge],
      ['limite_credito', 'Límite crédito', n],
      ['credito_disponible', 'Disponible', n],
    ]);
  });

  filtrar(el, '#q-bod', bo, filas => {
    el.querySelector('#t-bod').innerHTML = table(filas, [
      ['id_bodega', 'ID'],
      ['nombre', 'Nombre'],
      ['ubicacion', 'Ubicación'],
      ['tipo', 'Tipo', badge],
    ]);
  });

  enlazar(el, 'f-cli', 'cliente_nuevo', recargar);
  enlazar(el, 'f-bod', 'bodega_nueva', recargar);
}
