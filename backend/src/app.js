const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/users');
const interactionRoutes = require('./routes/interactions');
const recommendationRoutes = require('./routes/recommendations');

const app = express();

app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/recommendations', recommendationRoutes);

app.use((err, req, res, next) => {
  const { handleMongooseError } = require('./utils/errorHandler');
  const errorInfo = handleMongooseError(err);
  res.status(errorInfo.status).json({ message: errorInfo.message, errors: errorInfo.errors });
});

module.exports = app;

