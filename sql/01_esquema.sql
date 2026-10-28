-- ============================================================
-- PROYECTO: LABORATORIO BAYER, INC.
-- MOTOR: ORACLE DATABASE (12c o superior; probado el diseno para 23ai Free / 21c XE)
-- MODELO NORMALIZADO: 3FN
-- EJECUTAR EN ORACLE APEX: SQL Workshop > SQL Scripts (oracleapex.com)
--
-- CAMBIOS RESPECTO AL ESQUEMA ORIGINAL (para cumplir el PDF):
--   producto.linea            -> lineas OTC / ETICO (planteamiento del caso)
--   producto.cadena_frio      -> productos que requieren cadena de frio
--   bodega.tipo = 'FRIO'      -> Bodega de Frios
--   control_calidad.observaciones -> motivo de retencion/bloqueo del lote
--   despacho.id_bodega        -> bodega desde la que sale el despacho
--   ordenb2b.comision_pct     -> comision de distribucion (RF-05)
--   ordenb2b.descuento        -> ahora es MONTO (descuento por volumen)
--   seq_numero_orden          -> numeracion unica de ordenes (evita colisiones
--                                cuando dos sesiones compran en el mismo segundo)
-- ============================================================


-- ============================================================
-- 0. LIMPIEZA DEL PROYECTO
-- ADVERTENCIA: ELIMINA LOS DATOS DE ESTAS TABLAS SI EXISTEN.
-- ============================================================

BEGIN
    FOR t IN (
        SELECT 'DESPACHO_DETALLE' nombre FROM dual UNION ALL
        SELECT 'DET_ORDEN' FROM dual UNION ALL
        SELECT 'DESPACHO' FROM dual UNION ALL
        SELECT 'TRAZABILIDAD' FROM dual UNION ALL
        SELECT 'INVENTARIO' FROM dual UNION ALL
        SELECT 'CONTROL_CALIDAD' FROM dual UNION ALL
        SELECT 'CREDITO_CLIENTE' FROM dual UNION ALL
        SELECT 'LOTE' FROM dual UNION ALL
        SELECT 'ORDENB2B' FROM dual UNION ALL
        SELECT 'PRODUCTO' FROM dual UNION ALL
        SELECT 'CLIENTE_B2B' FROM dual UNION ALL
        SELECT 'BODEGA' FROM dual
    ) LOOP
        BEGIN
            EXECUTE IMMEDIATE
                'DROP TABLE ' || t.nombre ||
                ' CASCADE CONSTRAINTS PURGE';
        EXCEPTION
            WHEN OTHERS THEN
                IF SQLCODE != -942 THEN
                    RAISE;
                END IF;
        END;
    END LOOP;
END;
/

BEGIN
    EXECUTE IMMEDIATE 'DROP SEQUENCE seq_numero_orden';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -2289 THEN
            RAISE;
        END IF;
END;
/

CREATE SEQUENCE seq_numero_orden START WITH 1 INCREMENT BY 1 NOCACHE;


-- ============================================================
-- 1. PRODUCTO
-- ============================================================

CREATE TABLE producto (
    id_producto NUMBER(19)
        GENERATED ALWAYS AS IDENTITY,
    cod_producto VARCHAR2(30) NOT NULL,
    nombre VARCHAR2(150) NOT NULL,
    linea VARCHAR2(10) DEFAULT 'OTC' NOT NULL,
    cadena_frio CHAR(1) DEFAULT 'N' NOT NULL,
    estado VARCHAR2(15) DEFAULT 'ACTIVO' NOT NULL,
    precio_unitario NUMBER(12,2) NOT NULL,

    CONSTRAINT pk_producto PRIMARY KEY (id_producto),
    CONSTRAINT uq_producto_codigo UNIQUE (cod_producto),
    CONSTRAINT ck_producto_linea
        CHECK (linea IN ('OTC', 'ETICO')),
    CONSTRAINT ck_producto_frio
        CHECK (cadena_frio IN ('S', 'N')),
    CONSTRAINT ck_producto_estado
        CHECK (estado IN ('ACTIVO', 'INACTIVO')),
    CONSTRAINT ck_producto_precio
        CHECK (precio_unitario >= 0)
);


