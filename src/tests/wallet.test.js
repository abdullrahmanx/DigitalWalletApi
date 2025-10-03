const mongoose =require('mongoose')
const request= require('supertest')
const app= require('../app')
const { MongoMemoryReplSet } = require('mongodb-memory-server');  

let replSet;
beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create();
  const uri = replSet.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

process.env.JWT_SECRET = "testsecret"
process.env.JWT_REFRESH = "testsecret"


const sendToken= async () => {
    const register= await request(app)
        .post('/auth/register')
        .send({ name: 'testName',
                email: 'test@example.com',
                password: '12345678',
                phone: '12345678'
            })
    const login= await request(app)
        .post('/auth/login')
        .send({email:'test@example.com',
            password: '12345678'
         })     
        
    return {token: login.body.token.accessToken, userId: register.body.data._id}   
}
const sendTokenx2= async (email) => {
    const register= await request(app)
        .post('/auth/register')
        .send({ name: 'testName',
                email,
                password: '12345678',
                phone: '12345678'
            })
    const login= await request(app)
        .post('/auth/login')
        .send({email,
            password: '12345678'
         })     
    return {token: login.body.token.accessToken, userId: register.body.data._id}   
}



describe('Wallet API Tests', () => {
    let token;
    let userId;
    let walletId;
    beforeAll(async () => {
        const auth= await sendToken()
        token = auth.token
        userId= auth.userId
    })
    

    describe('POST /wallets - Create Wallet',() => {
        it('should create a new wallet successfully', async () => {
            const response= await request(app)
                .post('/wallets')
                .set('Authorization', `Bearer ${token}`)
                .send({pin: '1234', currency: 'EGP'})
                .expect(201)
            expect(response.body.status).toBe('Success')
            expect(response.body.message).toContain('created')
            expect(response.body.message).toContain('created')
            expect(response.body.data.wallet).toBeDefined()
            expect(response.body.data.balance).toBe(0)
        })

        it('should fail without authentication', async () => {
            const response= await request(app)
                .post('/wallets')
                .send({pin: 12345,currency: 'USD'})
                .expect(401)

            expect(response.body.status).toBe('Error')
            expect(response.body.message).toContain('Authorization') 
        })

        it('should fail without currency or pin', async () => {
            const response = await request(app)
                .post('/wallets')
                .set('Authorization',`Bearer ${token}`)
                .send({pin: '', currency: ''})
                .expect(400)
            expect(response.body.status).toBe('Error')  
            expect(response.body.message).toContain('empty')
        })

        it('should fail with invalid pin or invalid currenct format', async () => {
            const response = await request(app)
                .post('/wallets')
                .set('Authorization',`Bearer ${token}`)
                .send({pin: '1231432545345', currency: 'sss'})
                .expect(400)
            expect(response.body.status).toBe('Error')  
            expect(response.body.message).toContain('must be')
        })
    })

    describe('GET /wallets - Get all wallets', () => {
       
        it('should return all wallets', async () => {
            const response= await request(app)
                .get('/wallets')
                .set('Authorization', `Bearer ${token}`)
                .expect(200)
            expect(response.body.status).toBe('Success'),
            expect(response.body.data.wallets).toBeDefined()    
        })
        it('should fail without authentication', async () => {
            const response = await request(app)
                .get('/wallets');
            
            expect(response.status).toBe(401);
        });
        it('should fail if user has no wallets', async () => {
            await mongoose.connection.dropDatabase();
            const newToken= await sendToken()

            const response= await request(app)
                .get('/wallets')
                .set('Authorization', `Bearer ${newToken.token}`)
                .expect(200)
            expect(response.body.status).toBe('Success')
            expect(response.body.data.wallets.length).toBe(0)
        })
    })
    describe('GET /wallets/:id', () => {
        beforeAll(async () => {
            const response= await request(app)
                .post('/wallets')
                .set('Authorization',`Bearer ${token}`)
                .send({pin: '1235', currency: 'USD'})
            walletId= response.body.data.wallet
        })
        
        it('should get a specific wallet by id', async () => {
            const response= await request(app)
                .get(`/wallets/${walletId}`)
                .set('Authorization',`Bearer ${token}`)
                .expect(200)
            
            expect(response.body.status).toBe('Success')
            expect(response.body.data.wallet._id).toBe(walletId)        
        })

        it('should fail with invalid id', async () => {
            const fakeId= new mongoose.Types.ObjectId()
            const response= await request(app)
                .get(`/wallets/${fakeId}`)
                .set('Authorization', `Bearer ${token}`)
            expect(response.status).toBe(404)    
        })
        it('should fail without authentication', async () => {
            const response = await request(app)
                .get(`/wallets/${walletId}`);
            
            expect(response.status).toBe(401);
        });
    })
    describe('POST /wallets/deposit/:id' , () => {
        beforeAll(async () => {
            const response= await request(app)
                .post('/wallets')
                .set('Authorization',`Bearer ${token}`)
                .send({pin: '1235', currency: 'USD'})
            walletId= response.body.data.wallet
        })

        it('should deposit successfully', async () => {
            const despositAmount =100
            const response = await request(app)
                .post(`/wallets/deposit/${walletId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({amount: despositAmount})
                .expect(200)
            expect(response.body.status).toBe('Success')
            expect(response.body.data.wallet.balance).toBe(despositAmount)
        })
        it('should fail with negative amount', async () => {
            const response = await request(app)
                .post(`/wallets/deposit/${walletId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    amount: -50
                });
            
            expect(response.status).toBe(400);
        });
        it('should fail with zero amount', async () => {
            const response = await request(app)
                .post(`/wallets/deposit/${walletId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    amount: 0
                });
            
            expect(response.status).toBe(400);
        });
          it('should fail without authentication', async () => {
            const response = await request(app)
                .post(`/wallets/deposit/${walletId}`)
                .send({
                    amount: 100
                });
            
            expect(response.status).toBe(401);
        });
        it('should fail with fake id', async () => {
            const fakeId= new mongoose.Types.ObjectId()
            const response = await request(app)
                .post(`/wallets/deposit/${fakeId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    amount: 100
                });
            
            expect(response.status).toBe(404);
        });
        it('should fail with missing amount', async () => {
            const response = await request(app)
                .post(`/wallets/deposit/${walletId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({});
            
            expect(response.status).toBe(400);
        });
        it('should fail with string amount', async () => {
            const response = await request(app)
                .post(`/wallets/deposit/${walletId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    amount: 'abc'
                });
            
            expect(response.status).toBe(400);
        });
    })
    describe('POST /wallets/withdraw/:id', () => {
        beforeEach(async () => {
            const response= await request(app)
                .post('/wallets')
                .set('Authorization',`Bearer ${token}`)
                .send({pin: '1235', currency: 'USD'})
            walletId= response.body.data.wallet
            await request(app)
                .post(`/wallets/deposit/${walletId}`)
                .set('Authorization',`Bearer ${token}`)
                .send({amount : 500})
        })

        it('should withdraw money successfully', async () => {
            const response= await request(app)
                .post(`/wallets/withdraw/${walletId}`)
                .set('Authorization',`Bearer ${token}`)
                .send({pin: '1235',amount: 200})
                .expect(200)
            expect(response.body.status).toBe('Success')
            expect(response.body.data.wallet.balance).toBe(300)    
        })

        it('should fail with insufficient balance', async () => {
            const response= await request(app)
                .post(`/wallets/withdraw/${walletId}`)
                .set('Authorization',`Bearer ${token}`)
                .send({pin: '1235',amount: 1000})
                .expect(400)
            expect(response.body.status).toBe('Error')
            expect(response.body.message).toContain('Insufficient')    
        })
         it('should fail with zero amount', async () => {
            const response = await request(app)
                .post(`/wallets/withdraw/${walletId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    pin: '1235',
                    amount: 0
                });
            
            expect(response.status).toBe(400);
        });
        it('should fail without authentication', async () => {
            const response = await request(app)
                .post(`/wallets/withdraw/${walletId}`)
                .send({
                    pin: '1235',
                    amount: 100
                });
            
            expect(response.status).toBe(401);
        });
        it('should allow full balance withdrawal', async () => {
            const response = await request(app)
                .post(`/wallets/withdraw/${walletId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    pin: '1235',
                    amount: 500
                });
                expect(200)
         
            expect(response.body.data.wallet.balance).toBe(0)    
        });
        
    })
    describe('POST /wallets/send-money/:id', () => {
        let senderToken
        let senderWalletId
        let recieverToken
        let recipientWalletId
        beforeAll(async () => {
          const senderAccount= await sendTokenx2('sender@example.com')
          senderToken= senderAccount.token
          const senderWallet= await request(app)
            .post('/wallets')
            .set('Authorization', `Bearer ${senderToken}`)
            .send({pin: '12345',currency: 'EGP'})

          senderWalletId= senderWallet.body.data.wallet  
          await request(app)
            .post(`/wallets/deposit/${senderWalletId}`)
            .set('Authorization', `Bearer ${senderToken}`)
            .send({amount: 1000})
          
          const recieverAccount= await sendTokenx2('reciever@example.com')
          recieverToken= recieverAccount.token
          const recipientWallet= await request(app)
            .post('/wallets')
            .set('Authorization', `Bearer ${recieverToken}`)
            .send({pin: '1234', currency: 'EGP'})
          recipientWalletId= recipientWallet.body.data.wallet  
        })
        it('should transfer money successfully', async () => {
            let transferAmount=200
            const response= await request(app)
                .post(`/wallets/send-money/${senderWalletId}`)
                .set('Authorization' , `Bearer ${senderToken}`)
                .send({recipientWalletId,amount: transferAmount})
                .expect(200)
            expect(response.body.status).toBe('Success');
            expect(response.body.data.senderTransaction).toBeDefined()   
            expect(response.body.data.senderTransaction.type).toBe('transfer_out')   
            expect(response.body.data.senderTransaction.amount).toBe(transferAmount);
            expect(response.body.data.senderWallet.balance).toBe(800);
            expect(response.body.data.recipientWallet.balance).toBe(200);
        })
        it('should fail with 0 amount', async () => {
            const response= await request(app)
                .post(`/wallets/send-money/${senderWalletId}`)
                .set('Authorization' , `Bearer ${senderToken}`)
                .send({recipientWalletId,amount: 0})
                .expect(400)
            expect(response.body.message).toMatch(/greater than zero/i);
        })
        it('should fail with negative amount', async () => {
            const response = await request(app)
                .post(`/wallets/send-money/${senderWalletId}`)
                .set('Authorization', `Bearer ${senderToken}`)
                .send({
                    recipientWalletId: recipientWalletId,
                    amount: -100
                });
            
            expect(response.status).toBe(400);
            expect(response.body.message).toMatch(/greater than zero/i);
        });
        it('should fail sending to own wallet', async () => {
            const response = await request(app)
                .post(`/wallets/send-money/${senderWalletId}`)
                .set('Authorization', `Bearer ${senderToken}`)
                .send({
                    recipientWalletId: senderWalletId, // Same wallet
                    amount: 100
                });
            
            expect(response.status).toBe(400);
            expect(response.body.message).toMatch(/cannot send money to yourself/i);
        });
        it('should fail with insufficient funds', async () => {
            const response = await request(app)
                .post(`/wallets/send-money/${senderWalletId}`)
                .set('Authorization', `Bearer ${senderToken}`)
                .send({
                    recipientWalletId: recipientWalletId,
                    amount: 5000 
                });
            
            expect(response.status).toBe(400);
            expect(response.body.message).toMatch(/insufficient funds/i);
        });
        it('should fail with missing recipientWalletId', async () => {
            const response = await request(app)
                .post(`/wallets/send-money/${senderWalletId}`)
                .set('Authorization', `Bearer ${senderToken}`)
                .send({
                    amount: 100
                });
            
            expect(response.status).toBe(404);
        });
        it('should fail with missing amount', async () => {
            const response = await request(app)
                .post(`/wallets/send-money/${senderWalletId}`)
                .set('Authorization', `Bearer ${senderToken}`)
                .send({
                    recipientWalletId: recipientWalletId
                });
            
            expect(response.status).toBe(400);
        });
    })
})