const Joi= require('joi')
const AppError = require('../utils/appError')


const createWalletSchema= Joi.object({
    pin: Joi.string().pattern(/^\d{4,6}$/).required().messages({
        'string.pattern.base': 'Pin must be 4-6 digits',
        'string.empty': 'Pin cannot be empty',
        'any.required': 'Pin is required'
    }),
    currency: Joi.string().valid('USD','EGP','EUR').required().messages({
        'any.required': 'Currency is required',
        'any.only': 'Currency must be one of : USD, EGP, EUR',
        'string.empty': 'Currnecy cannot be empty'
    })
})

const updateWalletSchema= Joi.object({
     pin: Joi.string().pattern(/^\d{4,6}$/).messages({
        'string.pattern.base': 'Pin must be 4-6 digits',
        'string.empty': 'Pin cannot be empty',
    }),
    currency: Joi.string().valid('USD','EGP','EUR').messages({
        'any.only': 'Currency must be one of : USD, EGP, EUR',
        'string.empty': 'Currnecy cannot be empty'
    }),
    status: Joi.string().valid('active', 'suspended', 'frozen').messages({
        'any.only': 'Status must be one of : active, suspended, frozen',
        'string.empty': 'Currnecy cannot be empty'
      
    })
}).min(1)




const validateCreateWallet= async  (req,res,next) => {
    try {
        const {error} = await createWalletSchema.validate(req.body,
            {abortEarly: false,stripUnknown: true })
        if(error) {
            const errors= error.details.map(err => err.message).join(', ')
            return next(new AppError(400,'Error',errors))
        }
        next()
    }catch(error) {
        return next(error)
    }  
}
const validateUpdateWallet= async (req,res,next) => {
    try {
        const {error}= await updateWalletSchema.validate(req.body, {
            abortEarly: false, stripUnknown: true
        })
        if(error) {
            const errors= error.details.map(err => err.message).join(', ')
            return next (new AppError(400,'Error',errors))
        }
        next()
    }catch(error) {
        next(error)
    }
}
module.exports= {validateCreateWallet,validateUpdateWallet}