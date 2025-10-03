const Wallet=require('../models/walletModel');
const AppError= require('../utils/appError');
const bcrypt= require('bcryptjs');
const Transaction=require('../models/transactionModel');
const CancelTransaction=require('../models/cancelTransactionModel')
const walletModel = require('../models/walletModel');
const mongoose=require('mongoose')
const validateCancellationEligibility= require('../middlewares/validateTransactionCancellation');
const processCancellation = require('../utils/transactionCancel');
const createWallet= async (req,res,next) => {
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
            status: 'Success',
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
const getWallets= async (req,res,next) => {
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
        status: 'Success',
        data: {
            wallets,
            pagination
        }
    })
} catch(error) {
    next(error)
}

}
const getWallet= async (req,res,next) => {
    try {
        const userId= req.user.id
        const {id} = req.params;
        const wallet= await Wallet.findOne({user: userId, _id: id}).select('-pin')
        if(!wallet) {
            return next(new AppError(404,'Error','Wallet not found'))
        }
        res.status(200).json({
            status: 'Success',
            data:  {
                wallet
            }
        })

    } catch(error) {
        next(error)
    }
}
const updateWallet= async (req,res,next) => {
    try {
        const {currency, status,pin} = req.body
        const userId= req.user.id
        
        const updatedData= {}
        if(currency) updatedData.currency= currency;
        if(status) updatedData.status= status
        if(pin.length < 4 || pin.length > 6) {
            return next(new AppError(400,'Error','Pin must be 4-6 digits'))
        }       
        const hashedPin= await bcrypt.hash(pin,12)
        updatedData.pin= hashedPin

        const wallet= await Wallet.findOneAndUpdate({user: userId},
            updatedData,{new: true, runValidators: true})


        if(!wallet) {
            return next(new AppError(400,'Error','Wallet not found'))
        }
        res.status(200).json({
            status: 'Success',
            message: 'Wallet updated successfully',
            data: {
                id: wallet._id,
                currency: wallet.currency,
                status: wallet.status
            }
        })
    } catch(error) {
    next(error)
    }
}

