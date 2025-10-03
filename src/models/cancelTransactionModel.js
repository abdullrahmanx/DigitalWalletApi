const mongoose= require('mongoose')


const cancelTransactionSchema= mongoose.Schema({
    transaction : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        required: true
    },
    requestedBy: {
        type : mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reason: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: 'String',
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    adminResponse :{
        admin : {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        decison: {
            type: 'String',
            enum: ['approved', 'rejected']
        },
         adminReason: {
            type: String,
            trim: true
        },
        processedAt: Date
    },
    priority : {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    }
}, {timestamps: true, versionKey: false})

module.exports= mongoose.model('CancelTransaction', cancelTransactionSchema)