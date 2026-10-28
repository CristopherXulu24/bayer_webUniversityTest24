-- ============================================================
-- 03. PROCEDIMIENTOS ALMACENADOS  (ejecutar despues de 01 y 02)
--   sp_checkout_b2b_fefo   RF-01, RF-02, RF-05, RNF-01
--   sp_confirmar_despacho  salida fisica + trazabilidad
--   sp_bloquear_lote       Control de Calidad bloquea un lote
--   sp_rastreo_recall_lote RF-03
-- Los mensajes DBMS_OUTPUT aparecen en el resultado del script en APEX (Ver resultados).
-- ============================================================


-- ============================================================
-- 1. CHECKOUT B2B ATOMICO  (FEFO + bloqueo pesimista)
--
-- Pasos (todo en UNA transaccion; cualquier error => ROLLBACK):
--   1. Bloquea la linea de credito del cliente      (FOR UPDATE)
--   2. Calcula bruto, descuento por volumen, impuesto y comision
--   3. Crea la orden y su orden de despacho (PENDIENTE)
--   4. Reserva lotes APROBADOS por FEFO bloqueando el inventario
--      (FOR UPDATE) => dos sesiones no pueden tomar el mismo lote
--   5. Afecta el credito del cliente
--   6. Revalida que ningun lote reservado haya sido bloqueado por
--      Calidad durante la sesion; si lo fue => ROLLBACK
--
-- Parametros opcionales SOLO PARA LAS PRUEBAS DE LABORATORIO:
--   p_pausa_seg      segundos de espera antes del COMMIT (mantiene los
--                    bloqueos para que otra sesion los pueda observar;
--                    usa DBMS_SESSION.SLEEP y, si no esta disponible, espera activa)
--   p_simular_fallo  1 = falla tras reservar inventario, antes del credito
--                    2 = falla tras descontar el credito, antes del COMMIT
--
-- Descuento por volumen: >=500 u 3%, >=1000 u 5%, >=5000 u 8%.
-- Impuesto 12%. Comision de distribucion 2%.
-- ============================================================

CREATE OR REPLACE PROCEDURE sp_checkout_b2b_fefo (
    p_id_cliente      IN  NUMBER,
    p_id_producto     IN  NUMBER,
    p_id_bodega       IN  NUMBER,
    p_cantidad_solic  IN  NUMBER,
    p_id_orden_out    OUT NUMBER,
    p_mensaje_out     OUT VARCHAR2,
    p_pausa_seg       IN  NUMBER DEFAULT 0,
    p_simular_fallo   IN  NUMBER DEFAULT 0
) AS
    c_impuesto_pct    CONSTANT NUMBER(5,2) := 12;
    c_comision_pct    CONSTANT NUMBER(5,2) := 2;

    v_limite          NUMBER(14,2);
    v_saldo           NUMBER(14,2);
    v_precio          NUMBER(12,2);
    v_bruto           NUMBER(14,2);
    v_pct_desc        NUMBER(5,2) := 0;
    v_descuento       NUMBER(14,2);
    v_neto            NUMBER(14,2);
    v_total           NUMBER(14,2);
    v_pendiente       NUMBER(12);
    v_disponible      NUMBER(12);
    v_a_reservar      NUMBER(12);
    v_id_orden        NUMBER(19);
    v_id_despacho     NUMBER(19);
    v_id_det          NUMBER(19);
    v_t0              NUMBER;

    -- Bloqueo pesimista (FOR UPDATE) sobre el inventario, orden FEFO
    CURSOR c_lotes_fefo IS
        SELECT i.id_inventario,
               i.id_lote
        FROM inventario i
        INNER JOIN lote l ON i.id_lote = l.id_lote
        WHERE l.id_producto = p_id_producto
          AND i.id_bodega = p_id_bodega
          AND l.estado_lote = 'APROBADO'
          AND l.fecha_caducidad > TRUNC(SYSDATE)
          AND (i.stock - i.reservas) > 0
        ORDER BY l.fecha_caducidad ASC, l.id_lote ASC
        FOR UPDATE OF i.reservas;
