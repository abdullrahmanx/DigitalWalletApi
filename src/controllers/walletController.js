const Wallet=require('../models/walletModel');
const AppError= require('../utils/appError');
const bcrypt= require('bcryptjs');
const Transaction=require('../models/transactionModel');
const CancelTransaction=require('../models/cancelTransactionModel')
const walletModel = require('../models/walletModel');
const mongoose=require('mongoose')
const validateCancellationEligibility= require('../middlewares/validateTransactionCancellation');
const processCancellation = require('../utils/transactionCancel');

exports.createWallet= async (req,res,next) => {
    try {
        const userId= req.user.id
        const {pin,currency}= req.body;
        if(!pin || pin.length < 4 || pin.length > 6 ) {
            return next(new AppError(400,'Error','PIN must be 4-6 digits'))
        }
        // const existingWallet= await Wallet.findOne({user: req.user.id})
        // if(existingWallet) {
        //     return next(new AppError(400,'Error','User already has a wallet'))
        // }
        const hashedPin= await bcrypt.hash(pin,12)
      
        const wallet= await Wallet.create({
        user: userId,
        pin: hashedPin,
        currency   
        })
        
        res.status(201).json({
            success: true,
            message: 'Wallet created successfully',
            data: {
                wallet: wallet._id,
                user: wallet.user,
                currency: wallet.currency,
                balance: wallet.balance,
                status: wallet.status
            }
        })
    } catch(error) {
        next(error)
    }
}

exports.getWallets= async (req,res,next) => {
    try {
    const {
        page= 1,
        limit= 10,
        minBalance, maxBalance,
        currency,
        sortBy= 'createdAt',
        sortOrder= 'desc',
        userId
    }= req.query

    let filter= {};
    if(req.user.role === 'admin') {
        if(userId) filter.user= userId
    } else {
        filter.user= req.user.id
    }
    if(currency) filter.currency= currency
    if(minBalance || maxBalance) {
        filter.balance= {}
        if(minBalance) filter.balance.$gte= Number(minBalance)
        if(maxBalance) filter.balance.$lte= Number(maxBalance)
    }
    const sort=  { [sortBy]: sortOrder === 'asc' ? 1 : -1}
    
    const skip = (page -1) * limit 

    const wallets= await Wallet.find(filter).select(' -pin').sort(sort).skip(skip).limit(Number(limit))

    const total= await Wallet.countDocuments(filter);
    const totalPages= Math.ceil(total/limit)
    const currentPage= Number(page)

    const pagination= {
        total,
        page: currentPage,
        limit: Number(limit),
        totalPages,
        prevPage: currentPage > 1 ? currentPage -1 : null,
        nextPage: currentPage < totalPages ? currentPage + 1 : null
    }
    res.status(200).json({
        success: true,
        data: {
            wallets,
            pagination
        }
    })
} catch(error) {
    next(error)
}

}

exports.getWallet= async (req,res,next) => {
    try {
        const userId= req.user.id
        const {id} = req.params;
        const wallet= await Wallet.findOne({user: userId, _id: id}).select('-pin')
        if(!wallet) {
            return next(new AppError(404,'Error','Wallet not found'))
        }
        res.status(200).json({
            success: true,
            data:  {
                wallet
            }
        })

    } catch(error) {
        next(error)
    }
}

exports.updateWallet= async (req, res, next) => {
    try {
        const {status, currency, pin}= req.body;
        const updatedData={};
        
        if(status) {
            if(!['active','inactive','suspended'].includes(status)) {
                return next(new AppError(400,'Error','Invalid status'))
            }
            updatedData.status= status;
        }
        
        if(currency) {
            if(!['USD','EUR','GBP','NGN'].includes(currency)) {
                return next(new AppError(400,'Error','Invalid currency'))
            }
            updatedData.currency= currency;
        }
        
        if(pin) {
            if(typeof pin !== 'string' || !/^\d{4,6}$/.test(pin)) {
                return next(new AppError(400,'Error','Pin must be 4-6 digits'))
            }
            const hashedPin = await bcrypt.hash(pin, 12);
            updatedData.pin = hashedPin;
        }
        
        const wallet= await Wallet.findOneAndUpdate(
            {user: req.user.id},
            updatedData,
            {new: true, runValidators: true}
        );
        
        if(!wallet) {
            return next(new AppError(404,'Error','Wallet not found'))
        }
        
        res.status(200).json({
            status: 'Success',
            data: {
                wallet
            }
        })
    } catch(error) {
        console.log(error);
        next(error);
    }
}

