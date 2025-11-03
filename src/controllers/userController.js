const User= require('../models/userModel')
const bcrypt= require('bcryptjs');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const crypto= require('crypto')
const {sendPasswordResetEmail}=require('../utils/email')
const nodemailer= require('nodemailer')
const {sendEmail} = require('../utils/email')




exports.signUp= async (req,res,next) => {
    try {
    const {name,email,password,phone}= req.body;
    if(!name || !email || !password || !phone) {
        return next(new AppError(400, 'Error', 'All fields are required'));
    }
    if(req.body.role) {
        return next(new AppError(400, 'Error', 'You cant choose your role'));
    }
    if(password.length < 6) {
        return next(new AppError(400, 'Error', 'Password cannot be less than 6 characters'));
    }
    const existingUser= await User.findOne({email});
    if(existingUser) {
        return next(new AppError(400, 'Error', 'Email already used'));
    }
    
    const hashedPassword= await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    
    const user= await User.create({
        name,
        email,
        password: hashedPassword,
        phone,
        verificationToken: hashedToken,
        verificationTokenExpires: Date.now() + 60 * 60 * 1000 
    });

    const verifyUrl = `${req.protocol}://${req.get('host')}/auth/verify-email/${verificationToken}`;
    console.log(verifyUrl)
    await sendEmail({
        to: user.email,
        subject: 'Verify your email',
        text: `Please verify your account by clicking this link: ${verifyUrl}`,
        html: `
            <p>Hello ${user.name},</p>
            <p>Click the link below to verify your account:</p>
            <a href="${verifyUrl}">${verifyUrl}</a>
         `
    });


    const accessToken= jwt.sign({id: user._id, role: user.role}
        , process.env.JWT_SECRET, {expiresIn: '1d'}
    )
    const refreshToken= jwt.sign({id: user._id},
        process.env.JWT_REFRESH, {expiresIn: '7d'}
    )
    const userData= await User.findById(user._id).select('-password');
    res.status(201).json({
        success: true,
        message: 'User created successfully please verify email',
        data: userData,
        token: {
            accessToken,
            refreshToken
        }
    })
    } catch(error) {
        next(error)
    }
}
exports.verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.params;
        if (!token) {
        return next(new AppError(400, 'Error', 'Verification token is required'));
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
        verificationToken: hashedToken,
        verificationTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
        return next(new AppError(400, 'Error', 'Token is invalid or has expired'));
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
        success: true,
        message: 'Email verified successfully. You can now log in.'
        });
    } catch (error) {
        next(error);
  }
};

exports.login= async (req,res,next) => {
    const {email, password} =req.body; 
    if(!email || !password ) {
        return next(new AppError(400,'Error','Email and password are required'))
    }
    const user= await User.findOne({email})
    if(!user) {
        return next(new AppError(401,'Error','Invalid credentials'))
    }
    if (!user.isVerified) {
      return next(new AppError(403, 'Error', 'Please verify your email before logging in.'));
    }
    const comparePassword= await bcrypt.compare(password, user.password)
    if(!comparePassword) {
        return next(new AppError(401,'Error','Invalid credentials'))
    }
    
    const accessToken = jwt.sign({id: user._id,role: user.role},
        process.env.JWT_SECRET, {expiresIn: '1d'}
    )
    const refreshToken= jwt.sign({id: user._id},
        process.env.JWT_REFRESH, {expiresIn: '7d'}
    )
    user.refreshToken= refreshToken
    await user.save()

    
    res.status(200).json({
        success: true,
        message: 'Login successfully',
        token: {
            accessToken,
            refreshToken
        }
    })

}
exports.refresh= async (req,res,next) => {
    const {refreshToken} = req.body;
    if (!refreshToken) {
      return next(new AppError(401, "Error", "Refresh token is required"));
    }
    const user= await User.findOne({refreshToken});
    console.log(user)
    if (!user) {
      return next(new AppError(403, "Error", "Invalid refresh token"));
    }
    let decoded
    try {
        decoded= jwt.verify(refreshToken,process.env.JWT_REFRESH)
    }catch (err) {
        return next(new AppError(401, "Error", "Invalid or expired refresh token"));
    }
  
    const accessToken= jwt.sign({id: user._id, role: user.role},
        process.env.JWT_SECRET, {expiresIn: '15m'}
    )
    res.status(200).json({
      success: true,
      accessToken
    });
}
exports.logout= async (req,res,next) => {
    try {
        const {refreshToken} = req.body;
        if(!refreshToken) {
            return next(new AppError(401, "Error", "Refresh token is required"));
        }
        const user= await User.findOne({refreshToken});
        if (!user) {
        return next(new AppError(403, "Error", "Invalid refresh token"));
        }
        user.refreshToken= null;
        await user.save()
        res.status(200).json({
        success: true,
        message: "Logged out successfully"
        });
    } catch(error) {
        next(error)
    }
}
exports.changePassword= async (req,res,next) => {
    try {
        const userId= req.user.id;
        const {currentPassword,newPassword}= req.body;
        if(!currentPassword || !newPassword) {
            return next(new AppError(400,'Error','Current and new password are required'))
        }
        if(newPassword.length <6) {
            return next(new AppError(400,'Error','New password must be atleast 6 characters'))
        }
        const user= await User.findById(userId);
        const comparePassword= await bcrypt.compare(currentPassword, user.password)

        if(!comparePassword) {
            return next(new AppError(400,'Error','Current password is incorrect'))
        }
        const newHashedPassword= await bcrypt.hash(newPassword, 12)
        
        user.password= newHashedPassword

        await user.save()
        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        })
    } catch(error) {
        next(error)
    }
}


