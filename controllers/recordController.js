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
        numeroFacturaPDF3
    } = req.body;

    if (!usuario || aportesFet === undefined || aportesFQ === undefined || aportesAMB === undefined || !fechaEmision) {
        return res.status(400).json({
            message: 'Todos los campos son requeridos'
        });
    }

    const fechaEmisionFormatted = new Date(fechaEmision);
    const formattedFechaEmision = fechaEmisionFormatted.toISOString().slice(0, 19).replace('T', ' ');

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

        const insertRegistro = `
          INSERT INTO REC_PRO_FACTURA (
            NRO_PRO_FACTURA, TOTAL_FACTURA, INTERESES_MOR_CAUSADOS, TOTAL_VALOR_CARTERA, TOTAL_SALDO_SANCIONES, FECHA_PRO_FACTURA, FECHA_EMI_FACTURA,
            ID_TERCERO, NOMBRES, DIRECCION, CODIGO, TELEFONO, EMAIL
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const insertCartera = `
          INSERT INTO CRT_DETALLE_CARTERA (
            ID_CARTERA, TIPO_DOCUMENTO, CODIGO_CIUDAD, IDENTIFICACION, NOMBRE, TELEFONO, DIRECCION, EMAIL, CODIGO_REFERENCIA,
            NUMERO_OBLIGACION, VALOR_TOTAL, SALDO_CAPITAL, SALDO_SANCION, SALDO_INTERES, ESTADO, FECHA_VIGENCIA, ID_TERCERO
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

        const insertarRegistro = (aporte) => {
            return new Promise((resolve, reject) => {
                const params = [
                    aporte.nroFactura,
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
                    EMAIL
                ];

                conn.query(insertRegistro, params, (err, result) => {
                    if (err) {
                        console.error('Error insertando registro en REC_PRO_FACTURA:', err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        };

        const insertarCartera = (aporte) => {
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

                console.log('Insertando registro en CARTERA con los siguientes parámetros:', carteraParams);

                conn.query(insertCartera, carteraParams, (err, result) => {
                    if (err) {
                        console.error('Error insertando registro en CARTERA:', err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        };

        await Promise.all(aportes.map(async (aporte) => {
            await insertarRegistro(aporte);
            await insertarCartera(aporte);
        }));

        conn.close();
        return res.status(201).json({
            message: 'Registros guardados exitosamente en ambas tablas'
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