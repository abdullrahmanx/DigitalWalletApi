const mongoose= require('mongoose')

const transactionSchema= mongoose.Schema({
    wallet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Wallet',
        required: true
    },
    type: {
        type: String,
        enum: ['deposit','withdraw','transfer_in','transfer_out'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending','completed','failed','cancelled'],
        default: 'pending'
    },
    recipientWallet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Wallet',
        required: function() {
            this.type === 'transfer_out'
        }
    },
    senderWallet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Wallet',
        required: function() {
            this.type === 'transfer_in'
        }
    },
    reason : {
        type: String,
        default: null
    },
    cancelRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CancelTransaction'
    }
}, {timestamps: true, versionKey: false})

transactionSchema.index({ wallet: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ to: 1 });


module.exports= mongoose.model('Transaction',transactionSchema)