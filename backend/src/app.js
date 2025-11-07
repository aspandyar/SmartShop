const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const productRoutes = require('./routes/productRoutes');

const app = express();

app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/products', productRoutes);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Unexpected error' });
  next(err);
});

module.exports = app;