BEGIN
    p_id_orden_out := 0;

    IF p_cantidad_solic IS NULL OR p_cantidad_solic <= 0 THEN
        RAISE_APPLICATION_ERROR(-20004,
            'La cantidad solicitada debe ser mayor a cero.');
    END IF;
    v_pendiente := p_cantidad_solic;

    -- 1. Linea de credito del cliente, bloqueada
    SELECT c.limite_credito, c.saldo_utilizado
      INTO v_limite, v_saldo
      FROM credito_cliente c
     WHERE c.id_clienteb2b = p_id_cliente
       FOR UPDATE;

    -- 2. Precio y calculo financiero (RF-05)
    SELECT precio_unitario
      INTO v_precio
      FROM producto
     WHERE id_producto = p_id_producto
       AND estado = 'ACTIVO';

    v_bruto := p_cantidad_solic * v_precio;

    IF p_cantidad_solic >= 5000 THEN
        v_pct_desc := 8;
    ELSIF p_cantidad_solic >= 1000 THEN
        v_pct_desc := 5;
    ELSIF p_cantidad_solic >= 500 THEN
        v_pct_desc := 3;
    END IF;

    v_descuento := ROUND(v_bruto * v_pct_desc / 100, 2);
    v_neto      := v_bruto - v_descuento;
    v_total     := ROUND(v_neto * (1 + (c_impuesto_pct + c_comision_pct) / 100), 2);

    IF (v_limite - v_saldo) < v_total THEN
        RAISE_APPLICATION_ERROR(-20001,
            'Credito insuficiente para procesar la orden B2B.');
    END IF;

    -- 3. Orden B2B y orden de despacho
    INSERT INTO ordenb2b
        (numero_orden, estado, descuento, impuesto, comision_pct, id_clienteb2b)
    VALUES
        ('ORD-' || TO_CHAR(SYSDATE, 'YYYYMMDD') || '-'
                || LPAD(seq_numero_orden.NEXTVAL, 6, '0'),
         'CONFIRMADA', v_descuento, c_impuesto_pct, c_comision_pct, p_id_cliente)
    RETURNING id_orden INTO v_id_orden;

    INSERT INTO despacho (estado, id_orden, id_bodega)
    VALUES ('PENDIENTE', v_id_orden, p_id_bodega)
    RETURNING id_despacho INTO v_id_despacho;

    -- 4. Asignacion FEFO con inventario bloqueado
    FOR r_lote IN c_lotes_fefo LOOP
        EXIT WHEN v_pendiente = 0;

        -- Relectura bajo bloqueo: si otra sesion libero el bloqueo
        -- despues de reservar, aqui se ve el valor ya confirmado.
        SELECT stock - reservas
          INTO v_disponible
          FROM inventario
         WHERE id_inventario = r_lote.id_inventario;

        IF v_disponible > 0 THEN
            v_a_reservar := LEAST(v_disponible, v_pendiente);

            UPDATE inventario
               SET reservas = reservas + v_a_reservar
             WHERE id_inventario = r_lote.id_inventario;

            INSERT INTO det_orden
                (cantidad_solicitada, precio_unitario, id_orden, id_lote)
            VALUES
                (v_a_reservar, v_precio, v_id_orden, r_lote.id_lote)
            RETURNING id_det_orden INTO v_id_det;

            INSERT INTO despacho_detalle
                (id_despacho, id_det_orden, cantidad_despachada)
            VALUES
                (v_id_despacho, v_id_det, v_a_reservar);

            v_pendiente := v_pendiente - v_a_reservar;
        END IF;
    END LOOP;

    IF v_pendiente > 0 THEN
        RAISE_APPLICATION_ERROR(-20002,
            'Stock insuficiente en lotes APROBADOS para cubrir el pedido.');
    END IF;

    -- PRUEBA DE LABORATORIO: falla a mitad del proceso (antes del credito)
    IF p_simular_fallo = 1 THEN
        RAISE_APPLICATION_ERROR(-20099,
            'FALLA SIMULADA: error tras reservar inventario y antes de afectar el credito.');
    END IF;

    -- 5. Afectar el credito del cliente
    UPDATE credito_cliente
       SET saldo_utilizado = saldo_utilizado + v_total
     WHERE id_clienteb2b = p_id_cliente;

    -- PRUEBA DE LABORATORIO: falla con el credito ya descontado
    IF p_simular_fallo = 2 THEN
        RAISE_APPLICATION_ERROR(-20098,
            'FALLA SIMULADA: error con el credito ya descontado, antes del COMMIT.');
    END IF;

    -- PRUEBA DE LABORATORIO: mantener bloqueos para observar otra sesion
    IF p_pausa_seg > 0 THEN
        BEGIN
            EXECUTE IMMEDIATE 'BEGIN DBMS_SESSION.SLEEP(:s); END;' USING p_pausa_seg;
        EXCEPTION
            WHEN OTHERS THEN
                -- Respaldo si DBMS_SESSION.SLEEP no esta disponible en este entorno:
                -- espera activa con DBMS_UTILITY.GET_TIME (centesimas de segundo).
                v_t0 := DBMS_UTILITY.GET_TIME;
                WHILE MOD(DBMS_UTILITY.GET_TIME - v_t0 + 4294967296, 4294967296)
                      < p_pausa_seg * 100 LOOP
                    NULL;
                END LOOP;
        END;
    END IF;

    -- 6. Revalidacion: ningun lote reservado puede haber sido bloqueado
    --    por Calidad mientras se procesaba la orden (RF-02).
    --    Se bloquean las filas de lote para que Calidad no pueda cambiar
    --    el estado entre esta validacion y el COMMIT.
    FOR r IN (
        SELECT l.numero_lote, l.estado_lote
          FROM lote l
         WHERE l.id_lote IN (SELECT dt.id_lote
                               FROM det_orden dt
                              WHERE dt.id_orden = v_id_orden)
           FOR UPDATE OF l.estado_lote
    ) LOOP
        IF r.estado_lote <> 'APROBADO' THEN
            RAISE_APPLICATION_ERROR(-20003,
                'El lote ' || r.numero_lote ||
                ' fue bloqueado por Control de Calidad durante la transaccion.');
        END IF;
    END LOOP;

    COMMIT;

    p_id_orden_out := v_id_orden;
    p_mensaje_out  := 'Orden confirmada exitosamente bajo estandar FEFO. Total: '
                      || TO_CHAR(v_total, 'FM999,999,999,990.00');

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        ROLLBACK;
        p_id_orden_out := 0;
        p_mensaje_out  := 'Transaccion Revertida (ROLLBACK): cliente sin linea de credito '
                          || 'o producto inexistente/inactivo.';
    WHEN OTHERS THEN
        ROLLBACK;
        p_id_orden_out := 0;
        p_mensaje_out  := 'Transaccion Revertida (ROLLBACK): ' || SQLERRM;
