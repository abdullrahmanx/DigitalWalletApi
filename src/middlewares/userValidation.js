const Joi = require('joi');

const signupSchema = Joi.object({
    name: Joi.string().min(3).max(20).required().messages({
        'string.empty': 'Name cannot be empty',
        'string.min': 'Name must be at least 3 characters',
        'string.max': 'Name cannot exceed 20 characters',
        'any.required': 'Name is required'
    }),
    email: Joi.string().email().required().messages({
        'string.empty': 'Email cannot be empty',
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: Joi.string().min(6).required().messages({
        'string.empty': 'Password cannot be empty',
        'string.min': 'Password must be at least 6 characters',
        'any.required': 'Password is required'
    }),
    phone: Joi.string().pattern(/^\+?\d{7,15}$/).required().messages({
        'string.empty': 'Phone cannot be empty',
        'string.pattern.base': 'Phone number must be 7-15 digits and can start with +',
        'any.required': 'Phone is required'
    })
});


const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'string.empty': 'Email cannot be empty',
        'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Password cannot be empty',
        'any.required': 'Password is required'
    })
});


const updateProfileSchema = Joi.object({
    name: Joi.string().min(3).max(20).messages({
        'string.empty': 'Name cannot be empty',
        'string.min': 'Name must be at least 3 characters',
        'string.max': 'Name cannot exceed 20 characters'
    }),
    phone: Joi.string().pattern(/^\+?\d{7,15}$/).required().messages({
        'string.empty': 'Phone cannot be empty',
        'string.pattern.base': 'Phone number must be 7-15 digits and can start with +',
        'any.required': 'Phone is required'
    }),
}).or('name', 'phone' ) 
  .messages({
      'object.missing': 'Provide at least one of: name or phone'
  });


const validateSignup = (req, res, next) => {
    const { error } = signupSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
        const errors = error.details.map(err => err.message);
        return res.status(400).json({ status: 'Error', message: errors.join(', ') });
    }
    next();
};

const validateLogin = (req, res, next) => {
    const { error } = loginSchema.validate(req.body, { abortEarly: false });
    if (error) {
        const errors = error.details.map(err => err.message);
        return res.status(400).json({ status: 'Error', message: errors.join(', ') });
    }
    next();
};

const validateProfile = (req, res, next) => {
    const { error } = updateProfileSchema.validate(req.body, { abortEarly: false });
    if (error) {
        const errors = error.details.map(err => err.message);
        return res.status(400).json({ status: 'Error', message: errors.join(', ') });
    }
    next();
};

module.exports = { validateSignup, validateLogin, validateProfile };
