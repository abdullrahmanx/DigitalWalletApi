const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const walletRoutes = require('./routes/walletRoutes');
const errorHandler = require('./middlewares/errorHandler');
const transactionsRoutes = require('./routes/transactionRoutes');

const app = express();


app.use(helmet());
app.use(cors({
    origin: process.env.FRONT_URL ? process.env.FRONT_URL.split(',') : '*',
    credentials: true
}));
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({extended: true, limit: '10kb'}));

app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/wallets', walletRoutes);
app.use('/transactions', transactionsRoutes);
app.use(errorHandler);

module.exports = app;