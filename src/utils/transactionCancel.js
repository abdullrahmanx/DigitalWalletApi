const Wallet= require('../models/walletModel')

const processCancellation= async (transaction, session) => {
    switch (transaction.type) {
        case 'deposit':
            await Wallet.findByIdAndUpdate(transaction.wallet,
                { $inc: { balance : -transaction.amount}},
                {session}
            );
        case 'withdraw':
            await Wallet.findByIdAndUpdate(transaction.wallet,
                { $inc: {balance: +transaction.amount}},
                {session}
           )
        break;
      
        case 'transfer_out':
            await Wallet.findByIdAndUpdate(transaction.wallet,
                { $inc: {balance: transaction.amount }},
                { session}
            )
            await Wallet.findByIdAndUpdate(transaction.recipientWallet,
                { $inc : {balance: -transaction.amount}},
                {session}
            )
        break;
        case 'transfer_in': 
            await Wallet.findByIdAndUpdate(transaction.wallet,
                {$inc : { balance : -transaction.amount}},
                {session}
            )       
            await Wallet.findByIdAndUpdate(transaction.senderWallet,
                { $inc: {balance: transaction.amount}},
                {session}
            )
         break;
    }
}
module.exports= processCancellation