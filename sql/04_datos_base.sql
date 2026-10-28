-- ============================================================
-- 04. CARGA INICIAL (DML)  (ejecutar despues de 01, 02 y 03)
--   3 bodegas, 4 clientes B2B con credito, 23 productos Bayer,
--   lotes con distintas caducidades y estados de calidad,
--   inventario por bodega, movimientos de entrada y control de calidad.
-- Los nombres comerciales son de Bayer; precios, cantidades, lotes y
-- clientes son DATOS FICTICIOS para fines academicos.
-- ============================================================

-- ------------------------------------------------------------
-- 1. BODEGAS / CENTROS DE DISTRIBUCION
-- ------------------------------------------------------------
INSERT INTO bodega (nombre, ubicacion, tipo)
VALUES ('Bodega Central Guatemala', 'Zona 12, Ciudad de Guatemala', 'PRINCIPAL');

INSERT INTO bodega (nombre, ubicacion, tipo)
VALUES ('Centro Logistico Mexico', 'Toluca, Estado de Mexico', 'DISTRIBUCION');

INSERT INTO bodega (nombre, ubicacion, tipo)
VALUES ('Bodega de Frios', 'Zona 13, Aeropuerto Guatemala', 'FRIO');

-- ------------------------------------------------------------
-- 2. CLIENTES B2B Y LINEAS DE CREDITO (RF-05)
-- ------------------------------------------------------------
INSERT INTO cliente_b2b (cod_clienteb2b, nombre, nit, tipo_cliente)
VALUES ('CLI-001', 'Cadenas de Farmacias Batres', '1234567-8', 'FARMACIA');

INSERT INTO cliente_b2b (cod_clienteb2b, nombre, nit, tipo_cliente)
VALUES ('CLI-002', 'Ministerio de Salud Publica', '8765432-1', 'HOSPITAL');

INSERT INTO cliente_b2b (cod_clienteb2b, nombre, nit, tipo_cliente)
VALUES ('CLI-003', 'Hospitales Privados de Guatemala', '4567890-2', 'CLINICA');

-- Cliente con credito bajo: sirve para probar "credito insuficiente"
INSERT INTO cliente_b2b (cod_clienteb2b, nombre, nit, tipo_cliente)
VALUES ('CLI-004', 'Mayorista Internacional Centroamerica', '2468135-7', 'DISTRIBUIDOR');

INSERT INTO credito_cliente (limite_credito, saldo_utilizado, id_clienteb2b)
SELECT 6000000, 0, id_clienteb2b FROM cliente_b2b WHERE cod_clienteb2b = 'CLI-001';

INSERT INTO credito_cliente (limite_credito, saldo_utilizado, id_clienteb2b)
SELECT 8000000, 0, id_clienteb2b FROM cliente_b2b WHERE cod_clienteb2b = 'CLI-002';

INSERT INTO credito_cliente (limite_credito, saldo_utilizado, id_clienteb2b)
SELECT 7000000, 0, id_clienteb2b FROM cliente_b2b WHERE cod_clienteb2b = 'CLI-003';

INSERT INTO credito_cliente (limite_credito, saldo_utilizado, id_clienteb2b)
SELECT 10000, 0, id_clienteb2b FROM cliente_b2b WHERE cod_clienteb2b = 'CLI-004';

-- ------------------------------------------------------------
-- 3. PRODUCTOS BAYER (23): 8 OTC, 12 eticos, 3 con cadena de frio
-- ------------------------------------------------------------
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-001', 'Aspirina 500 mg x100 tabletas',      'OTC',   'N',   85.00);
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-002', 'Aspirina Protect 100 mg x28',       'OTC',   'N',   62.00);
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-003', 'Alka-Seltzer x20 sobres',           'OTC',   'N',   48.00);
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-004', 'Aleve 220 mg x24 tabletas',         'OTC',   'N',   55.00);
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-005', 'Bepanthen crema 30 g',              'OTC',   'N',   72.00);
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-006', 'Canesten crema 20 g',              'OTC',   'N',   68.00);
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-007', 'Berocca Performance x30',           'OTC',   'N',  140.00);
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-008', 'Redoxon Vitamina C x30',           'OTC',   'N',   95.00);
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-009', 'Xarelto 10 mg x30 tabletas',       'ETICO', 'N',  620.00);
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-010', 'Xarelto 20 mg x28 tabletas',       'ETICO', 'N',  640.00);
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-011', 'Glucobay 50 mg x30 tabletas',      'ETICO', 'N',  210.00);
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-012', 'Glucobay 100 mg x30 tabletas',     'ETICO', 'N',  340.00);
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-013', 'Adalat Oros 30 mg x28',            'ETICO', 'N',  260.00);
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-014', 'Ciprobay 500 mg x10 tabletas',     'ETICO', 'N',  180.00);
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-015', 'Avelox 400 mg x5 tabletas',        'ETICO', 'N',  230.00);
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-016', 'Nimotop 30 mg x30 tabletas',       'ETICO', 'N',  300.00);
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-017', 'Levitra 20 mg x4 tabletas',        'ETICO', 'N',  310.00);
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-018', 'Adempas 2.5 mg x42 tabletas',      'ETICO', 'N', 2800.00);
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-019', 'Kerendia 20 mg x28 tabletas',     'ETICO', 'N',  900.00);
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-020', 'Nexavar 200 mg x112 tabletas',    'ETICO', 'N', 4800.00);
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-021', 'Eylea jeringa prellenada (frio)',  'ETICO', 'S', 3200.00);
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-022', 'Kovaltry 500 UI vial (frio)',      'ETICO', 'S', 1800.00);
INSERT INTO producto (cod_producto, nombre, linea, cadena_frio, precio_unitario) VALUES ('BAY-023', 'Betaferon 250 mcg x15 (frio)',     'ETICO', 'S', 2400.00);

