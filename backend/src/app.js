const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/users');
const interactionRoutes = require('./routes/interactions');
const recommendationRoutes = require('./routes/recommendations');
const authRoutes = require('./routes/auth');
const interactionTypeRoutes = require('./routes/interactionTypes');

const app = express();

app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SmartShop API Documentation',
}));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/interaction-types', interactionTypeRoutes);

app.use((err, req, res, next) => {
  const { handleMongooseError } = require('./utils/errorHandler');
  const errorInfo = handleMongooseError(err);
  res.status(errorInfo.status).json({ message: errorInfo.message, errors: errorInfo.errors });
});

module.exports = app;

