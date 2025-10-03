const AppError = require("../utils/appError")
const jwt= require('jsonwebtoken')




const verifyToken = (req,res,next) => {
    try {
        const authHeader=req.headers['authorization']
        if(!authHeader){
            return next(new AppError(401,'Error','Authorization header is required'))
        }
        const token= authHeader.split(' ')[1]
        if(!token) {
            return next(new AppError(401,'Error','Token is required'))
        }
        const decodedToken= jwt.verify(token,process.env.JWT_SECRET)
        req.user= decodedToken
        next()
    } catch(error) {
        next(error)
    }
}
module.exports= verifyToken