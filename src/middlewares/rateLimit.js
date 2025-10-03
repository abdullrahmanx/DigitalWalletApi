const rateLimit=require('express-rate-limit')

const loginAttempts = new Map()
const bannedIps= new Set()

const authHandler= (req,res,next) => {
   
    const ip = req.ip
    if(bannedIps.has(ip)){
        return res.status(403).json({
            success: false,
            message: 'Your IP has been permanently banned due to repeated abuse.'
        })
    }
  
    const attempts= loginAttempts.get(ip) || 0
    const newAttempts= attempts + 1

    loginAttempts.set(ip,newAttempts)
 
    if(newAttempts >= 50) {
                bannedIps.add(ip)
                return res.status(429).json({
                    success: false,
                    message: 'You are permanently banned.'
                })
    }else if(newAttempts >= 5) {
            setTimeout(() => {
                loginAttempts.delete(ip)
            }, 15 * 60 * 1000)
            return res.status(429).json({
                success: false,
                message: 'Too many login attempts. Try again after 15 minutes.',
                retryAfter: '15 minutes'
            })
    }
    next()
} 

const authLimiter= rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message :'Too many login attempts. Please try again after 15 minutes.'
    },
    skipSuccessfulRequests: true, 
    skipFailedRequests: false,
    handler: authHandler
})

const walletReadLimiter= rateLimit({
    windowMs: 1 * 15 * 1000,
    max: 2,
    message: {
        success: false,
        message: 'Too many requests, please wait a moment'
    },
    standardHeaders: true,
    legacyHeaders: false
})

const walletWriteLimiter= rateLimit({
    windowMs: 1 * 15 * 1000,
    max: 1,
    message: {
        success: false,
        message: 'Too many wallet operations. Please slow down.'
    },
    standardHeaders: true,
    legacyHeaders: false
})

const criticalLimiter= rateLimit({
    windowMs: 1 * 15 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Too many transaction attempts. Please wait before trying again.',
        retryAfter: '1 minute'
    },
    skipSuccessfulRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req,res) => {
        console.warn(`[SECURITY] Rate limit exceeded for ${req.path} form IP: ${req.ip}`)

        res.status(429).json({
            success: false,
            message: 'Too many transaction attempts detected. Your account has been temporarily restricted for security.',
            retryAfter: '1 minute'
        });
    }
})

const highValueLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 3,
    message: {
        success: false,
        message: 'High value tranfer limit. Please wait 5 minutes',
        retryAfter: '5 minutes'
    },
    skip: (req) => {
        return !req.body.amount || req.body.amount < 1000
    },
    handler: (req,res) => {
        console.warn(`[CRITICAL] High value transfer limit exceeded from IP: ${req.ip}, Amount ${req.body.amount}`)
        res.status(429).json({
            success: false,
            message: 'Security alert: Too many high-value transfers. Please contact support if this is legitimate.'
        })
    }
})

const globalLimiter= rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: 'Too many, requests please try again later '
    },
    skipSuccessfulRequests: false,
    standardHeaders: true,
    legacyHeaders: false
})






module.exports= {authLimiter,walletReadLimiter,walletWriteLimiter,highValueLimiter,criticalLimiter,globalLimiter}