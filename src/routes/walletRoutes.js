const express=require('express')
const router= express.Router()
const verifyToken= require('../middlewares/verifyToken')
const controller= require('../controllers/walletController')
const { validateCreateWallet, validateUpdateWallet } = require('../middlewares/walletValidation')
const { walletReadLimiter, walletWriteLimiter, criticalLimiter, highValueLimiter } = require('../middlewares/rateLimit')

router.get('/',verifyToken,controller.getWallets)
router.get('/:id',verifyToken,controller.getWallet)
router.post('/',verifyToken,validateCreateWallet,controller.createWallet)
router.put('/:id',verifyToken,validateUpdateWallet,controller.updateWallet)
router.delete('/:id', verifyToken,controller.deleteWallet)



router.post('/deposit/:id',verifyToken,controller.deposit)
router.post('/withdraw/:id',verifyToken,controller.withdraw)
router.post('/send-money/:id',verifyToken,controller.sendMoney)





module.exports= router