COMMIT;

-- ------------------------------------------------------------
-- 4. LOTES, INVENTARIO Y MOVIMIENTOS DE ENTRADA
-- Cada producto tiene 3 lotes: A (vence pronto), B, C (vence lejos).
-- Los lotes A caducan a 25/50/80/140/200/300 dias segun el producto,
-- para que cada ventana de RF-04 (30/60/90/180) tenga datos.
-- Estados especiales:
--   PENDIENTE (En Inspeccion): lote C de BAY-005, 011, 016, 020
--   RECHAZADO                : lote B de BAY-013
--   VENCIDO                  : lotes X de BAY-002 y BAY-006
-- Los lotes LT-09-A y LT-21-A se BLOQUEAN en 05_poblado_extendido.sql,
-- DESPUES de haberse vendido, para que el recall tenga a quien rastrear.
-- ------------------------------------------------------------
DECLARE
    TYPE t_dias IS VARRAY(6) OF NUMBER;
    v_base     t_dias := t_dias(25, 50, 80, 140, 200, 300);

    v_b1       bodega.id_bodega%TYPE;
    v_b2       bodega.id_bodega%TYPE;
    v_b3       bodega.id_bodega%TYPE;
    v_dias     NUMBER;
    v_estado   lote.estado_lote%TYPE;
    v_num      lote.numero_lote%TYPE;
    v_s1       NUMBER;
    v_s2       NUMBER;
    v_id_prod  producto.id_producto%TYPE;

    PROCEDURE alta_lote (
        p_num      IN VARCHAR2,
        p_fab      IN DATE,
        p_cad      IN DATE,
        p_estado   IN VARCHAR2,
        p_id_prod  IN NUMBER,
        p_bod1     IN NUMBER,
        p_stock1   IN NUMBER,
        p_bod2     IN NUMBER,
        p_stock2   IN NUMBER
    ) IS
        v_id_lote  lote.id_lote%TYPE;
    BEGIN
        INSERT INTO lote
            (numero_lote, fecha_fabricacion, fecha_caducidad, estado_lote, id_producto)
        VALUES
            (p_num, p_fab, p_cad, p_estado, p_id_prod)
        RETURNING id_lote INTO v_id_lote;

        INSERT INTO inventario (stock, reservas, id_lote, id_bodega)
        VALUES (p_stock1, 0, v_id_lote, p_bod1);

        -- Ingreso desde planta: total fabricado entra a la bodega 1
        INSERT INTO trazabilidad
            (id_lote, tipo_movimiento, fecha_movimiento, cantidad, referencia, id_bodega_destino)
        VALUES
            (v_id_lote, 'ENTRADA', CAST(p_fab + 5 AS TIMESTAMP),
             p_stock1 + NVL(p_stock2, 0), 'PLANTA-' || p_num, p_bod1);

        IF p_bod2 IS NOT NULL AND p_stock2 > 0 THEN
            INSERT INTO inventario (stock, reservas, id_lote, id_bodega)
            VALUES (p_stock2, 0, v_id_lote, p_bod2);

            INSERT INTO trazabilidad
                (id_lote, tipo_movimiento, fecha_movimiento, cantidad, referencia,
                 id_bodega_origen, id_bodega_destino)
            VALUES
                (v_id_lote, 'TRANSFERENCIA', CAST(p_fab + 8 AS TIMESTAMP),
                 p_stock2, 'TRASLADO-' || p_num, p_bod1, p_bod2);
        END IF;
    END alta_lote;
