const AppError = require("../utils/appError");



const validateCancellationEligibility= (transaction) => {
    if(transaction.status === 'cancelled') {
        throw new AppError(400,'Error','Transaction already cancelled')
    }
    if (transaction.status === 'failed') {
        throw new AppError(400,'Error','Transaction already failed')
    }
    const hoursSinceCreation =(Date.now() - transaction.createdAt) /( 1000 * 60 * 60 )
    if(hoursSinceCreation > 24) {
        throw new AppError(400,'Error','Cannot return transaction older than 24 hours')
    }
    if(transaction.cancelRequest) {
        throw new AppError(400,'Error','Cancellation request already exists for this transaction')
    }
}

module.exports= validateCancellationEligibility