exports.forgotPassword= async(req,res,next) => {
    try {
        const { email } = req.body;
        if(!email) {
            return next(new AppError(400,'Error','Enter your email'))
        }
        const user =await User.findOne({email})
        if(!user) {
            return res.status(200).json({
                status: 'Success',
                message: 'If the email exists, we will send you a reset link'
            })
        }
        const resetToken= crypto.randomBytes(32).toString('hex')
        const hashedToken=  crypto.createHash('sha256').update(resetToken).digest('hex')

        user.passwordResetToken= hashedToken
        user.resetPasswordExpires= Date.now() + 15 * 60 * 1000
        await user.save();

        const resetURL= `${process.env.FRONT_URL 
            || 'http://localhost:3000'}/auth/reset-password/${resetToken}`



        const emailInfo= await sendPasswordResetEmail(email,resetURL,user.name)
        const previewUrl= nodemailer.getTestMessageUrl(emailInfo)
        res.status(200).json({
            success: true,
            message: 'Check your mailbox',
            resetURL,
            previewUrl
        })    
    }catch(error) {
        next(error)
    }
}
exports.resetPassword= async (req,res,next) => {
    try {
        const { newPassword}= req.body
        const {token} =req.params
        if(!newPassword) {
            return next(new AppError(400,'Error','New password is requiredError'))
        }
        if(newPassword.length < 6) {
            return next(new AppError(400,'Error','New password must be at least 6 chartavters'))
        }
        const hashedToken= crypto.createHash('sha256').update(token).digest('hex')
        const user= await User.findOne({
            passwordResetToken: hashedToken,
            resetPasswordExpires: {$gte: Date.now()}
        })
        if(!user) {
            return next(new AppError(400,'Error','Invalid or expired reset token'))
        }
        const hashedPassword= await bcrypt.hash(newPassword,12
        )
        user.password= hashedPassword

        user.resetPasswordExpires=undefined;
        user.passwordResetToken= undefined;
        await user.save();
        res.status(200).json({
                success: true,
                message: 'Password reset successfully. Please login with your new password.'
        });
    }catch(error) {
        next(error)
    }
}

exports.userProfile= async (req,res,next) => {
    try {
        const userId= req.user.id;
        const user= await User.findById(userId)
        if(!user) {
            return next(new AppError(404,'Error','User not found'))
        }
        const userData= await User.findById(userId).select('-password -refreshToken')

        res.status(200).json({
            success: true,
            data: userData
        })
    } catch(error) {
        next(error)
    }
}
exports.updateProfile= async (req,res,next) => {
    try {
        const userId= req.user.id
        const {name, phone} = req.body;

        if(!name && !phone) return next(new AppError(400,'Error','Enter your name and phone'))

        const user= await User.findById(userId);
        if (!user) {
            return next(new AppError(404, 'Error', 'User not found'))
        }

        if(name) user.name= name;
        if(phone) user.phone = phone;

        await user.save();

        const updatedData= await User.findById(userId).select('-password -refreshToken')
        
        res.status(200).json({
            success: true,
            message: 'Profile updated successfuly',
            data: updatedData
        })
    } catch(error) {
        next(error)
    }
}