BEGIN
    SELECT id_bodega INTO v_b1 FROM bodega WHERE nombre = 'Bodega Central Guatemala';
    SELECT id_bodega INTO v_b2 FROM bodega WHERE nombre = 'Centro Logistico Mexico';
    SELECT id_bodega INTO v_b3 FROM bodega WHERE nombre = 'Bodega de Frios';

    FOR p IN (
        SELECT id_producto,
               cadena_frio,
               ROW_NUMBER() OVER (ORDER BY cod_producto) AS rn
          FROM producto
         ORDER BY cod_producto
    ) LOOP
        FOR k IN 1 .. 3 LOOP
            IF k = 1 THEN
                v_dias := v_base(MOD(p.rn, 6) + 1);
            ELSIF k = 2 THEN
                v_dias := v_base(MOD(p.rn, 6) + 1) + 180 + MOD(p.rn, 4) * 30;
            ELSE
                v_dias := 540 + MOD(p.rn, 3) * 60;
            END IF;

            v_num := 'LT-' || LPAD(p.rn, 2, '0') || '-' || CHR(64 + k);

            v_estado := 'APROBADO';
            IF k = 3 AND p.rn IN (5, 11, 16, 20) THEN
                v_estado := 'PENDIENTE';
            ELSIF k = 2 AND p.rn = 13 THEN
                v_estado := 'RECHAZADO';
            END IF;

            IF p.cadena_frio = 'S' THEN
                -- Productos de frio: solo Bodega de Frios
                IF k = 1 THEN v_s1 := 60;
                ELSIF k = 2 THEN v_s1 := 300;
                ELSE v_s1 := 500;
                END IF;
                alta_lote(v_num,
                          TRUNC(SYSDATE) + v_dias - 1095,
                          TRUNC(SYSDATE) + v_dias,
                          v_estado, p.id_producto,
                          v_b3, v_s1, NULL, 0);
            ELSE
                -- Resto: Bodega Central (+ traslado a Mexico en lotes A y B)
                IF k = 1 THEN
                    v_s1 := 400 + MOD(p.rn * 97, 600);
                    v_s2 := 300;
                ELSIF k = 2 THEN
                    v_s1 := 3000;
                    v_s2 := 1500;
                ELSE
                    v_s1 := 3000;
                    v_s2 := 0;
                END IF;
                alta_lote(v_num,
                          TRUNC(SYSDATE) + v_dias - 1095,
                          TRUNC(SYSDATE) + v_dias,
                          v_estado, p.id_producto,
                          v_b1, v_s1, v_b2, v_s2);
            END IF;
        END LOOP;
    END LOOP;

    -- Lotes ya vencidos con stock en bodega (mermas por controlar)
    SELECT id_producto INTO v_id_prod FROM producto WHERE cod_producto = 'BAY-006';
    alta_lote('LT-06-X', TRUNC(SYSDATE) - 1110, TRUNC(SYSDATE) - 15,
              'VENCIDO', v_id_prod, v_b1, 400, NULL, 0);

    SELECT id_producto INTO v_id_prod FROM producto WHERE cod_producto = 'BAY-002';
    alta_lote('LT-02-X', TRUNC(SYSDATE) - 1120, TRUNC(SYSDATE) - 40,
              'VENCIDO', v_id_prod, v_b1, 250, NULL, 0);

    COMMIT;
END;
/

-- ------------------------------------------------------------
-- 5. CONTROL DE CALIDAD: inspeccion inicial de cada lote
-- ------------------------------------------------------------
INSERT INTO control_calidad
    (fecha_inspeccion, resultado, representante, observaciones, id_lote)
SELECT CAST(l.fecha_fabricacion + 3 AS TIMESTAMP),
       CASE l.estado_lote
            WHEN 'RECHAZADO' THEN 'RECHAZADO'
            WHEN 'PENDIENTE' THEN 'PENDIENTE'
            ELSE 'APROBADO'
       END,
       'QA Planta Guatemala',
       CASE l.estado_lote
            WHEN 'RECHAZADO' THEN 'Desviacion en pureza del principio activo'
            WHEN 'PENDIENTE' THEN 'Lote en inspeccion, muestras en laboratorio'
            ELSE 'Inspeccion inicial conforme'
       END,
       l.id_lote
  FROM lote l;

COMMIT;

-- Verificacion rapida
SELECT 'PRODUCTOS' AS tabla, COUNT(*) AS filas FROM producto UNION ALL
SELECT 'BODEGAS', COUNT(*) FROM bodega UNION ALL
SELECT 'CLIENTES', COUNT(*) FROM cliente_b2b UNION ALL
SELECT 'LOTES', COUNT(*) FROM lote UNION ALL
SELECT 'INVENTARIO', COUNT(*) FROM inventario UNION ALL
SELECT 'TRAZABILIDAD', COUNT(*) FROM trazabilidad UNION ALL
SELECT 'CONTROL_CALIDAD', COUNT(*) FROM control_calidad;
