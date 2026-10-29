// Respaldo fiel de los scripts sql/01..09 para garantizar disponibilidad si oracleapex.com presenta mantenimiento temporal (fw_error_www).
const addDays = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

const BASE_DIAS = [25, 50, 80, 140, 200, 300];

function crearEstadoInicial() {
  const bodegas = [
    { id_bodega: 1, nombre: 'Bodega Central Guatemala', ubicacion: 'Zona 12, Ciudad de Guatemala', tipo: 'PRINCIPAL' },
    { id_bodega: 2, nombre: 'Centro Logistico Mexico', ubicacion: 'Toluca, Estado de Mexico', tipo: 'DISTRIBUCION' },
    { id_bodega: 3, nombre: 'Bodega de Frios', ubicacion: 'Zona 13, Aeropuerto Guatemala', tipo: 'FRIO' },
  ];

  const clientes = [
    { id_clienteb2b: 1, cod_clienteb2b: 'CLI-001', nombre: 'Cadenas de Farmacias Batres', nit: '1234567-8', tipo_cliente: 'FARMACIA', limite_credito: 6000000, saldo_utilizado: 412580.40 },
    { id_clienteb2b: 2, cod_clienteb2b: 'CLI-002', nombre: 'Ministerio de Salud Publica', nit: '8765432-1', tipo_cliente: 'HOSPITAL', limite_credito: 8000000, saldo_utilizado: 685420.00 },
    { id_clienteb2b: 3, cod_clienteb2b: 'CLI-003', nombre: 'Hospitales Privados de Guatemala', nit: '4567890-2', tipo_cliente: 'CLINICA', limite_credito: 7000000, saldo_utilizado: 528910.20 },
    { id_clienteb2b: 4, cod_clienteb2b: 'CLI-004', nombre: 'Mayorista Internacional Centroamerica', nit: '2468135-7', tipo_cliente: 'DISTRIBUIDOR', limite_credito: 10000, saldo_utilizado: 0 },
  ];

  const rawProductos = [
    ['BAY-001', 'Aspirina 500 mg x100 tabletas', 'OTC', 'N', 85.00],
    ['BAY-002', 'Aspirina Protect 100 mg x28', 'OTC', 'N', 62.00],
    ['BAY-003', 'Alka-Seltzer x20 sobres', 'OTC', 'N', 48.00],
    ['BAY-004', 'Aleve 220 mg x24 tabletas', 'OTC', 'N', 55.00],
    ['BAY-005', 'Bepanthen crema 30 g', 'OTC', 'N', 72.00],
    ['BAY-006', 'Canesten crema 20 g', 'OTC', 'N', 68.00],
    ['BAY-007', 'Berocca Performance x30', 'OTC', 'N', 140.00],
    ['BAY-008', 'Redoxon Vitamina C x30', 'OTC', 'N', 95.00],
    ['BAY-009', 'Xarelto 10 mg x30 tabletas', 'ETICO', 'N', 620.00],
    ['BAY-010', 'Xarelto 20 mg x28 tabletas', 'ETICO', 'N', 640.00],
    ['BAY-011', 'Glucobay 50 mg x30 tabletas', 'ETICO', 'N', 210.00],
    ['BAY-012', 'Glucobay 100 mg x30 tabletas', 'ETICO', 'N', 340.00],
    ['BAY-013', 'Adalat Oros 30 mg x28', 'ETICO', 'N', 260.00],
    ['BAY-014', 'Ciprobay 500 mg x10 tabletas', 'ETICO', 'N', 180.00],
    ['BAY-015', 'Avelox 400 mg x5 tabletas', 'ETICO', 'N', 230.00],
    ['BAY-016', 'Nimotop 30 mg x30 tabletas', 'ETICO', 'N', 300.00],
    ['BAY-017', 'Levitra 20 mg x4 tabletas', 'ETICO', 'N', 310.00],
    ['BAY-018', 'Adempas 2.5 mg x42 tabletas', 'ETICO', 'N', 2800.00],
    ['BAY-019', 'Kerendia 20 mg x28 tabletas', 'ETICO', 'N', 900.00],
    ['BAY-020', 'Nexavar 200 mg x112 tabletas', 'ETICO', 'N', 4800.00],
    ['BAY-021', 'Eylea jeringa prellenada (frio)', 'ETICO', 'S', 3200.00],
    ['BAY-022', 'Kovaltry 500 UI vial (frio)', 'ETICO', 'S', 1800.00],
    ['BAY-023', 'Betaferon 250 mcg x15 (frio)', 'ETICO', 'S', 2400.00],
  ];

  const productos = rawProductos.map((p, i) => ({
    id_producto: i + 1,
    cod_producto: p[0],
    nombre: p[1],
    linea: p[2],
    cadena_frio: p[3],
    estado: 'ACTIVO',
    precio_unitario: p[4],
  }));

  const lotes = [];
  const inventario = [];
  const trazabilidad = [];
  const calidad = [];
  let idLote = 1, idInv = 1, idTraz = 1, idCal = 1;

  productos.forEach((p, idx) => {
    const rn = idx + 1;
    for (let k = 1; k <= 3; k++) {
      let dias = k === 1 ? BASE_DIAS[rn % 6] : k === 2 ? BASE_DIAS[rn % 6] + 180 + (rn % 4) * 30 : 540 + (rn % 3) * 60;
      const num = `LT-${String(rn).padStart(2, '0')}-${String.fromCharCode(64 + k)}`;
      let estado = 'APROBADO';
      if (k === 3 && [5, 11, 16, 20].includes(rn)) estado = 'PENDIENTE';
      else if (k === 2 && rn === 13) estado = 'RECHAZADO';
      else if (k === 1 && [9, 21].includes(rn)) estado = 'BLOQUEADO';

      const fab = addDays(dias - 1095);
      const cad = addDays(dias);
      const loteObj = {
        id_lote: idLote++,
        numero_lote: num,
        id_producto: p.id_producto,
        cod_producto: p.cod_producto,
        producto: p.nombre,
        fecha_fabricacion: fab,
        fecha_caducidad: cad,
        estado_lote: estado,
      };
      lotes.push(loteObj);

      if (p.cadena_frio === 'S') {
        const s1 = k === 1 ? 60 : k === 2 ? 300 : 500;
        inventario.push({
          id_inventario: idInv++, id_bodega: 3, id_lote: loteObj.id_lote,
          stock: s1, reservas: k === 1 ? 6 : 0,
        });
        trazabilidad.push({
          id_trazabilidad: idTraz++, id_lote: loteObj.id_lote,
          tipo_movimiento: 'ENTRADA', fecha_movimiento: fab, cantidad: s1,
          referencia: `PLANTA-${num}`, id_bodega_origen: null, id_bodega_destino: 3,
        });
      } else {
        const s1 = k === 1 ? 400 + ((rn * 97) % 600) : 3000;
        const s2 = k === 1 ? 300 : k === 2 ? 1500 : 0;
        inventario.push({
          id_inventario: idInv++, id_bodega: 1, id_lote: loteObj.id_lote,
          stock: s1, reservas: k === 1 && estado === 'APROBADO' ? 40 : 0,
        });
        trazabilidad.push({
          id_trazabilidad: idTraz++, id_lote: loteObj.id_lote,
          tipo_movimiento: 'ENTRADA', fecha_movimiento: fab, cantidad: s1 + s2,
          referencia: `PLANTA-${num}`, id_bodega_origen: null, id_bodega_destino: 1,
        });
        if (s2 > 0) {
          inventario.push({
            id_inventario: idInv++, id_bodega: 2, id_lote: loteObj.id_lote,
            stock: s2, reservas: 0,
          });
          trazabilidad.push({
            id_trazabilidad: idTraz++, id_lote: loteObj.id_lote,
            tipo_movimiento: 'TRANSFERENCIA', fecha_movimiento: fab, cantidad: s2,
            referencia: `TRASLADO-${num}`, id_bodega_origen: 1, id_bodega_destino: 2,
          });
        }
      }

      calidad.push({
        id_control_calidad: idCal++,
        id_lote: loteObj.id_lote,
        fecha_inspeccion: fab,
        resultado: estado === 'RECHAZADO' || estado === 'BLOQUEADO' ? 'RECHAZADO' : estado === 'PENDIENTE' ? 'PENDIENTE' : 'APROBADO',
        representante: estado === 'BLOQUEADO' ? 'Control de Calidad Bayer' : 'QA Planta Guatemala',
        observaciones: estado === 'BLOQUEADO'
          ? (rn === 9 ? 'Desviacion tecnica detectada en inspeccion posterior (Xarelto 10 mg)' : 'Falla en la cadena de frio durante el transporte (Eylea)')
          : estado === 'RECHAZADO' ? 'Desviacion en pureza del principio activo'
          : estado === 'PENDIENTE' ? 'Lote en inspeccion, muestras en laboratorio' : 'Inspeccion inicial conforme',
      });
    }
  });

  // Lotes vencidos de control (04_datos_base.sql)
  [
    { cod: 'BAY-006', num: 'LT-06-X', dias: -15, stock: 400 },
    { cod: 'BAY-002', num: 'LT-02-X', dias: -40, stock: 250 },
  ].forEach(x => {
    const p = productos.find(pr => pr.cod_producto === x.cod);
    const l = {
      id_lote: idLote++, numero_lote: x.num, id_producto: p.id_producto,
      cod_producto: p.cod_producto, producto: p.nombre,
      fecha_fabricacion: addDays(x.dias - 1095), fecha_caducidad: addDays(x.dias),
      estado_lote: 'VENCIDO',
    };
    lotes.push(l);
    inventario.push({ id_inventario: idInv++, id_bodega: 1, id_lote: l.id_lote, stock: x.stock, reservas: 0 });
  });

  // Ordenes corporativas de muestra (incluyendo lotes LT-09-A y LT-21-A para recall)
  const ordenes = [
    { id_orden: 1, numero_orden: 'ORD-20260910-000001', fecha_orden: addDays(-45), estado: 'ENTREGADA', id_clienteb2b: 1, descuento: 0, impuesto: 12, comision_pct: 2 },
    { id_orden: 2, numero_orden: 'ORD-20260925-000002', fecha_orden: addDays(-30), estado: 'ENTREGADA', id_clienteb2b: 2, descuento: 0, impuesto: 12, comision_pct: 2 },
    { id_orden: 3, numero_orden: 'ORD-20261005-000003', fecha_orden: addDays(-20), estado: 'DESPACHADA', id_clienteb2b: 3, descuento: 1275.00, impuesto: 12, comision_pct: 2 },
    { id_orden: 4, numero_orden: 'ORD-20261015-000004', fecha_orden: addDays(-12), estado: 'CONFIRMADA', id_clienteb2b: 1, descuento: 0, impuesto: 12, comision_pct: 2 },
    { id_orden: 5, numero_orden: 'ORD-20261022-000005', fecha_orden: addDays(-5), estado: 'CONFIRMADA', id_clienteb2b: 2, descuento: 1440.00, impuesto: 12, comision_pct: 2 },
  ];

  const l09 = lotes.find(l => l.numero_lote === 'LT-09-A');
  const l21 = lotes.find(l => l.numero_lote === 'LT-21-A');
  const l01 = lotes.find(l => l.numero_lote === 'LT-01-A');
  const l08 = lotes.find(l => l.numero_lote === 'LT-08-A');
  const l03 = lotes.find(l => l.numero_lote === 'LT-03-A');

  const detalle_ordenes = [
    { id_det_orden: 1, id_orden: 1, id_lote: l09.id_lote, cantidad_solicitada: 45, precio_unitario: 620 },
    { id_det_orden: 2, id_orden: 2, id_lote: l21.id_lote, cantidad_solicitada: 12, precio_unitario: 3200 },
    { id_det_orden: 3, id_orden: 3, id_lote: l01.id_lote, cantidad_solicitada: 500, precio_unitario: 85 },
    { id_det_orden: 4, id_orden: 4, id_lote: l08.id_lote, cantidad_solicitada: 120, precio_unitario: 95 },
    { id_det_orden: 5, id_orden: 5, id_lote: l03.id_lote, cantidad_solicitada: 600, precio_unitario: 48 },
  ];

  const despachos = [
    { id_despacho: 1, id_orden: 1, id_bodega: 1, numero_guia: 'GUIA-00000001', fecha_despacho: addDays(-44), estado_despacho: 'ENTREGADO' },
    { id_despacho: 2, id_orden: 2, id_bodega: 3, numero_guia: 'GUIA-00000002', fecha_despacho: addDays(-29), estado_despacho: 'ENTREGADO' },
    { id_despacho: 3, id_orden: 3, id_bodega: 1, numero_guia: 'GUIA-00000003', fecha_despacho: addDays(-19), estado_despacho: 'EN_TRANSITO' },
    { id_despacho: 4, id_orden: 4, id_bodega: 1, numero_guia: null, fecha_despacho: addDays(-12), estado_despacho: 'PENDIENTE' },
    { id_despacho: 5, id_orden: 5, id_bodega: 1, numero_guia: null, fecha_despacho: addDays(-5), estado_despacho: 'PENDIENTE' },
  ];

  return { bodegas, clientes, productos, lotes, inventario, trazabilidad, calidad, ordenes, detalle_ordenes, despachos };
}