-- ============================================================
-- 2. CLIENTE B2B
-- ============================================================

CREATE TABLE cliente_b2b (
    id_clienteb2b NUMBER(19)
        GENERATED ALWAYS AS IDENTITY,
    cod_clienteb2b VARCHAR2(30) NOT NULL,
    nombre VARCHAR2(150) NOT NULL,
    nit VARCHAR2(20) NOT NULL,
    tipo_cliente VARCHAR2(30) NOT NULL,

    CONSTRAINT pk_cliente_b2b PRIMARY KEY (id_clienteb2b),
    CONSTRAINT uq_cliente_codigo UNIQUE (cod_clienteb2b),
    CONSTRAINT uq_cliente_nit UNIQUE (nit),
    CONSTRAINT ck_cliente_tipo
        CHECK (tipo_cliente IN (
            'DISTRIBUIDOR',
            'FARMACIA',
            'HOSPITAL',
            'CLINICA',
            'OTRO'
        ))
);


-- ============================================================
-- 3. BODEGA
-- ============================================================

CREATE TABLE bodega (
    id_bodega NUMBER(19)
        GENERATED ALWAYS AS IDENTITY,
    nombre VARCHAR2(100) NOT NULL,
    ubicacion VARCHAR2(200) NOT NULL,
    tipo VARCHAR2(30) NOT NULL,

    CONSTRAINT pk_bodega PRIMARY KEY (id_bodega),
    CONSTRAINT uq_bodega_nombre UNIQUE (nombre),
    CONSTRAINT ck_bodega_tipo
        CHECK (tipo IN (
            'PRINCIPAL',
            'DISTRIBUCION',
            'FRIO',
            'CUARENTENA',
            'OTRA'
        ))
);


-- ============================================================
-- 4. LOTE
-- Estados (RF-01): PENDIENTE = En Inspeccion, APROBADO,
--                  BLOQUEADO/RECHAZADO = Bloqueado/Retirado, VENCIDO
-- ============================================================

CREATE TABLE lote (
    id_lote NUMBER(19)
        GENERATED ALWAYS AS IDENTITY,
    numero_lote VARCHAR2(50) NOT NULL,
    fecha_fabricacion DATE NOT NULL,
    fecha_caducidad DATE NOT NULL,
    estado_lote VARCHAR2(20) DEFAULT 'PENDIENTE' NOT NULL,
    id_producto NUMBER(19) NOT NULL,

    CONSTRAINT pk_lote PRIMARY KEY (id_lote),
    CONSTRAINT uq_lote_numero UNIQUE (numero_lote),

    CONSTRAINT fk_lote_producto
        FOREIGN KEY (id_producto)
        REFERENCES producto(id_producto),

    CONSTRAINT ck_lote_fechas
        CHECK (fecha_caducidad > fecha_fabricacion),

    CONSTRAINT ck_lote_estado
        CHECK (estado_lote IN (
            'PENDIENTE',
            'APROBADO',
            'RECHAZADO',
            'BLOQUEADO',
            'VENCIDO'
        ))
);


-- ============================================================
-- 5. CONTROL DE CALIDAD
-- ============================================================

CREATE TABLE control_calidad (
    id_control_calidad NUMBER(19)
        GENERATED ALWAYS AS IDENTITY,
    fecha_inspeccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    resultado VARCHAR2(20) NOT NULL,
    representante VARCHAR2(120) NOT NULL,
    observaciones VARCHAR2(400),
    id_lote NUMBER(19) NOT NULL,

    CONSTRAINT pk_control_calidad
        PRIMARY KEY (id_control_calidad),

    CONSTRAINT fk_calidad_lote
        FOREIGN KEY (id_lote)
        REFERENCES lote(id_lote),

    CONSTRAINT ck_calidad_resultado
        CHECK (resultado IN (
            'PENDIENTE',
            'APROBADO',
            'RECHAZADO'
        ))
);


