const express = require('express');


const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const walletRoutes = require('./routes/walletRoutes');
const errorHandler = require('./middlewares/errorHandler');
const transactionsRoutes = require('./routes/transactionRoutes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/wallets', walletRoutes);
app.use('/transactions', transactionsRoutes);
app.use(errorHandler);

module.exports = app;