const express= require('express');
const app= express();
const mongoose= require('mongoose');
require('dotenv').config();
const authRoutes= require('./routes/authRoutes');
const userRoutes= require('./routes/userRoutes')
const walletRoutes= require('./routes/walletRoutes')
const errorHandler= require('./middlewares/errorHandler');
const transactionsRoutes= require('./routes/transactionRoutes');
const corsOptions = require('./middlewares/cors');
const cors= require('cors')
const helmet= require('helmet')
const xss =require('xss-clean')
const mongoSanitize= require('express-mongo-sanitize')
const hpp= require('hpp')
const {globalLimiter}= require('./middlewares/rateLimit')

app.use(helmet())
app.use(cors(corsOptions))
app.use(xss())
app.use(mongoSanitize())
app.use(hpp())


mongoose.connect(process.env.MONGO_URL).then(() => {
        console.log('Connected to MongoDB');
    }).catch((err) => {
        console.log('Error connection ot MongoDB', err.message);
})
app.use(express.json());
app.use(express.urlencoded({extended: true}));


app.use('/auth', authRoutes);
app.use('/user',userRoutes)
app.use('/wallets',walletRoutes)
app.use('/transactions',transactionsRoutes)
app.use(errorHandler);






const PORT= process.env.PORT || 3000;

app.listen(PORT, ()=> {
    console.log(`Server is running on ${PORT} port`);
})