END sp_checkout_b2b_fefo;
/


-- ============================================================
-- 2. CONFIRMAR DESPACHO
-- Convierte la reserva en salida fisica: descuenta stock y reservas,
-- registra el movimiento SALIDA en trazabilidad y asigna guia.
-- Se niega a despachar si algun lote ya no esta APROBADO.
-- ============================================================

CREATE OR REPLACE PROCEDURE sp_confirmar_despacho (
    p_id_orden     IN  NUMBER,
    p_mensaje_out  OUT VARCHAR2
) AS
    v_id_despacho   despacho.id_despacho%TYPE;
    v_id_bodega     despacho.id_bodega%TYPE;
    v_estado_desp   despacho.estado%TYPE;
    v_estado_ord    ordenb2b.estado%TYPE;
    v_numero_orden  ordenb2b.numero_orden%TYPE;
    v_no_aprobados  NUMBER;
BEGIN
    SELECT d.id_despacho, d.id_bodega, d.estado, o.estado, o.numero_orden
      INTO v_id_despacho, v_id_bodega, v_estado_desp, v_estado_ord, v_numero_orden
      FROM despacho d
     INNER JOIN ordenb2b o ON o.id_orden = d.id_orden
     WHERE d.id_orden = p_id_orden
       FOR UPDATE OF d.estado, o.estado;

    IF v_estado_ord <> 'CONFIRMADA' OR v_estado_desp <> 'PENDIENTE' THEN
        RAISE_APPLICATION_ERROR(-20010,
            'La orden no esta en estado CONFIRMADA con despacho PENDIENTE.');
    END IF;

    SELECT COUNT(*)
      INTO v_no_aprobados
      FROM det_orden dt
     INNER JOIN lote l ON l.id_lote = dt.id_lote
     WHERE dt.id_orden = p_id_orden
       AND l.estado_lote <> 'APROBADO';

    IF v_no_aprobados > 0 THEN
        RAISE_APPLICATION_ERROR(-20011,
            'Despacho bloqueado: la orden contiene lotes retenidos por Control de Calidad.');
    END IF;

    FOR r IN (
        SELECT dd.cantidad_despachada, dt.id_lote
          FROM despacho_detalle dd
         INNER JOIN det_orden dt ON dt.id_det_orden = dd.id_det_orden
         WHERE dd.id_despacho = v_id_despacho
    ) LOOP
        UPDATE inventario
           SET stock    = stock    - r.cantidad_despachada,
               reservas = reservas - r.cantidad_despachada
         WHERE id_lote   = r.id_lote
           AND id_bodega = v_id_bodega;

        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20012,
                'No existe inventario del lote en la bodega de despacho.');
        END IF;

        INSERT INTO trazabilidad
            (id_lote, tipo_movimiento, cantidad, referencia, id_bodega_origen)
        VALUES
            (r.id_lote, 'SALIDA', r.cantidad_despachada, v_numero_orden, v_id_bodega);
    END LOOP;

    UPDATE despacho
       SET estado = 'EN_TRANSITO',
           numero_guia = 'GUIA-' || LPAD(p_id_orden, 8, '0'),
           fecha_despacho = SYSTIMESTAMP
     WHERE id_despacho = v_id_despacho;

    UPDATE ordenb2b
       SET estado = 'DESPACHADA'
     WHERE id_orden = p_id_orden;

    COMMIT;
    p_mensaje_out := 'Despacho confirmado para la orden ' || v_numero_orden;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        ROLLBACK;
        p_mensaje_out := 'Despacho revertido (ROLLBACK): la orden no existe.';
    WHEN OTHERS THEN
        ROLLBACK;
        p_mensaje_out := 'Despacho revertido (ROLLBACK): ' || SQLERRM;
