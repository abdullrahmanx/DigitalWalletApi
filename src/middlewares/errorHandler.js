const AppError= require('../utils/appError');

const errorHandler= (err,req,res,next) => {
    if(err.name==='ValidationError') {
        const errors= Object.fromEntries(Object.values(err.errors).map(err => [err.path,err.message]));
        const error= new AppError(400, 'Error',errors);
        return res.status(error.statusCode || 400).json({
            status: error.status,
            message: error.message
           
        })
    }
    if (err.code === 11000) {
        const field= err.keyValue ? Object.keys(err.keyValue) : [];
        const msg= field.length ? `${field[0]} already exists` : 'Duplicate key error';
        const error= new AppError(400, 'Error',msg)
        return res.status(error.statusCode || 400).json({
            status: error.status,
            message: error.message,
            details: err.keyValue || 'Unknown field'
        })
    }
    if(err.name==='CastError') {
        const error= new AppError(400, 'Error', `Invalid Id: ${err.value}`)
        return res.status(error.statusCode || 400).json({
            status: error.status,
            message: error.message
        })
    }
    return res.status(err.statusCode || 500).json({
        status: err.status,
        message: err.message || 'Internal Server Error'
    })
}
module.exports= errorHandler;