const connectDB = require('../config/db');

exports.saveRecord = async (req, res) => {
    console.log('Datos recibidos en saveRecord:', req.body);

    const {
        usuario,
        empresa
    } = req.body.usuario || {};

    const {
        aportesFet,
        aportesFQ,
        aportesAMB,
        fechaEmision,
        numeroFacturaPDF1,
        numeroFacturaPDF2,
        numeroFacturaPDF3,
        reporteEntradas,
        noNovedades,
        baseLiquidacion,
        periodo
    } = req.body;

    if (!usuario || aportesFet === undefined || aportesFQ === undefined || aportesAMB === undefined || !fechaEmision) {
        return res.status(400).json({
            message: 'Todos los campos son requeridos'
        });
    }

    const fechaEmisionFormatted = new Date(fechaEmision);
    const formattedFechaEmision = fechaEmisionFormatted.toISOString().slice(0, 19).replace('T', ' ');

    const currentTime = new Date().toTimeString().slice(0, 8);

    let conn;
    try {
        conn = await connectDB();

        // Consultas para obtener ID_CARTERA para cada tipo de aporte
        const queryIdCarteraFet = `SELECT B.ID AS ID_CARTERA FROM GES_CONCEPTOS A INNER JOIN CRT_CARTERA B ON A.ID = B.ID_CONCEPTO_COBRANZA WHERE A.ABREVIACION = 'FET'`;
        const queryIdCarteraFQ = `SELECT B.ID AS ID_CARTERA FROM GES_CONCEPTOS A INNER JOIN CRT_CARTERA B ON A.ID = B.ID_CONCEPTO_COBRANZA WHERE A.ABREVIACION = 'FQ'`;
        const queryIdCarteraAMB = `SELECT B.ID AS ID_CARTERA FROM GES_CONCEPTOS A INNER JOIN CRT_CARTERA B ON A.ID = B.ID_CONCEPTO_COBRANZA WHERE A.ABREVIACION = 'AMBQ'`;

        const idCarteraFetResult = await conn.query(queryIdCarteraFet);
        const idCarteraFet = idCarteraFetResult.length > 0 ? idCarteraFetResult[0].ID_CARTERA : null;

        const idCarteraFQResult = await conn.query(queryIdCarteraFQ);
        const idCarteraFQ = idCarteraFQResult.length > 0 ? idCarteraFQResult[0].ID_CARTERA : null;

        const idCarteraAMBResult = await conn.query(queryIdCarteraAMB);
        const idCarteraAMB = idCarteraAMBResult.length > 0 ? idCarteraAMBResult[0].ID_CARTERA : null;

        const queryInfoAdicional = `
        SELECT A.ID_TERCERO, B.NOMBRES, B.DIRECCION, B.CODIGO, B.TELEFONO, B.EMAIL 
        FROM DB2ADMIN.AMB_EMPRESAS A 
        INNER JOIN CRT_TERCEROS B ON A.ID_TERCERO = B.ID 
        WHERE A.USUARIO = ?`;

        const data = await conn.query(queryInfoAdicional, [usuario]);

        if (data.length === 0) {
            conn.close();
            return res.status(404).json({
                message: 'Usuario no encontrado'
            });
        }

        const {
            ID_TERCERO,
            NOMBRES,
            DIRECCION,
            CODIGO,
            TELEFONO,
            EMAIL
        } = data[0];

        const insertProFactura = `
          INSERT INTO REC_PRO_FACTURA (
            NRO_PRO_FACTURA, TOTAL_FACTURA, INTERESES_MOR_CAUSADOS, TOTAL_VALOR_CARTERA, TOTAL_SALDO_SANCIONES, FECHA_PRO_FACTURA, FECHA_EMI_FACTURA,
            ID_TERCERO, NOMBRES, DIRECCION, CODIGO, TELEFONO, EMAIL, ESTADO_PRO_FACTURA, CLASE_FACTURA
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const insertDetalleCartera = `
          INSERT INTO CRT_DETALLE_CARTERA (
            ID_CARTERA, TIPO_DOCUMENTO, CODIGO_CIUDAD, IDENTIFICACION, NOMBRE, TELEFONO, DIRECCION, EMAIL, CODIGO_REFERENCIA,
            NUMERO_OBLIGACION, VALOR_TOTAL, SALDO_CAPITAL, SALDO_SANCION, SALDO_INTERES, ESTADO, FECHA_VIGENCIA, ID_TERCERO
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const insertDetallesConceptos = `
          INSERT INTO CRT_DETALLES_CONCEPTOS_AMB (
            ID_DETALLE_CARTERA, NUMERO_OBLIGACION, REPORTE_ENTRADAS, NUMERO_NOVEDADES, BASE_LIQUIDACION,
            PERIODO, FECHA_CREACION, HORA_CREACION, USUARIO_CREACION, IP_CREACION, ESTADO,
            FECHA_ESTADO, HORA_ESTADO, USER_ESTADO, IP_ESTADO
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const aportes = [{
                nroFactura: numeroFacturaPDF1,
                totalFactura: aportesFet,
                totalValorCartera: aportesFet,
                idCartera: idCarteraFet
            },
            {
                nroFactura: numeroFacturaPDF2,
                totalFactura: aportesFQ,
                totalValorCartera: aportesFQ,
                idCartera: idCarteraFQ
            },
            {
                nroFactura: numeroFacturaPDF3,
                totalFactura: aportesAMB,
                totalValorCartera: aportesAMB,
                idCartera: idCarteraAMB
            }
        ];

        const insertarProFactura = async (aporte) => {
            // Obtener el contador correlativo y actualizarlo
            const updateCorrelativoQuery = `UPDATE GEN_CORRELATIVOS SET CONTADOR_CORRELATIVO = CONTADOR_CORRELATIVO + 1 WHERE ID_DOCUMENTO = 'FACTURAS'`;
            await conn.query(updateCorrelativoQuery);

            // Obtener el nuevo valor del contador correlativo
            const getCorrelativoQuery = `SELECT CONTADOR_CORRELATIVO FROM GEN_CORRELATIVOS WHERE ID_DOCUMENTO = 'FACTURAS'`;
            const correlativoResult = await conn.query(getCorrelativoQuery);
            const contadorCorrelativo = correlativoResult[0]?.CONTADOR_CORRELATIVO;

            await new Promise((resolve, reject) => {
                const nroProFactura = contadorCorrelativo.toString().padStart(10, '0');
                const params = [
                    nroProFactura,
                    aporte.totalFactura,
                    0, // INTERESES_MOR_CAUSADOS
                    aporte.totalValorCartera,
                    0, // TOTAL_SALDO_SANCIONES
                    formattedFechaEmision,
                    formattedFechaEmision, // FECHA_EMI_FACTURA
                    ID_TERCERO,
                    NOMBRES,
                    DIRECCION,
                    CODIGO,
                    TELEFONO,
                    EMAIL,
                    1, // ESTADO_PRO_FACTURA
                    1 // CLASE_FACTURA
                ];

                conn.query(insertProFactura, params, (err, result) => {
                    if (err) {
                        console.error('Error insertando registro en REC_PRO_FACTURA:', err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        };

        const insertarDetalleCartera = (aporte) => {
            return new Promise((resolve, reject) => {
                const carteraParams = [
                    aporte.idCartera, // ID_CARTERA 
                    '01', // TIPO_DOCUMENTO 
                    '00000000', // CODIGO_CIUDAD 
                    CODIGO, // IDENTIFICACION
                    NOMBRES, // NOMBRE
                    TELEFONO, // TELEFONO
                    DIRECCION, // DIRECCION
                    EMAIL, // EMAIL
                    CODIGO, // CODIGO_REFERENCIA
                    aporte.nroFactura, // NUMERO_OBLIGACION
                    aporte.totalFactura, // VALOR_TOTAL
                    aporte.totalFactura, // SALDO_CAPITAL
                    0, // SALDO_SANCION 
                    0, // SALDO_INTERES 
                    0, // ESTADO
                    formattedFechaEmision, // FECHA_VIGENCIA
                    ID_TERCERO // ID_TERCERO
                ];

                conn.query(insertDetalleCartera, carteraParams, (err, result) => {
                    if (err) {
                        console.error('Error insertando registro en CARTERA:', err);
                        reject(err);
                    } else {
                        // Obtener el ID del último registro insertado
                        const queryLastInsertId = 'SELECT IDENTITY_VAL_LOCAL() AS ID_DETALLE_CARTERA FROM SYSIBM.SYSDUMMY1';
                        conn.query(queryLastInsertId, (err, idResult) => {
                            if (err) {
                                console.error('Error obteniendo el ID del último registro insertado:', err);
                                reject(err);
                            } else {
                                const idDetalleCartera = idResult[0].ID_DETALLE_CARTERA;
                                resolve(idDetalleCartera);
                            }
                        });
                    }
                });
            });
        };

        const insertarDetallesConceptos = (aporte, idDetalleCartera) => {
            return new Promise((resolve, reject) => {
                const params = [
                    idDetalleCartera, // ID_DETALLE_CARTERA
                    `${periodo}${aporte.idCartera === idCarteraFet ? '8' : aporte.idCartera === idCarteraFQ ? '9' : '10'}${aporte.nroFactura}`, // NUMERO_OBLIGACION
                    reporteEntradas, // REPORTE_ENTRADAS
                    noNovedades, // NRO_NOVEDADES
                    baseLiquidacion, // BASE_LIQUIDACION
                    periodo, // PERIODO
                    formattedFechaEmision, // FECHA_CREACION
                    currentTime, // HORA_CREACION
                    usuario, // USUARIO_CREACION
                    '', // IP_CREACION
                    1, // ESTADO
                    formattedFechaEmision, // FECHA_ESTADO
                    currentTime, // HORA_ESTADO
                    usuario, // USER_ESTADO
                    '' // IP_ESTADO
                ];

                conn.query(insertDetallesConceptos, params, (err, result) => {
                    if (err) {
                        console.error('Error insertando registro en conceptos:', err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        };


        for (const aporte of aportes) {
            await insertarProFactura(aporte);
            const idCarteraInsertada = await insertarDetalleCartera(aporte);
            await insertarDetallesConceptos(aporte, idCarteraInsertada);
        }

        conn.close();
        return res.status(201).json({
            message: 'Registros guardados exitosamente en las tablas'
        });

    } catch (err) {
        console.error('Error guardando registros:', err);
        if (conn) {
            try {
                await conn.close();
            } catch (closeErr) {
                console.error('Error cerrando la conexión:', closeErr);
            }
        }
        return res.status(500).json({
            message: 'Error guardando los registros'
        });
    }
};