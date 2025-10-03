const mongoose=require('mongoose');
const validator= require('validator');
const userSchema= new mongoose.Schema({
   name: {
        type: String,
        required: [true, "Name is required"],
        trim: true
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        validate: {
            validator: validator.isEmail,
            message: "Please provide a valid email address"
        }
    },
    phone: {
            type: String,
            required: [true, "Phone number is required"],
            unique: true
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minLength: 6,
    },
    role: {
        type: String,
        enum: ['user','admin'],
        default: 'user'
    },
    refreshToken: {
        type:String, 
        default: null
    },
    isVerified: {
        type: Boolean,
        default: false
    },

    verificationToken: {
        type: String
    },

    verificationTokenExpires: {
        type: Date
    },
     passwordResetToken: String,
     resetPasswordExpires: Date

}, { timestamps: true,versionKey: false});

const User= mongoose.model('User', userSchema);
module.exports= User;
