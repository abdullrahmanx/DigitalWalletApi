const express=require('express')
const router= express.Router()
const verifyToken= require('../middlewares/verifyToken')
const controller= require('../controllers/walletController')
const requireAdmin= require('../middlewares/verifyRole')


router.post('/cancel-request/:id',verifyToken,controller.requestTransactionCancellation)
// admin 
router.get('/cancel-requests',verifyToken,requireAdmin,controller.getCancellationRequests)
router.post('/cancel-approve/:id',verifyToken,requireAdmin,controller.approveCanellation)
router.post('/cancel-reject/:id',verifyToken,requireAdmin,controller.rejectCancellation)



// user
router.get('/history', verifyToken, controller.getTransactionHistory);
router.get('/:id',verifyToken,controller.getTransaction)








module.exports= router