import { Modelo } from '../models/api.js';
import { table, n, formulario } from '../views/ui.js';
import { enlazar } from './base.js';

export default async function (el, recargar) {
  const [cl, bo] = await Promise.all([Modelo.clientes(), Modelo.bodegas()]);
  const tipos = ['PRINCIPAL', 'DISTRIBUCION', 'FRIO', 'CUARENTENA', 'OTRA'].map(t => [t, t]);
  el.innerHTML = '<div class="two"><div><h2>Clientes B2B</h2>' +
    table(cl, [['cod_clienteb2b', 'Código'], ['nombre', 'Nombre'], ['nit', 'NIT'], ['tipo_cliente', 'Tipo'], ['limite_credito', 'Límite', n]]) +
    formulario('f-cli', 'Registrar cliente (con línea de crédito)', [{ n: 'cod', l: 'Código' }, { n: 'nombre', l: 'Nombre' }, { n: 'nit', l: 'NIT' },
      { n: 'tipo', l: 'Tipo', o: ['DISTRIBUIDOR', 'FARMACIA', 'HOSPITAL', 'CLINICA', 'OTRO'].map(t => [t, t]) },
      { n: 'limite', l: 'Límite de crédito', t: 'number', step: '0.01', min: 0, v: 50000 }]) +
    '</div><div><h2>Bodegas</h2>' + table(bo, [['nombre', 'Nombre'], ['ubicacion', 'Ubicación'], ['tipo', 'Tipo']]) +
    formulario('f-bod', 'Registrar bodega', [{ n: 'nombre', l: 'Nombre' }, { n: 'ubicacion', l: 'Ubicación' }, { n: 'tipo', l: 'Tipo', o: tipos }]) + '</div></div>';
  enlazar(el, 'f-cli', 'cliente_nuevo', recargar);
  enlazar(el, 'f-bod', 'bodega_nueva', recargar);
}