END sp_confirmar_despacho;
/


-- ============================================================
-- 3. BLOQUEAR LOTE (Control de Calidad / alerta sanitaria)
-- Cambia el lote a BLOQUEADO y deja constancia en control_calidad.
-- Desde ese instante checkout y despacho dejan de usarlo.
-- ============================================================

CREATE OR REPLACE PROCEDURE sp_bloquear_lote (
    p_numero_lote    IN  VARCHAR2,
    p_motivo         IN  VARCHAR2,
    p_mensaje_out    OUT VARCHAR2,
    p_representante  IN  VARCHAR2 DEFAULT 'Control de Calidad Bayer'
) AS
    v_id_lote  lote.id_lote%TYPE;
BEGIN
    UPDATE lote
       SET estado_lote = 'BLOQUEADO'
     WHERE numero_lote = p_numero_lote
    RETURNING id_lote INTO v_id_lote;

    IF SQL%ROWCOUNT = 0 THEN
        ROLLBACK;
        p_mensaje_out := 'Lote no encontrado: ' || p_numero_lote;
        RETURN;
    END IF;

    INSERT INTO control_calidad
        (resultado, representante, observaciones, id_lote)
    VALUES
        ('RECHAZADO', p_representante, SUBSTR(p_motivo, 1, 400), v_id_lote);

    COMMIT;
    p_mensaje_out := 'Lote ' || p_numero_lote || ' BLOQUEADO por Calidad: ' || p_motivo;

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        p_mensaje_out := 'Error al bloquear el lote (ROLLBACK): ' || SQLERRM;
END sp_bloquear_lote;
/


-- ============================================================
-- 4. RASTREO DE RECALL Y TRAZABILIDAD SANITARIA (RF-03)
-- Planta -> bodegas -> clientes institucionales a los que se despacho.
-- ============================================================

CREATE OR REPLACE PROCEDURE sp_rastreo_recall_lote (
    p_numero_lote IN VARCHAR2
) AS
    v_id_lote      lote.id_lote%TYPE;
    v_producto     producto.nombre%TYPE;
    v_fab          lote.fecha_fabricacion%TYPE;
    v_cad          lote.fecha_caducidad%TYPE;
    v_estado       lote.estado_lote%TYPE;
    v_despachado   NUMBER := 0;
    v_pendiente    NUMBER := 0;
    v_clientes     NUMBER := 0;