-- ============================================================
-- 6. INVENTARIO
-- ============================================================

CREATE TABLE inventario (
    id_inventario NUMBER(19)
        GENERATED ALWAYS AS IDENTITY,
    stock NUMBER(12) DEFAULT 0 NOT NULL,
    reservas NUMBER(12) DEFAULT 0 NOT NULL,
    id_lote NUMBER(19) NOT NULL,
    id_bodega NUMBER(19) NOT NULL,

    CONSTRAINT pk_inventario PRIMARY KEY (id_inventario),

    CONSTRAINT fk_inventario_lote
        FOREIGN KEY (id_lote)
        REFERENCES lote(id_lote),

    CONSTRAINT fk_inventario_bodega
        FOREIGN KEY (id_bodega)
        REFERENCES bodega(id_bodega),

    CONSTRAINT uq_inventario_lote_bodega
        UNIQUE (id_lote, id_bodega),

    CONSTRAINT ck_inventario_stock
        CHECK (stock >= 0),

    CONSTRAINT ck_inventario_reservas
        CHECK (reservas >= 0 AND reservas <= stock)
);


-- ============================================================
-- 7. TRAZABILIDAD
-- ============================================================

CREATE TABLE trazabilidad (
    id_trazabilidad NUMBER(19)
        GENERATED ALWAYS AS IDENTITY,
    id_lote NUMBER(19) NOT NULL,
    tipo_movimiento VARCHAR2(20) NOT NULL,
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    cantidad NUMBER(12) NOT NULL,
    referencia VARCHAR2(100),
    id_bodega_origen NUMBER(19),
    id_bodega_destino NUMBER(19),

    CONSTRAINT pk_trazabilidad PRIMARY KEY (id_trazabilidad),

    CONSTRAINT fk_trazabilidad_lote
        FOREIGN KEY (id_lote)
        REFERENCES lote(id_lote),

    CONSTRAINT fk_trazabilidad_origen
        FOREIGN KEY (id_bodega_origen)
        REFERENCES bodega(id_bodega),

    CONSTRAINT fk_trazabilidad_destino
        FOREIGN KEY (id_bodega_destino)
        REFERENCES bodega(id_bodega),

    CONSTRAINT ck_trazabilidad_tipo
        CHECK (tipo_movimiento IN (
            'ENTRADA',
            'SALIDA',
            'TRANSFERENCIA',
            'AJUSTE_POSITIVO',
            'AJUSTE_NEGATIVO'
        )),

    CONSTRAINT ck_trazabilidad_cantidad
        CHECK (cantidad > 0),

    CONSTRAINT ck_trazabilidad_bodegas
        CHECK (
            (tipo_movimiento = 'ENTRADA'
             AND id_bodega_origen IS NULL
             AND id_bodega_destino IS NOT NULL)
            OR
            (tipo_movimiento = 'SALIDA'
             AND id_bodega_origen IS NOT NULL
             AND id_bodega_destino IS NULL)
            OR
            (tipo_movimiento = 'TRANSFERENCIA'
             AND id_bodega_origen IS NOT NULL
             AND id_bodega_destino IS NOT NULL
             AND id_bodega_origen <> id_bodega_destino)
            OR
            (tipo_movimiento IN (
                'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'
            ))
        )
);


-- ============================================================
-- 8. CREDITO DEL CLIENTE
-- ============================================================