const DB = crearEstadoInicial();

export function leerRespaldo(ruta) {
  if (ruta.startsWith('recall/')) {
    const numLote = decodeURIComponent(ruta.slice(7));
    const l = DB.lotes.find(x => x.numero_lote === numLote);
    if (!l) return [];
    const p = DB.productos.find(x => x.id_producto === l.id_producto);
    return DB.detalle_ordenes
      .filter(d => d.id_lote === l.id_lote)
      .map(d => {
        const o = DB.ordenes.find(x => x.id_orden === d.id_orden);
        const c = DB.clientes.find(x => x.id_clienteb2b === o.id_clienteb2b);
        const de = DB.despachos.find(x => x.id_orden === o.id_orden);
        return {
          numero_lote: l.numero_lote,
          estado_lote: l.estado_lote,
          producto: p.nombre,
          fecha_fabricacion: l.fecha_fabricacion,
          fecha_caducidad: l.fecha_caducidad,
          cliente_institucional: c.nombre,
          nit: c.nit,
          numero_orden: o.numero_orden,
          fecha_orden: o.fecha_orden,
          cantidad: d.cantidad_solicitada,
          numero_guia: de?.numero_guia || null,
          estado_despacho: de?.estado_despacho || 'PENDIENTE',
          fecha_despacho: de?.fecha_despacho || null,
        };
      });
  }

  switch (ruta) {
    case 'productos':
      return [...DB.productos].sort((a, b) => a.nombre.localeCompare(b.nombre));
    case 'clientes':
      return DB.clientes.map(c => ({
        ...c,
        credito_disponible: +(c.limite_credito - c.saldo_utilizado).toFixed(2),
      }));
    case 'bodegas':
      return [...DB.bodegas];
    case 'lotes':
      return DB.lotes.map(l => {
        const p = DB.productos.find(x => x.id_producto === l.id_producto);
        return { ...l, cod_producto: p?.cod_producto || '', producto: p?.nombre || '' };
      });
    case 'inventario':
      return DB.inventario.map(i => {
        const b = DB.bodegas.find(x => x.id_bodega === i.id_bodega);
        const l = DB.lotes.find(x => x.id_lote === i.id_lote);
        const p = DB.productos.find(x => x.id_producto === l.id_producto);
        return {
          id_inventario: i.id_inventario,
          bodega: b.nombre,
          ubicacion: b.ubicacion,
          numero_lote: l.numero_lote,
          estado_lote: l.estado_lote,
          fecha_caducidad: l.fecha_caducidad,
          producto: p.nombre,
          stock: i.stock,
          reservas: i.reservas,
          disponible: i.stock - i.reservas,
        };
      });
    case 'vencimientos': {
      const hoyMs = new Date(new Date().toISOString().slice(0, 10)).getTime();
      return DB.inventario
        .map(i => {
          const b = DB.bodegas.find(x => x.id_bodega === i.id_bodega);
          const l = DB.lotes.find(x => x.id_lote === i.id_lote);
          const p = DB.productos.find(x => x.id_producto === l.id_producto);
          const dias = Math.round((new Date(l.fecha_caducidad).getTime() - hoyMs) / 86400000);
          const ventana = dias < 0 ? 'VENCIDO' : dias <= 30 ? '30 DIAS (CRITICO)' : dias <= 60 ? '60 DIAS (ALTO)' : dias <= 90 ? '90 DIAS (MEDIO)' : '180 DIAS (BAJO)';
          return {
            centro_distribucion: b.nombre,
            producto: p.nombre,
            numero_lote: l.numero_lote,
            estado_lote: l.estado_lote,
            fecha_caducidad: l.fecha_caducidad,
            dias_para_vencer: dias,
            stock_fisico: i.stock,
            stock_disponible: i.stock - i.reservas,
            ventana_vencimiento: ventana,
          };
        })
        .filter(r => r.dias_para_vencer <= 180 && ['APROBADO', 'VENCIDO'].includes(r.estado_lote) && r.stock_fisico > 0)
        .sort((a, b) => a.dias_para_vencer - b.dias_para_vencer);
    }
    case 'calidad':
      return DB.calidad
        .map(cc => {
          const l = DB.lotes.find(x => x.id_lote === cc.id_lote);
          const p = DB.productos.find(x => x.id_producto === l.id_producto);
          return { ...cc, numero_lote: l.numero_lote, producto: p.nombre };
        })
        .sort((a, b) => b.id_control_calidad - a.id_control_calidad);
    case 'trazabilidad':
      return DB.trazabilidad
        .map(t => {
          const l = DB.lotes.find(x => x.id_lote === t.id_lote);
          const p = DB.productos.find(x => x.id_producto === l.id_producto);
          const bo = DB.bodegas.find(x => x.id_bodega === t.id_bodega_origen);
          const bd = DB.bodegas.find(x => x.id_bodega === t.id_bodega_destino);
          return {
            id_trazabilidad: t.id_trazabilidad,
            numero_lote: l.numero_lote,
            producto: p.nombre,
            tipo_movimiento: t.tipo_movimiento,
            fecha_movimiento: t.fecha_movimiento,
            cantidad: t.cantidad,
            referencia: t.referencia,
            bodega_origen: bo?.nombre || null,
            bodega_destino: bd?.nombre || null,
          };
        })
        .sort((a, b) => b.id_trazabilidad - a.id_trazabilidad);
    case 'ordenes':
      return DB.ordenes
        .map(o => {
          const c = DB.clientes.find(x => x.id_clienteb2b === o.id_clienteb2b);
          return { ...o, cod_clienteb2b: c.cod_clienteb2b, cliente: c.nombre };
        })
        .sort((a, b) => b.id_orden - a.id_orden);
    case 'detalle_ordenes':
      return DB.detalle_ordenes
        .map(d => {
          const o = DB.ordenes.find(x => x.id_orden === d.id_orden);
          const c = DB.clientes.find(x => x.id_clienteb2b === o.id_clienteb2b);
          const l = DB.lotes.find(x => x.id_lote === d.id_lote);
          const p = DB.productos.find(x => x.id_producto === l.id_producto);
          return {
            numero_orden: o.numero_orden,
            cliente: c.nombre,
            producto: p.nombre,
            numero_lote: l.numero_lote,
            cantidad_solicitada: d.cantidad_solicitada,
            precio_unitario: d.precio_unitario,
            subtotal: +(d.cantidad_solicitada * d.precio_unitario).toFixed(2),
          };
        })
        .reverse();
    case 'despachos':
      return DB.despachos
        .map(de => {
          const b = DB.bodegas.find(x => x.id_bodega === de.id_bodega);
          const o = DB.ordenes.find(x => x.id_orden === de.id_orden);
          const c = DB.clientes.find(x => x.id_clienteb2b === o.id_clienteb2b);
          return {
            id_despacho: de.id_despacho,
            numero_guia: de.numero_guia,
            fecha_despacho: de.fecha_despacho,
            estado_despacho: de.estado_despacho,
            bodega_origen: b.nombre,
            numero_orden: o.numero_orden,
            cliente: c.nombre,
          };
        })
        .sort((a, b) => b.id_despacho - a.id_despacho);
    case 'conciliacion':
      return DB.ordenes.map(o => {
        const c = DB.clientes.find(x => x.id_clienteb2b === o.id_clienteb2b);
        const dets = DB.detalle_ordenes.filter(d => d.id_orden === o.id_orden);
        const bruto = dets.reduce((a, d) => a + d.cantidad_solicitada * d.precio_unitario, 0);
        const neto = bruto - o.descuento;
        const imp = +(neto * (o.impuesto / 100)).toFixed(2);
        const com = +(neto * (o.comision_pct / 100)).toFixed(2);
        const total = +(neto * (1 + (o.impuesto + o.comision_pct) / 100)).toFixed(2);
        return {
          numero_orden: o.numero_orden,
          fecha_orden: o.fecha_orden,
          estado: o.estado,
          cliente: c.nombre,
          valor_bruto: bruto,
          descuento: o.descuento,
          valor_neto: neto,
          monto_impuesto: imp,
          comision_distribucion: com,
          total_orden: total,
          limite_credito: c.limite_credito,
          saldo_utilizado: c.saldo_utilizado,
          credito_disponible: +(c.limite_credito - c.saldo_utilizado).toFixed(2),
        };
      });
    case 'resumen_ordenes': {
      const m = {};
      DB.ordenes.forEach(o => { m[o.estado] = (m[o.estado] || 0) + 1; });
      return Object.entries(m).map(([estado, total_ordenes]) => ({ estado, total_ordenes }));
    }
    case 'ventas':
      return [
        { mes: '2026-06-01', producto: 'Xarelto 10 mg x30 tabletas', linea: 'ETICO', unidades: 140, venta_bruta: 86800 },
        { mes: '2026-07-01', producto: 'Eylea jeringa prellenada (frio)', linea: 'ETICO', unidades: 35, venta_bruta: 112000 },
        { mes: '2026-08-01', producto: 'Aspirina 500 mg x100 tabletas', linea: 'OTC', unidades: 1200, venta_bruta: 102000 },
        { mes: '2026-09-01', producto: 'Nexavar 200 mg x112 tabletas', linea: 'ETICO', unidades: 28, venta_bruta: 134400 },
        { mes: '2026-10-01', producto: 'Kovaltry 500 UI vial (frio)', linea: 'ETICO', unidades: 85, venta_bruta: 153000 },
      ];
    case 'top_productos': {
      const m = {};
      DB.detalle_ordenes.forEach(d => {
        const l = DB.lotes.find(x => x.id_lote === d.id_lote);
        m[l.id_producto] = (m[l.id_producto] || 0) + d.cantidad_solicitada;
      });
      return Object.entries(m)
        .map(([id, u]) => {
          const p = DB.productos.find(x => x.id_producto == id);
          return { id_producto: p.id_producto, cod_producto: p.cod_producto, producto: p.nombre, unidades_solicitadas: u };
        })
        .sort((a, b) => b.unidades_solicitadas - a.unidades_solicitadas)
        .slice(0, 10);
    }
    default:
      return [];
  }
}

