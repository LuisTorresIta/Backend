const express = require('express');
const cors = require('cors');
const ibmdb = require('ibm_db');
const dotenv = require('dotenv');
// const crypto = require('crypto');
const md5 = require('md5');

dotenv.config();

const app = express();

app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));

app.use(express.json());
const port = 3000;

// Configuración de la conexión a DB2
const connectionString = `DATABASE=${process.env.DB_NAME};HOSTNAME=${process.env.DB_HOST};UID=${process.env.DB_USER};PWD=${process.env.DB_PASSWORD};PORT=${process.env.DB_PORT};PROTOCOL=TCPIP;`;

app.get('/api/check-connection', (req, res) => {
  ibmdb.open(connectionString, (err, conn) => {
    if (err) {
      return res.status(500).send('Error al conectar a DB2: ' + err.message);
    }

    res.send('Conexión a DB2 realizada con éxito');
    conn.close();
  });
});

app.get('/api/query', (req, res) => {
  ibmdb.open(connectionString, (err, conn) => {
    if (err) {
      return res.status(500).send('Error al conectar a DB2: ' + err.message);
    }

    const query = 'SELECT * FROM DB2ADMIN.AMB_EMPRESAS';

    conn.query(query, (err, data) => {
      if (err) {
        return res.status(500).send('Error en la consulta: ' + err.message);
      }

      res.json(data);
      conn.close();
    });
  });
});


app.post('/login', (req, res) => {
  const {
    usuario,
    clave
  } = req.body;

  console.log('Usuario recibido:', usuario);
  console.log('Clave recibida (sin cifrar):', clave);

  if (!usuario || !clave) {
    return res.status(400).send('Usuario and clave are required');
  }

  const hashedClave = md5(clave);
  console.log('Clave cifrada:', hashedClave);

  ibmdb.open(connectionString, (err, conn) => {
    if (err) {
      return res.status(500).send('Error connecting to the database');
    }

    const sql = `SELECT usuario, nombre_empresa FROM DB2ADMIN.AMB_EMPRESAS WHERE usuario = ? AND clave = ?`;

    conn.query(sql, [usuario, hashedClave], (err, result) => {
      if (err) {
        conn.close();
        return res.status(500).send('Error querying the database');
      }

      if (result.length > 0) {
        res.status(200).json({
          message: 'Login successful',
          usuario: result[0].USUARIO,
          empresa: result[0].NOMBRE_EMPRESA
        });
      } else {
        res.status(401).send('Invalid credentials');
      }

      conn.close();
    });
  });
});


app.post('/change-password', (req, res) => {
  const {
    usuario,
    currentPassword,
    newPassword
  } = req.body;

  if (!usuario || !currentPassword || !newPassword) {
    return res.status(400).json({
      message: 'Usuario, contraseña actual y nueva contraseña son requeridos'
    });
  }

  const hashedCurrentPassword = md5(currentPassword);
  const hashedNewPassword = md5(newPassword);

  ibmdb.open(connectionString, (err, conn) => {
    if (err) {
      console.error('Error conectando a la base de datos:', err);
      return res.status(500).json({
        message: 'Error conectando a la base de datos'
      });
    }

    const sqlVerify = `SELECT usuario FROM DB2ADMIN.AMB_EMPRESAS WHERE usuario = ? AND clave = ?`;

    conn.query(sqlVerify, [usuario, hashedCurrentPassword], (err, result) => {
      if (err) {
        console.error('Error en la consulta de verificación:', err);
        conn.close();
        return res.status(500).json({
          message: 'Error en la consulta de verificación'
        });
      }

      if (result.length === 0) {
        conn.close();
        return res.status(401).json({
          message: 'La contraseña actual es incorrecta'
        });
      }

      const sqlUpdate = `UPDATE DB2ADMIN.AMB_EMPRESAS SET clave = ? WHERE usuario = ?`;

      conn.query(sqlUpdate, [hashedNewPassword, usuario], (err) => {
        if (err) {
          console.error('Error actualizando la contraseña:', err);
          conn.close();
          return res.status(500).json({
            message: 'Error actualizando la contraseña'
          });
        }

        conn.close();
        return res.status(200).json({
          message: 'Contraseña cambiada exitosamente'
        });
      });
    });
  });
});


app.get('/periodos', (req, res) => {
  ibmdb.open(connectionString, (err, conn) => {
    if (err) {
      return res.status(500).send('Error connecting to the database');
    }

    const sql = 'SELECT ID, PERIODO, FECHA_INICIO, FECHA_FINAL FROM DB2ADMIN.AMB_PERIODOS WHERE ESTADO = 1';

    conn.query(sql, (err, result) => {
      if (err) {
        conn.close();
        return res.status(500).send('Error querying the database');
      }

      res.status(200).json(result);
      conn.close();
    });
  });
});


app.post('/saveRecord', (req, res) => {
  console.log('Datos recibidos en saveRegister:', req.body);

  const {
    usuario,
    empresa
  } = req.body.usuario;

  const {
    // usuario,
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

  ibmdb.open(connectionString, (err, conn) => {
    if (err) {
      console.error('Error conectando a DB2:', err);
      return res.status(500).json({
        message: 'Error conectando a la base de datos'
      });
    }

    const queryInfoAdicional = `
      SELECT A.ID_TERCERO, B.NOMBRES, B.DIRECCION, B.CODIGO, B.TELEFONO, B.EMAIL 
      FROM AMB_EMPRESAS A 
      INNER JOIN CRT_TERCEROS B ON A.ID_TERCERO = B.ID 
      WHERE A.USUARIO = ?
    `;

    conn.query(queryInfoAdicional, [usuario], (err, data) => {
      if (err) {
        console.error('Error en la consulta de información adicional:', err);
        conn.close();
        return res.status(500).json({
          message: 'Error obteniendo información adicional'
        });
      }

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

      Promise.all(aportes.map(insertarRegistro))
        .then(results => {
          conn.close();
          return res.status(201).json({
            message: 'Registros guardados exitosamente'
          });
        })
        .catch(err => {
          console.error('Error insertando en registro:', err);
          conn.close();
          return res.status(500).json({
            message: 'Error guardando los registros'
          });
        });
    });
  }); 
});

app.listen(port, () => {
  console.log(`Servidor backend escuchando en http://localhost:${port}`);
});