const deleteWallet= async (req,res,next) => {
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

const deposit= async(req,res,next) => {
    try {
        const {amount,description} = req.body
        const userId= req.user.id
        const {id} = req.params
        const wallet= await Wallet.findOne({user: userId, _id: id})
        if(!wallet) {
            return next(new AppError(404,'Error','Wallet not found'))
        }
        if(amount <= 0 || !amount){
            return next(new AppError(400,'Error','Amount cannot be less or equal zero'))
        }
        const transaction= await Transaction.create({
            wallet: wallet._id,
            type: 'deposit',
            amount,
            description: description || 'Deposit',
            status: 'completed',
        })
        wallet.balance += amount
        wallet.transactions.push(transaction._id)
        
        await transaction.save()
        await wallet.save()

        res.status(200).json({
            status: 'Success',
            message: 'Deposit successful',
            data: {
             transaction: {
                id: transaction._id,
                type: transaction.type,
                amount: transaction.amount,
                description: transaction.description,
                status: transaction.status,
                createdAt: transaction.createdAt
            },
            wallet: {
                id: wallet._id,
                balance: wallet.balance,
                currency: wallet.currency
            }
            }
        })
    } catch(error) {
        next(error)
    }
}

const withdraw = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { amount, pin } = req.body;
    if(!amount || !pin) {
        return next(new AppError(400,'Error','Amount and pin are required'))
    }
    if (amount <= 0) {
      return next(new AppError(400, "Error", "Amount must be greater than zero"));
    }
    if(pin.length < 4  || pin.length > 6){
        return next(new AppError(400,'Error','Pin must be 4-6 digits'))
    }

    const wallet = await Wallet.findOne({ _id: id, user: userId });
    if (!wallet) {
      return next(new AppError(404, "Error", "Wallet not found"));
    }
  
    const isMatch = await bcrypt.compare(pin, wallet.pin);

    if (!isMatch) {
      return next(new AppError(401, "Error", "Invalid PIN"));
    }

    if (wallet.balance < amount) {
      return next(new AppError(400, "Error", "Insufficient funds"));
    }

    const transaction = await Transaction.create({
      wallet: wallet._id,
      type: "withdraw",
      amount,
      status: "completed",
      description: "Withdraw for now",
    });

    wallet.balance -= amount;
    wallet.transactions.push(transaction._id);
    await wallet.save();

    res.status(200).json({
      status: "Success",
      message: "Withdraw successful",
      data: {
        transaction: {
          id: transaction._id,
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          status: transaction.status,
          createdAt: transaction.createdAt,
        },
        wallet: {
          id: wallet._id,
          balance: wallet.balance,
          currency: wallet.currency,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};




const sendMoney= async(req,res,next) => {
    const session= await mongoose.startSession()
    session.startTransaction()
    try {
        const userId= req.user.id;
        const {recipientWalletId, amount , description}= req.body;
        const {id} = req.params
        
        if(amount <= 0) {
            return next(new AppError(400, "Error", "Amount must be greater than zero"));
        }
      
        if(id === recipientWalletId) {
            return next(new AppError(400, "Error", "You cannot send money to yourself"));
        }
        const senderWallet= await Wallet.findOne({_id: id, user: userId}).session(session)

        if(!senderWallet) {
            return next(new AppError(404,'Error','Sender wallet not found'))
        }

       
        if(senderWallet.status === 'frozen' || senderWallet.status === 'suspended'){
            return next(new AppError(400,'Error','Sender wallet is suspended or frozen'))
        }
        
        if (senderWallet.balance < amount) {
        return next(new AppError(400, 'Error', 'Insufficient funds'));
        }

        const recipientWallet= await Wallet.findById(recipientWalletId).session(session)
        if(!recipientWallet) {
            return next(new AppError(404,'Error','Recipient wallet not found'))
        }
        
        if(recipientWallet.status === 'frozen' ||  recipientWallet.status === 'suspended') {
            return next(new AppError(400,'Error','Recipient wallet is suspended or frozen'))
        }

        if(senderWallet.currency !== recipientWallet.currency) {
            return next(new AppError(400,'Error'," Wallet's currency are not the same"))
        }
        const senderTransaction= await Transaction.create([{
            wallet: senderWallet._id,
            type: 'transfer_out',
            amount,
            description: 'Sending money',
            status: 'pending',
            recipientWallet: recipientWallet._id
        }],{session})
        const recipientTransaction= await Transaction.create([{
            wallet: recipientWallet._id,
            type: 'transfer_in',
            amount,
            description: description || 'Money recieved',
            status: 'pending',
            senderWallet: senderWallet._id
        }],{session})

        senderWallet.balance-= amount;
        recipientWallet.balance+= amount;
        senderWallet.transactions.push(senderTransaction[0]._id)
        recipientWallet.transactions.push(recipientTransaction[0]._id)

        await senderWallet.save({session})
        await recipientWallet.save({session})
        await session.commitTransaction()

        res.status(200).json({
            status: 'Success',
            message: 'Send money transaction',
            data: {
                senderTransaction: {
                    id: senderTransaction[0]._id,
                    type: senderTransaction[0].type,
                    amount: senderTransaction[0].amount,
                    description: senderTransaction[0].description,
                    status: senderTransaction[0].status,
                    recipientWallet: recipientWallet._id,
                    createdAt: senderTransaction[0].createdAt
                },
                senderWallet: {
                    id: senderWallet._id,
                    balance: senderWallet.balance,
                    currency: senderWallet.currency
                },
                recipientWallet: {
                    id: recipientWallet._id,
                    balance: recipientWallet.balance,
                    currency: recipientWallet.currency
                }
            }
        })
    } catch(error) {
        await session.abortTransaction()
        next(error)
    } finally {
        session.endSession()
    }
} 
const getTransactionHistory = async (req, res, next) => {
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


const getTransaction= async (req,res,next) => {
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

const requestTransactionCancellation = async (req,res,next)  => {
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

const approveCanellation= async (req,res,next) => {
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


const rejectCancellation= async (req,res,next) => {
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

const getCancellationRequests= async (req,res,next)  => {
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







module.exports= {createWallet,
    getWallets,
    getWallet,
    updateWallet,
    deleteWallet,
    deposit,withdraw,
    getTransaction,getTransactionHistory,sendMoney,
requestTransactionCancellation, getCancellationRequests,approveCanellation,rejectCancellation}