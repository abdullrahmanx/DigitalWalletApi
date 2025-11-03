const express= require('express');
const app= express();
const mongoose= require('mongoose');
require('dotenv').config();
const authRoutes= require('./routes/authRoutes');
const userRoutes= require('./routes/userRoutes')
const walletRoutes= require('./routes/walletRoutes')
const errorHandler= require('./middlewares/errorHandler');
const transactionsRoutes= require('./routes/transactionRoutes');
const helmet= require('helmet')
const xss =require('xss-clean')
const mongoSanitize= require('express-mongo-sanitize')
const hpp= require('hpp')
const cors= require('cors'); 

app.use(helmet());
app.use(cors({
    origin: process.env.FRONT_URL ? process.env.FRONT_URL.split(',') : '*',
    credentials: true
}));
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

mongoose.connect(process.env.MONGO_URL).then(() => {
        console.log('Connected to MongoDB');
    }).catch((err) => {
        console.log('Error connection to MongoDB', err.message);
        process.exit(1); 
})

app.use(express.json({ limit: '10kb' })); 
app.use(express.urlencoded({extended: true, limit: '10kb'})); 

app.use('/auth',authRoutes);
app.use('/user',userRoutes)
app.use('/wallets',walletRoutes)
app.use('/transactions',transactionsRoutes)
app.use(errorHandler);


const PORT= process.env.PORT || 3000;

app.listen(PORT, ()=> {
    console.log(`Server is running on ${PORT} port`);
})