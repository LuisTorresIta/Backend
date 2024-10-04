const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const authRoutes = require('./routes/authRoutes');
const queryRoutes = require('./routes/queryRoutes');
const recordRoutes = require('./routes/recordRoutes');
const errorHandler = require('./middlewares/errorHandler');

dotenv.config();

const app = express();

app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', queryRoutes);
app.use('/api', recordRoutes);

app.use(errorHandler);

const port = 3000;

app.listen(port, () => {
  console.log(`Servidor backend escuchando en http://localhost:${port}`);
});