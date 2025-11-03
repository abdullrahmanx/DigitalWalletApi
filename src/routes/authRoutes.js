const express= require('express');
const router= express.Router();
const {signUp,
    login,
    logout,
    changePassword
    ,forgotPassword,
    resetPassword,
    refresh,
    verifyEmail,
} = require('../controllers/userController')
const {authLimiter}= require('../middlewares/rateLimit')
const verifyToken = require('../middlewares/verifyToken');
const { validateSignup, validateLogin } = require('../middlewares/userValidation');

router.use(authLimiter)

router.post('/register', validateSignup,signUp);
router.get('/verify-email/:token', verifyEmail)
router.post('/login',validateLogin,login)
router.post('/logout',logout)
router.put('/password',verifyToken,changePassword)
router.post('/forgot-password',forgotPassword)
router.post('/reset-password/:token',resetPassword)
router.post('/refresh-token',refresh)










module.exports= router;