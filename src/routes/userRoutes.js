const express= require('express');
const router= express.Router()
const verifyToken=require('../middlewares/verifyToken')
const controller= require('../controllers/userController');
const { validateProfile } = require('../middlewares/userValidation');




router.get('/me',verifyToken,controller.userProfile)

router.put('/me',verifyToken,validateProfile,controller.updateProfile)


module.exports= router