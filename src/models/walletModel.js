const { required } = require('joi')
const mongoose= require('mongoose')

const walletSchema= mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    balance :{
        type: Number,
        default: 0,
        min: 0
    },
    currency : {
        type: String,
        required: [true, 'Currency is required'],
        enum: ['EGP','USD','EUR'],
        default: 'EGP'
    },
    pin : {
        type: String,
        required: true
    },
    transactions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    }],
    status: {
        type: String,
        enum : ['active','suspended','frozen'],
        default: 'active'
    },
    dailyLimit: {
        type: Number,
        default: 10000,
    },
    monthlyLimit: {
        type: Number,
        default: 100000
    }
}, {timestamps: true, versionKey: false})

module.exports= mongoose.model('Wallet',walletSchema)