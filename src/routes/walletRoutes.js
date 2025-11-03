const express=require('express')
const router= express.Router()
const verifyToken= require('../middlewares/verifyToken')
const { validateCreateWallet, validateUpdateWallet } = require('../middlewares/walletValidation')
const { walletReadLimiter, walletWriteLimiter, criticalLimiter, highValueLimiter } = require('../middlewares/rateLimit')
const {getWallets,
    getWallet,
    createWallet,
    updateWallet,
    deleteWallet,
    deposit
    ,withdraw,
    sendMoney } = require('../controllers/walletController')

    
router.get('/',walletReadLimiter,verifyToken,getWallets)

router.get('/:id',walletReadLimiter,verifyToken,getWallet)

router.post('/',walletWriteLimiter,verifyToken,validateCreateWallet,createWallet)

router.put('/:id',walletWriteLimiter,verifyToken,validateUpdateWallet,updateWallet)

router.delete('/:id', walletWriteLimiter,verifyToken,deleteWallet)



router.post('/deposit/:id',criticalLimiter,verifyToken,deposit)

router.post('/withdraw/:id',criticalLimiter,verifyToken,withdraw)

router.post('/send-money/:id',criticalLimiter,verifyToken,sendMoney)





module.exports= router