BEGIN
    SELECT l.id_lote, p.nombre, l.fecha_fabricacion, l.fecha_caducidad, l.estado_lote
      INTO v_id_lote, v_producto, v_fab, v_cad, v_estado
      FROM lote l
     INNER JOIN producto p ON p.id_producto = l.id_producto
     WHERE l.numero_lote = p_numero_lote;

    DBMS_OUTPUT.PUT_LINE('====================================================================');
    DBMS_OUTPUT.PUT_LINE('  TRAZABILIDAD SANITARIA / RECALL  LOTE: ' || p_numero_lote);
    DBMS_OUTPUT.PUT_LINE('====================================================================');
    DBMS_OUTPUT.PUT_LINE('PRODUCTO : ' || v_producto);
    DBMS_OUTPUT.PUT_LINE('ESTADO   : ' || v_estado);
    DBMS_OUTPUT.PUT_LINE('FABRICADO: ' || TO_CHAR(v_fab, 'YYYY-MM-DD')
                         || '   CADUCA: ' || TO_CHAR(v_cad, 'YYYY-MM-DD'));

    DBMS_OUTPUT.PUT_LINE('--- ORIGEN: ingreso desde planta ---------------------------------');
    FOR e IN (
        SELECT t.fecha_movimiento, t.cantidad, b.nombre AS bodega
          FROM trazabilidad t
         INNER JOIN bodega b ON b.id_bodega = t.id_bodega_destino
         WHERE t.id_lote = v_id_lote
           AND t.tipo_movimiento IN ('ENTRADA', 'TRANSFERENCIA')
         ORDER BY t.fecha_movimiento
    ) LOOP
        DBMS_OUTPUT.PUT_LINE(TO_CHAR(e.fecha_movimiento, 'YYYY-MM-DD')
            || '  ingreso/transferencia de ' || e.cantidad || ' u. a ' || e.bodega);
    END LOOP;

    DBMS_OUTPUT.PUT_LINE('--- DISTRIBUCION: clientes que recibieron o tienen reservado el lote');
    FOR r IN (
        SELECT c.cod_clienteb2b, c.nombre AS cliente, c.nit,
               o.numero_orden, o.fecha_orden,
               d.cantidad_solicitada AS cantidad,
               de.numero_guia, de.estado AS estado_despacho
          FROM det_orden d
         INNER JOIN ordenb2b o ON o.id_orden = d.id_orden
         INNER JOIN cliente_b2b c ON c.id_clienteb2b = o.id_clienteb2b
          LEFT JOIN despacho de ON de.id_orden = o.id_orden
         WHERE d.id_lote = v_id_lote
           AND o.estado <> 'CANCELADA'
         ORDER BY o.fecha_orden
    ) LOOP
        DBMS_OUTPUT.PUT_LINE('CLIENTE: ' || r.cliente || ' (NIT ' || r.nit || ')');
        DBMS_OUTPUT.PUT_LINE('  ORDEN: ' || r.numero_orden
            || ' | FECHA: ' || TO_CHAR(r.fecha_orden, 'YYYY-MM-DD')
            || ' | CANTIDAD: ' || r.cantidad);
        DBMS_OUTPUT.PUT_LINE('  DESPACHO: ' || NVL(r.estado_despacho, 'SIN DESPACHO')
            || ' | GUIA: ' || NVL(r.numero_guia, 'PENDIENTE DE GUIA'));
        DBMS_OUTPUT.PUT_LINE('  ------------------------------------------------------------');

        v_clientes := v_clientes + 1;
        IF r.estado_despacho IN ('EN_TRANSITO', 'ENTREGADO') THEN
            v_despachado := v_despachado + r.cantidad;
        ELSE
            v_pendiente := v_pendiente + r.cantidad;
        END IF;
    END LOOP;

    DBMS_OUTPUT.PUT_LINE('RESUMEN: ' || v_clientes || ' orden(es) | '
        || v_despachado || ' u. YA DESPACHADAS (retirar) | '
        || v_pendiente || ' u. reservadas sin despachar (detener)');

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        DBMS_OUTPUT.PUT_LINE('Lote no encontrado: ' || p_numero_lote);
END sp_rastreo_recall_lote;
/

-- Verificar que todo compilo (no debe devolver filas):
SELECT object_name, object_type, status
FROM user_objects
WHERE status <> 'VALID';
