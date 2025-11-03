const request= require('supertest')
const app = require('../app')
const {MongoMemoryReplSet}= require('mongodb-memory-server')
const User = require('../models/userModel')
const Transaction= require('../models/transactionModel')
const mongoose= require('mongoose')

beforeAll(async () => {
    replSet= await MongoMemoryReplSet.create()
    const uri = replSet.getUri()
    await mongoose.connect(uri)
})
afterAll( async () => {
    await mongoose.disconnect()
    await replSet.stop()
})

process.env.JWT_SECRET = "testsecret"
process.env.JWT_REFRESH = "testsecret"

describe('Transaction Cancellation Routes', () => {
    let userToken
    let adminToken
    let walletId
    let transactionId
    let cancelRequestId

    beforeAll(async () => {
        const user= await request(app)
            .post('/auth/register')
            .send({
                name: 'usertest',
                email: `user${Date.now()}@test.co`,
                password: '123456',
                phone: '123534212'
            }) 
        userToken= user.body.token.accessToken
          
        const admin= await request(app)
            .post('/auth/register')
            .send({
                name: 'adminTest',
                email: 'adminTest@example.com',
                password: '123456',
                phone: '12353212'
            }) 
            .expect(201)
        const createAdmin= await User.findOne({email:'adminTest@example.com'})  
        createAdmin.role= 'admin'   
        await createAdmin.save();
        const adminLogin = await request(app)
            .post('/auth/login')
            .send({
                email: 'adminTest@example.com',
                password: '123456'
            })
        .expect(200);

        adminToken = adminLogin.body.token.accessToken; 

        const wallet= await request(app)
                .post('/wallets')
                .set('Authorization', `Bearer ${userToken}`)
                .send({pin: '1234', currency: 'EGP'})
        walletId= wallet.body.data.wallet

        const transaction= await Transaction.create({
                    wallet: walletId,
                    type: 'deposit',
                    amount: 500,
                    description: 'Deposit',
                    status: 'pending',
                })     
        transactionId= transaction._id        
    })

    it('User should submit a cancel request', async () =>  {
        const response= await request(app)
            .post(`/transactions/cancel-request/${transactionId}`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({reason : 'sorry by mistake'})
            .expect(201)
        expect(response.body.success).toBe(true),
        expect(response.body.message).toContain('Cancellation request')
        cancelRequestId= response.body.data.requestId
    })

    it('Admin should see all cancel request', async() => {
        const response= await request(app)
            .get('/transactions/cancel-requests')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200)
           
        expect(response.body.success).toBe(true)    
        expect(response.body.data.cancelRequests).toBeDefined()    
    })

    it('Admin should approve a cancel request', async () => {
        const response= await request(app)
            .post(`/transactions/cancel-approve/${cancelRequestId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({adminReason: 'your cancellation request is approved'})
            .expect(200)
        expect(response.body.success).toBe(true)        
        expect(response.body.message).toContain('cancellation approved')        
    })

    it('Admin should reject a cancel request', async() => {
        const response= await request(app)
            .post(`/transactions/cancel-reject/${cancelRequestId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({adminReason: 'your cancellation request is rejected'})
            .expect(200)
        expect(response.body.success).toBe(true)        
        expect(response.body.message).toContain('cancellation rejected')     
    })

})