CREATE TABLE credito_cliente (
    id_credito_cliente NUMBER(19)
        GENERATED ALWAYS AS IDENTITY,
    limite_credito NUMBER(14,2) DEFAULT 0 NOT NULL,
    saldo_utilizado NUMBER(14,2) DEFAULT 0 NOT NULL,
    id_clienteb2b NUMBER(19) NOT NULL,

    CONSTRAINT pk_credito_cliente
        PRIMARY KEY (id_credito_cliente),

    CONSTRAINT fk_credito_cliente
        FOREIGN KEY (id_clienteb2b)
        REFERENCES cliente_b2b(id_clienteb2b),

    CONSTRAINT uq_credito_cliente
        UNIQUE (id_clienteb2b),

    CONSTRAINT ck_credito_limite
        CHECK (limite_credito >= 0),

    CONSTRAINT ck_credito_saldo
        CHECK (
            saldo_utilizado >= 0
            AND saldo_utilizado <= limite_credito
        )
);


-- ============================================================
-- 9. ORDEN B2B  (RF-05)
-- descuento     = MONTO del descuento por volumen
-- impuesto      = % de impuesto (IVA / importacion / exportacion)
-- comision_pct  = % de comision de distribucion
-- ============================================================

CREATE TABLE ordenb2b (
    id_orden NUMBER(19)
        GENERATED ALWAYS AS IDENTITY,
    numero_orden VARCHAR2(40) NOT NULL,
    fecha_orden TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estado VARCHAR2(20) DEFAULT 'PENDIENTE' NOT NULL,
    descuento NUMBER(14,2) DEFAULT 0 NOT NULL,
    impuesto NUMBER(5,2) DEFAULT 0 NOT NULL,
    comision_pct NUMBER(5,2) DEFAULT 0 NOT NULL,
    id_clienteb2b NUMBER(19) NOT NULL,

    CONSTRAINT pk_ordenb2b PRIMARY KEY (id_orden),
    CONSTRAINT uq_orden_numero UNIQUE (numero_orden),

    CONSTRAINT fk_orden_cliente
        FOREIGN KEY (id_clienteb2b)
        REFERENCES cliente_b2b(id_clienteb2b),

    CONSTRAINT ck_orden_estado
        CHECK (estado IN (
            'PENDIENTE',
            'CONFIRMADA',
            'EN_PROCESO',
            'DESPACHADA',
            'ENTREGADA',
            'CANCELADA'
        )),

    CONSTRAINT ck_orden_descuento
        CHECK (descuento >= 0),

    CONSTRAINT ck_orden_impuesto
        CHECK (impuesto >= 0 AND impuesto <= 100),

    CONSTRAINT ck_orden_comision
        CHECK (comision_pct >= 0 AND comision_pct <= 100)
);


-- ============================================================
-- 10. DETALLE DE ORDEN
-- ============================================================

CREATE TABLE det_orden (
    id_det_orden NUMBER(19)
        GENERATED ALWAYS AS IDENTITY,
    cantidad_solicitada NUMBER(12) NOT NULL,
    precio_unitario NUMBER(12,2) NOT NULL,

    subtotal NUMBER(14,2)
        GENERATED ALWAYS AS (
            cantidad_solicitada * precio_unitario
        ) VIRTUAL,

    id_orden NUMBER(19) NOT NULL,
    id_lote NUMBER(19) NOT NULL,

    CONSTRAINT pk_det_orden PRIMARY KEY (id_det_orden),

    CONSTRAINT fk_detalle_orden
        FOREIGN KEY (id_orden)
        REFERENCES ordenb2b(id_orden),

    CONSTRAINT fk_detalle_lote
        FOREIGN KEY (id_lote)
        REFERENCES lote(id_lote),

    CONSTRAINT uq_orden_lote
        UNIQUE (id_orden, id_lote),

    CONSTRAINT ck_detalle_cantidad
        CHECK (cantidad_solicitada > 0),

    CONSTRAINT ck_detalle_precio
        CHECK (precio_unitario >= 0)
);


-- ============================================================
-- 11. DESPACHO
-- ============================================================

