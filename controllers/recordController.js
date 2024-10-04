const connectDB = require('../config/db');

exports.saveRecord = async (req, res) => {
    console.log('Datos recibidos en saveRecord:', req.body);

    const {
        usuario,
        empresa
    } = req.body.usuario;

    const {
        aportesFet,
        aportesFQ,
        aportesAMB,
        fechaEmision,
        numeroFacturaPDF1,
        numeroFacturaPDF2,
        numeroFacturaPDF3
    } = req.body;

    const fechaEmisionFormatted = new Date(fechaEmision);
    const formattedFechaEmision = fechaEmisionFormatted.toISOString().slice(0, 19).replace('T', ' ');

    if (!usuario || aportesFet === undefined || aportesFQ === undefined || aportesAMB === undefined || !fechaEmision) {
        return res.status(400).json({
            message: 'Todos los campos son requeridos'
        });
    }

    let conn;
    try {
        conn = await connectDB();

        const queryInfoAdicional = `
      SELECT A.ID_TERCERO, B.NOMBRES, B.DIRECCION, B.CODIGO, B.TELEFONO, B.EMAIL 
      FROM DB2ADMIN.AMB_EMPRESAS A 
      INNER JOIN CRT_TERCEROS B ON A.ID_TERCERO = B.ID 
      WHERE A.USUARIO = ?
    `;

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

        const aportes = [{
                nroFactura: numeroFacturaPDF1,
                totalFactura: aportesFet,
                totalValorCartera: aportesFet
            },
            {
                nroFactura: numeroFacturaPDF2,
                totalFactura: aportesFQ,
                totalValorCartera: aportesFQ
            },
            {
                nroFactura: numeroFacturaPDF3,
                totalFactura: aportesAMB,
                totalValorCartera: aportesAMB
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
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        };

        await Promise.all(aportes.map(insertarRegistro));

        conn.close();
        return res.status(201).json({
            message: 'Registros guardados exitosamente'
        });

    } catch (err) {
        console.error('Error guardando registros:', err);
        if (conn) {
            try {
                await conn.rollback();
                await conn.close();
            } catch (rollbackErr) {
                console.error('Error haciendo rollback o cerrando la conexión:', rollbackErr);
            }
        }
        return res.status(500).json({
            message: 'Error guardando los registros'
        });
    }
};