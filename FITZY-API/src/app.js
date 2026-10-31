require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('node:path');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.set('trust proxy', 1);
const origins = (process.env.CLIENT_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(value => value.trim());
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin(origin, callback) { if (!origin || origins.includes('*') || origins.includes(origin)) return callback(null, true); callback(new Error('Origin is not allowed by CORS')); }, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || 'uploads'), { maxAge: '1d', immutable: false }));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