CREATE TABLE despacho (
    id_despacho NUMBER(19)
        GENERATED ALWAYS AS IDENTITY,
    fecha_despacho TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    numero_guia VARCHAR2(60),
    estado VARCHAR2(20) DEFAULT 'PENDIENTE' NOT NULL,
    id_orden NUMBER(19) NOT NULL,
    id_bodega NUMBER(19) NOT NULL,

    CONSTRAINT pk_despacho PRIMARY KEY (id_despacho),
    CONSTRAINT uq_despacho_guia UNIQUE (numero_guia),

    CONSTRAINT fk_despacho_orden
        FOREIGN KEY (id_orden)
        REFERENCES ordenb2b(id_orden),

    CONSTRAINT fk_despacho_bodega
        FOREIGN KEY (id_bodega)
        REFERENCES bodega(id_bodega),

    CONSTRAINT ck_despacho_estado
        CHECK (estado IN (
            'PENDIENTE',
            'PREPARADO',
            'EN_TRANSITO',
            'ENTREGADO',
            'CANCELADO'
        ))
);


-- ============================================================
-- 12. DETALLE DE DESPACHO
-- ============================================================

CREATE TABLE despacho_detalle (
    id_despacho_detalle NUMBER(19)
        GENERATED ALWAYS AS IDENTITY,
    id_despacho NUMBER(19) NOT NULL,
    id_det_orden NUMBER(19) NOT NULL,
    cantidad_despachada NUMBER(12) NOT NULL,

    CONSTRAINT pk_despacho_detalle
        PRIMARY KEY (id_despacho_detalle),

    CONSTRAINT fk_dd_despacho
        FOREIGN KEY (id_despacho)
        REFERENCES despacho(id_despacho),

    CONSTRAINT fk_dd_detalle_orden
        FOREIGN KEY (id_det_orden)
        REFERENCES det_orden(id_det_orden),

    CONSTRAINT uq_despacho_detalle
        UNIQUE (id_despacho, id_det_orden),

    CONSTRAINT ck_dd_cantidad
        CHECK (cantidad_despachada > 0)
);


-- ============================================================
-- 13. INDICES
-- ============================================================

CREATE INDEX idx_lote_producto
    ON lote(id_producto);

CREATE INDEX idx_lote_caducidad
    ON lote(fecha_caducidad, estado_lote);

CREATE INDEX idx_calidad_lote_fecha
    ON control_calidad(id_lote, fecha_inspeccion);

CREATE INDEX idx_inventario_bodega
    ON inventario(id_bodega);

CREATE INDEX idx_trazabilidad_lote_fecha
    ON trazabilidad(id_lote, fecha_movimiento);

CREATE INDEX idx_trazabilidad_origen
    ON trazabilidad(id_bodega_origen);

CREATE INDEX idx_trazabilidad_destino
    ON trazabilidad(id_bodega_destino);

CREATE INDEX idx_orden_cliente_fecha
    ON ordenb2b(id_clienteb2b, fecha_orden);

CREATE INDEX idx_det_orden_orden
    ON det_orden(id_orden);

CREATE INDEX idx_det_orden_lote
    ON det_orden(id_lote);

CREATE INDEX idx_despacho_orden
    ON despacho(id_orden);

CREATE INDEX idx_despacho_bodega
    ON despacho(id_bodega);

CREATE INDEX idx_dd_detalle_orden
    ON despacho_detalle(id_det_orden);


-- ============================================================
-- 14. VERIFICACION FINAL (deben aparecer 12 tablas)
-- ============================================================

SELECT table_name
FROM user_tables
WHERE table_name IN (
    'PRODUCTO',
    'CLIENTE_B2B',
    'BODEGA',
    'LOTE',
    'CONTROL_CALIDAD',
    'INVENTARIO',
    'TRAZABILIDAD',
    'CREDITO_CLIENTE',
    'ORDENB2B',
    'DET_ORDEN',
    'DESPACHO',
    'DESPACHO_DETALLE'
)
ORDER BY table_name;
