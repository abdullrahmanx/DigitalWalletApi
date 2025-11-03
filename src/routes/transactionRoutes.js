const express=require('express')
const router= express.Router()
const verifyToken= require('../middlewares/verifyToken')
const {getTransaction
    ,getCancellationRequests,
    getTransactionHistory,
    approveCanellation,
    rejectCancellation,
    requestTransactionCancellation
}= require('../controllers/walletController')

const requireAdmin= require('../middlewares/verifyRole')
const { walletReadLimiter } = require('../middlewares/rateLimit')


router.post('/cancel-request/:id',walletReadLimiter,verifyToken,requestTransactionCancellation)

router.get('/cancel-requests',verifyToken,requireAdmin,getCancellationRequests)
router.post('/cancel-approve/:id',verifyToken,requireAdmin,approveCanellation)
router.post('/cancel-reject/:id',verifyToken,requireAdmin,rejectCancellation)



router.get('/history', walletReadLimiter,verifyToken, getTransactionHistory);
router.get('/:id',walletReadLimiter,verifyToken,getTransaction)








module.exports= router