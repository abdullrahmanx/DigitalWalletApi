const express= require('express');
const router= express.Router();
const controller= require('../controllers/userController');
const verifyToken = require('../middlewares/verifyToken');
const { validateSignup, validateLogin } = require('../middlewares/userValidation');
const { authLimiter } = require('../middlewares/rateLimit');

router.use(authLimiter)

router.post('/register', validateSignup,controller.signUp);
router.get('/verify-email/:token', controller.verifyEmail)
router.post('/login',validateLogin,controller.login)
router.post('/logout',controller.logout)
router.put('/password',verifyToken,controller.changePassword)
router.post('/forgot-password',controller.forgotPassword)
router.post('/reset-password/:token',controller.resetPassword)
router.post('/refresh-token',controller.refresh)










module.exports= router;