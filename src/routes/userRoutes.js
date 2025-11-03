const express= require('express');
const router= express.Router()
const verifyToken=require('../middlewares/verifyToken')
const { validateProfile } = require('../middlewares/userValidation');
const {userProfile,updateProfile} = require('../controllers/userController')



router.get('/me',verifyToken,userProfile)

router.put('/me',verifyToken,validateProfile,updateProfile)


module.exports= router