export function escribirRespaldo(ruta, datos) {
  switch (ruta) {
    case 'producto_nuevo': {
      if (DB.productos.some(p => p.cod_producto.toUpperCase() === String(datos.cod).toUpperCase())) {
        return { ok: 0, mensaje: 'ORA-00001: Ya existe un producto con ese código.' };
      }
      const id = DB.productos.length + 1;
      DB.productos.push({
        id_producto: id,
        cod_producto: datos.cod,
        nombre: datos.nombre,
        linea: datos.linea || 'OTC',
        cadena_frio: datos.cadena_frio || 'N',
        estado: 'ACTIVO',
        precio_unitario: Number(datos.precio),
      });
      return { ok: 1, mensaje: 'Producto registrado correctamente.' };
    }
    case 'producto_editar': {
      const p = DB.productos.find(x => x.id_producto == datos.id_producto);
      if (!p) return { ok: 0, mensaje: 'Producto no encontrado.' };
      p.estado = datos.estado;
      p.precio_unitario = Number(datos.precio);
      return { ok: 1, mensaje: 'Producto actualizado correctamente.' };
    }
    case 'cliente_nuevo': {
      const id = DB.clientes.length + 1;
      DB.clientes.push({
        id_clienteb2b: id,
        cod_clienteb2b: datos.cod,
        nombre: datos.nombre,
        nit: datos.nit,
        tipo_cliente: datos.tipo,
        limite_credito: Number(datos.limite || 0),
        saldo_utilizado: 0,
      });
      return { ok: 1, mensaje: 'Cliente y línea de crédito registrados correctamente.' };
    }
    case 'bodega_nueva': {
      const id = DB.bodegas.length + 1;
      DB.bodegas.push({ id_bodega: id, nombre: datos.nombre, ubicacion: datos.ubicacion, tipo: datos.tipo });
      return { ok: 1, mensaje: 'Bodega registrada correctamente.' };
    }
    case 'lote_nuevo': {
      if (datos.cad <= datos.fab) {
        return { ok: 0, mensaje: 'ORA-02290: La fecha de caducidad debe ser posterior a la de fabricación.' };
      }
      const p = DB.productos.find(x => x.id_producto == datos.id_producto);
      const id = DB.lotes.length + 1;
      DB.lotes.push({
        id_lote: id,
        numero_lote: datos.numero,
        id_producto: Number(datos.id_producto),
        cod_producto: p?.cod_producto || '',
        producto: p?.nombre || '',
        fecha_fabricacion: datos.fab,
        fecha_caducidad: datos.cad,
        estado_lote: datos.estado || 'PENDIENTE',
      });
      return { ok: 1, mensaje: 'Lote registrado correctamente.' };
    }
    case 'inspeccion_nueva': {
      const l = DB.lotes.find(x => x.id_lote == datos.id_lote);
      if (!l) return { ok: 0, mensaje: 'Lote no encontrado.' };
      DB.calidad.push({
        id_control_calidad: DB.calidad.length + 1,
        id_lote: l.id_lote,
        fecha_inspeccion: addDays(0),
        resultado: datos.resultado,
        representante: datos.representante || 'Control de Calidad Bayer',
        observaciones: datos.observaciones || '',
      });
      if (['APROBADO', 'RECHAZADO'].includes(datos.resultado)) {
        l.estado_lote = datos.resultado;
      }
      return { ok: 1, mensaje: 'Inspección registrada y estado del lote actualizado.' };
    }
    case 'inventario_nuevo': {
      const ex = DB.inventario.find(i => i.id_lote == datos.id_lote && i.id_bodega == datos.id_bodega);
      if (ex) {
        ex.stock += Number(datos.stock);
        return { ok: 1, mensaje: 'Existencia sumada al inventario del lote en la bodega.' };
      }
      DB.inventario.push({
        id_inventario: DB.inventario.length + 1,
        id_lote: Number(datos.id_lote),
        id_bodega: Number(datos.id_bodega),
        stock: Number(datos.stock),
        reservas: 0,
      });
      return { ok: 1, mensaje: 'Existencia inicial guardada correctamente.' };
    }
    case 'bloquear_lote': {
      const l = DB.lotes.find(x => x.numero_lote === datos.lote);
      if (!l) return { mensaje: `Lote no encontrado: ${datos.lote}` };
      l.estado_lote = 'BLOQUEADO';
      DB.calidad.push({
        id_control_calidad: DB.calidad.length + 1,
        id_lote: l.id_lote,
        fecha_inspeccion: addDays(0),
        resultado: 'RECHAZADO',
        representante: 'Control de Calidad Bayer',
        observaciones: datos.motivo || 'Bloqueo manual desde la web',
      });
      return { mensaje: `Lote ${datos.lote} BLOQUEADO por Calidad: ${datos.motivo}` };
    }
    case 'checkout': {
      const c = DB.clientes.find(x => x.id_clienteb2b == datos.id_cliente);
      const p = DB.productos.find(x => x.id_producto == datos.id_producto && x.estado === 'ACTIVO');
      const cant = Number(datos.cantidad);
      if (!c || !p || cant <= 0) {
        return { id_orden: 0, mensaje: 'Transaccion Revertida (ROLLBACK): datos inválidos.' };
      }
      if (datos.simular_fallo) {
        return { id_orden: 0, mensaje: 'Transaccion Revertida (ROLLBACK): ORA-20098: FALLA SIMULADA: error con el credito ya descontado, antes del COMMIT.' };
      }
      const bruto = cant * p.precio_unitario;
      const pctDesc = cant >= 5000 ? 8 : cant >= 1000 ? 5 : cant >= 500 ? 3 : 0;
      const desc = +(bruto * pctDesc / 100).toFixed(2);
      const neto = bruto - desc;
      const total = +(neto * 1.14).toFixed(2);
      if (c.limite_credito - c.saldo_utilizado < total) {
        return { id_orden: 0, mensaje: 'Transaccion Revertida (ROLLBACK): ORA-20001: Credito insuficiente para procesar la orden B2B.' };
      }
      const hoyStr = addDays(0);
      const candidatos = DB.inventario
        .map(inv => ({ inv, lote: DB.lotes.find(l => l.id_lote === inv.id_lote) }))
        .filter(x => x.lote.id_producto === p.id_producto && x.inv.id_bodega == datos.id_bodega && x.lote.estado_lote === 'APROBADO' && x.lote.fecha_caducidad > hoyStr && (x.inv.stock - x.inv.reservas) > 0)
        .sort((a, b) => a.lote.fecha_caducidad.localeCompare(b.lote.fecha_caducidad));

      const dispTotal = candidatos.reduce((a, x) => a + (x.inv.stock - x.inv.reservas), 0);
      if (dispTotal < cant) {
        return { id_orden: 0, mensaje: 'Transaccion Revertida (ROLLBACK): ORA-20002: Stock insuficiente en lotes APROBADOS para cubrir el pedido.' };
      }

      let pend = cant;
      const idOrd = DB.ordenes.length + 1;
      const numOrd = `ORD-${hoyStr.replace(/-/g, '')}-${String(idOrd).padStart(6, '0')}`;
      DB.ordenes.push({ id_orden: idOrd, numero_orden: numOrd, fecha_orden: hoyStr, estado: 'CONFIRMADA', id_clienteb2b: c.id_clienteb2b, descuento: desc, impuesto: 12, comision_pct: 2 });
      DB.despachos.push({ id_despacho: DB.despachos.length + 1, id_orden: idOrd, id_bodega: Number(datos.id_bodega), numero_guia: null, fecha_despacho: hoyStr, estado_despacho: 'PENDIENTE' });

      for (const { inv, lote } of candidatos) {
        if (pend <= 0) break;
        const tomar = Math.min(inv.stock - inv.reservas, pend);
        inv.reservas += tomar;
        DB.detalle_ordenes.push({ id_det_orden: DB.detalle_ordenes.length + 1, id_orden: idOrd, id_lote: lote.id_lote, cantidad_solicitada: tomar, precio_unitario: p.precio_unitario });
        pend -= tomar;
      }
      c.saldo_utilizado = +(c.saldo_utilizado + total).toFixed(2);
      return { id_orden: idOrd, mensaje: `Orden confirmada exitosamente bajo estandar FEFO. Total: ${total.toLocaleString('es-GT', { minimumFractionDigits: 2 })}` };
    }
    default:
      return { ok: 1, mensaje: 'Operación completada.' };
  }
}