exports.deleteWallet= async (req,res,next) => {
    try {
    const {id} = req.params;

    const userId= req.user.id

    const wallet= await Wallet.findOneAndDelete({_id: id, user: userId})

    if(!wallet) {
        return next(new AppError(404,'Error','Wallet not found'))
    }
    res.status(200).json({
        status: 'Success',
        message: 'Wallet Deleted',
        data: {
            id: wallet._id
        }
    })

    } catch(error) {
        next(error)
    }
}

exports.deposit= async(req,res,next) => {
    try {
        let {amount}= req.body;
        
     
        amount = Number(amount);
        if(isNaN(amount) || amount <= 0) {
            return next(new AppError(400, 'Error', 'Invalid amount'));
        }
        
        const wallet= await Wallet.findOne({user: req.user.id});
        if(!wallet) {
            return next(new AppError(404,'Error','Wallet not found'))
        }
      
        if(wallet.status !== 'active') {
            return next(new AppError(403, 'Error', `Wallet is ${wallet.status}. Cannot deposit.`));
        }
        
        wallet.balance += amount;
        await wallet.save();
        
        const transaction= await Transaction.create({
            wallet: wallet._id,
            type: 'deposit',
            amount,
            balanceAfter: wallet.balance,
            status: 'completed'
        });
        
        res.status(200).json({
            status: 'Success',
            data: {
                transaction
            }
        })
    } catch(error) {
        next(error)
    }
}

exports.withdraw = async (req, res, next) => {
  try {
     let {amount, pin}= req.body;
        
        amount = Number(amount);
        if(isNaN(amount) || amount <= 0) {
            return next(new AppError(400, 'Error', 'Invalid amount'));
        }
        
        const wallet= await Wallet.findOne({user: req.user.id}).select('+pin');
        if(!wallet) {
            return next(new AppError(404,'Error','Wallet not found'))
        }
        
        if(wallet.status !== 'active') {
            return next(new AppError(403, 'Error', `Wallet is ${wallet.status}. Cannot withdraw.`));
        }
        
        if(!pin) {
            return next(new AppError(400, 'Error', 'PIN is required'));
        }
        
        const isValidPin= await bcrypt.compare(pin, wallet.pin);
        if(!isValidPin) {
            return next(new AppError(401,'Error','Invalid pin'))
        }
        
        if(wallet.balance < amount) {
            return next(new AppError(400,'Error','Insufficient balance'))
        }
        
        wallet.balance -= amount;
        await wallet.save();
        
        const transaction= await Transaction.create({
            wallet: wallet._id,
            type: 'withdraw',
            amount,
            balanceAfter: wallet.balance,
            status: 'completed'
        });
        
        res.status(200).json({
            status: 'Success',
            data: {
                transaction
            }
        })
  } catch (error) {
    next(error);
  }
};




