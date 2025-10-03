const AppError = require("../utils/appError")


const requireAdmin= async (req,res,next) => {
    try {
        if(!req.user || req.user.role !== 'admin') {
            return next(new AppError(403,'Error','Admin access required'))
        }
        next()
    }catch(error) {
        next(error)
    }
}

module.exports= requireAdmin