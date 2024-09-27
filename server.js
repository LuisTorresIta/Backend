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

app.listen(port, () => {
  console.log(`Servidor backend escuchando en http://localhost:${port}`);
});