exports.sendMoney= async(req,res,next) => {
    const session= await mongoose.startSession();
    session.startTransaction();
    
    try {
        let {amount, recipientWalletId, pin}= req.body;
        
       
        amount = Number(amount);
        if(isNaN(amount) || amount <= 0) {
            await session.abortTransaction();
            return next(new AppError(400, 'Error', 'Invalid amount'));
        }
        
    
        if(!mongoose.Types.ObjectId.isValid(recipientWalletId)) {
            await session.abortTransaction();
            return next(new AppError(400, 'Error', 'Invalid recipient wallet ID'));
        }
        
        const senderWallet= await Wallet.findOne({user: req.user.id}).select('+pin').session(session);
        if(!senderWallet) {
            await session.abortTransaction();
            return next(new AppError(404,'Error','Your wallet not found'))
        }
        
       
        if(senderWallet.status !== 'active') {
            await session.abortTransaction();
            return next(new AppError(403, 'Error', `Your wallet is ${senderWallet.status}. Cannot send money.`));
        }
        
        
        if(!pin) {
            await session.abortTransaction();
            return next(new AppError(400, 'Error', 'PIN is required'));
        }
        
        const isValidPin= await bcrypt.compare(pin, senderWallet.pin);
        if(!isValidPin) {
            await session.abortTransaction();
            return next(new AppError(401,'Error','Invalid pin'))
        }
        
        const recipientWallet= await Wallet.findById(recipientWalletId).session(session);
        if(!recipientWallet) {
            await session.abortTransaction();
            return next(new AppError(404,'Error','Recipient wallet not found'))
        }
        
        // FIXED: Check recipient wallet status
        if(recipientWallet.status !== 'active') {
            await session.abortTransaction();
            return next(new AppError(403, 'Error', `Recipient wallet is ${recipientWallet.status}. Cannot receive money.`));
        }
        
        // FIXED: Prevent self-transfer
        if(senderWallet._id.toString() === recipientWallet._id.toString()) {
            await session.abortTransaction();
            return next(new AppError(400, 'Error', 'Cannot transfer to your own wallet'));
        }
        
        if(senderWallet.balance < amount) {
            await session.abortTransaction();
            return next(new AppError(400,'Error','Insufficient balance'))
        }
        
        senderWallet.balance -= amount;
        recipientWallet.balance += amount;
        
        await senderWallet.save({session});
        await recipientWallet.save({session});
        
        const transaction= await Transaction.create([{
            wallet: senderWallet._id,
            type: 'transfer',
            amount,
            to: recipientWallet._id,
            balanceAfter: senderWallet.balance,
            status: 'completed'
        }], {session});
        
        await session.commitTransaction();
        
        res.status(200).json({
            status: 'Success',
            data: {
                transaction: transaction[0]
            }
        })
    } catch(error) {
        await session.abortTransaction();
        console.log(error);
        next(error);
    } finally {
        session.endSession();
    }
}

exports.getTransactionHistory = async (req, res, next) => {
  try {
        const { status, type, sortBy = 'createdAt', order = 'desc' } = req.query;
        const wallet = await Wallet.findOne({ user: req.user.id });
        if (!wallet) {
            return next(new AppError(404,'Error','Wallet not found'))
        }
        let filter = { wallet: wallet._id };
        if (status) filter.status = status;
        if (type) filter.type = type; 

        const transactions = await Transaction.find(filter)
        .sort({ [sortBy]: order === 'asc' ? 1 : -1 });
        
        res.status(200).json({
            status: 'Success',
            count: transactions.length,
            data: transactions
        });
    } catch (err) {
        next(err);
    }
};


exports.getTransaction= async (req,res,next) => {
    try {
       const {id} = req.params
       const userId = req.user.id 
       const transaction= await Transaction.findById(id).populate({
        path: 'wallet',
        select: 'user'
       });
       if(!transaction) {
        return next(new AppError(404,'Error','Transaction not found'))
       }
       if(transaction.wallet.user.toString() !== userId) {
        return next(new AppError(404,'Error','Access Denied'))
       }
       res.status(200).json({
        status :'Success',
        message: 'Transaction retrieved successfully',
        data: {
            transaction: {
                id: transaction._id,
                type: transaction.type,
                amount: transaction.amount,
                description: transaction.description,
                status: transaction.status,
                wallet: transaction.wallet._id,
                recipientWallet: transaction.recipientWallet,
                senderWallet: transaction.senderWallet,
                createdAt: transaction.createdAt
            }
        }
       })
    } catch(error) {
        next(error)
    }
}

exports.requestTransactionCancellation = async (req,res,next)  => {
    const session = await mongoose.startSession()
    session.startTransaction()
    try {
        const {id} =req.params
        const userId= req.user.id 
        const {reason} = req.body
        
        if(!reason || reason.trim().length < 10) {
            return next(new AppError(400,'Error','Cancellation reason must be at least 10 characters long'))
        }
        const transaction= await Transaction.findById(id).populate('wallet', 'user').session(session)
        if(!transaction) {
            return next(new AppError(404,'Error','Transaction not found'))
        }
        if(transaction.wallet.user.toString() !== userId) {
            return next(new AppError(400,'Error', 'You can only cancel your own transactions'))
        }
        
       try {
            validateCancellationEligibility(transaction)
        } catch(error) {
            await session.abortTransaction();
            return next(error)
       }
        
        const cancelRequest= await CancelTransaction.create([{
            transaction: transaction._id,
            requestedBy: userId,
            reason: reason.trim(),
            priority: transaction.amount > 1000 ? 'high' : 'medium'
        }], {session});

        transaction.cancelRequest= cancelRequest[0]._id
        
        await transaction.save({session})

        await session.commitTransaction()
        res.status(201).json({
            status : 'Success',
            message: 'Cancellation request submitted successfully. It will be reviewed by an admin.',
            data: {
                requestId: cancelRequest[0]._id,
                status: 'pending'
            }
        })

    } catch (error) {
        await session.abortTransaction();
        next(error)
    } finally {
        session.endSession()
    }
}

exports.approveCanellation= async (req,res,next) => {
    const session= await mongoose.startSession()
    session.startTransaction()
    try {
            const adminId= req.user.id;
            const {id} = req.params;
            const {adminReason} = req.body;

            if(!adminReason) {
                return next(new AppError(400,'Error','Admin reason is required'))
            }

            const cancelRequest= await CancelTransaction.findById(id).populate('transaction').session(session)
            if(!cancelRequest) {
                return next(new AppError(404,'Error','Cancellation request not found'))
            }

            if(cancelRequest.status !== 'pending') {
                return next(new AppError(400,'Error','This request has already been processed'))
            }
            const transaction= cancelRequest.transaction

            if(transaction.status === 'cancelled') {
                return next(new AppError(400, 'Error', 'Transaction already cancelled'));
            }

            if(transaction.status === 'completed') {
                return next(new AppError(400, 'Error', 'Cannot cancel completed transaction'));
            }

            if(transaction.status === 'failed') {
                return next(new AppError(400, 'Error', 'Cannot cancel failed transaction'));
            }

            await processCancellation(transaction,session)

            cancelRequest.status= 'approved';
            cancelRequest.adminResponse= {
                admin: adminId,
                descison: 'approved',
                adminReason: adminReason || 'Approved by admin',
                processAt: new Date()
            }

            transaction.status= 'cancelled'
            transaction.reason= cancelRequest.reason
            

            await transaction.save({session})
            await cancelRequest.save({session})

            res.status(200).json({
                status: 'Success',
                message: 'Transaction cancellation approved and processed successfully'
            })

    } catch(error) {
        session.abortTransaction()
        next(error)
    } finally {
        session.endSession()
    }
}


exports.rejectCancellation= async (req,res,next) => {
    try {
        const adminId= req.user.id;
        const {id} = req.params;
        const {adminReason} = req.body

        if(!adminReason) {
            return next(new AppError(400,'Error','Admin reasoin is required'))
        }

        const cancelRequest= await CancelTransaction.findById(id).populate('transaction')

        if(!cancelRequest) {
            return next(new AppError(404,'Error','Cancellation request not found'))
        }
        if(cancelRequest.status !== 'pending') {
            return next(new AppError(400,'Error','This request has already been processed'))
        }

        cancelRequest.status= 'rejected'

        cancelRequest.adminResponse= {
            admin :adminId,
            decision: 'rejected',
            adminReason: adminReason || 'Rejected by admin',
            processAt: new Date()
        }
        await cancelRequest.save();
        res.status(200).json({
            status: 'Success',
            message: 'Transaction cancellation rejected and processed successfully'
        })
    }catch (error) {
        next(error)
    }
}

exports.getCancellationRequests= async (req,res,next)  => {
    try {
        const { page = 1, limit = 10,status= 'pending', priority, sortBy= 'createdAt',sortOrder= 'desc' }= req.query
        const filter= {}
        if(status && status !== 'all') filter.status= status
        if(priority) filter.priority = priority
        const skip = (Number(page)-1) *(Number(limit));
        const cancelRequests= await CancelTransaction.find(filter).populate({
            path: 'transaction',
            populate : {
                path: 'wallet',
                populate: {
                    path: 'user',
                    select: 'name email'
                }
            }
        }).populate('requestedBy', 'name email')
          .populate('adminResponse.admin', 'name email')
          .sort({[sortBy]: sortOrder === 'desc' ? -1 : 1})
          .skip(skip)
          .limit(Number(limit))
        const total = await CancelTransaction.countDocuments(filter)  
        res.status(200).json({
            status: 'Success',
            data: {
                cancelRequests,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total/Number(limit)),
                    totalRequests: total,
                    hasNextPage: skip+ cancelRequests.length < total,
                    hasPrevPage: page > 1
                }
            }
        })
    } catch(error) {
        next(error)
    }
}






