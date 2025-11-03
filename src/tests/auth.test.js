const mongoose = require('mongoose')
const request = require('supertest')
const app = require('../app')
const { MongoMemoryServer } = require('mongodb-memory-server')

let mongoServer
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    const uri = mongoServer.getUri()
    await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
}, 10000)
afterAll(async () => {
    await mongoose.disconnect()
    await mongoServer.stop()
})
process.env.JWT_SECRET = "testsecret"
process.env.JWT_REFRESH = "testsecret"

 const registerUser= async (userData= {
                name: 'testName',
                email: 'test@example.com',
                password: '12345678',
                phone: '12345678'
       }) => {
        const response= await request(app)
            .post('/auth/register')
            .send(userData)
         return userData   
}



describe('Authentication API', () => {
    describe('POST /auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                name: 'JohnDoe',
                email: 'john@example.com',
                password: 'password123',
                phone: '2158723432'
            };
            const response = await request(app)
                .post('/auth/register')
                .send(userData)
            expect(response.statusCode).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('created');
            expect(response.body.data.name).toBe(userData.name)
            expect(response.body.data.email).toBe(userData.email);
            expect(response.body.data.phone).toBe(userData.phone)
            expect(response.body.token.accessToken).toBeDefined();
            expect(response.body.token.refreshToken).toBeDefined();
            expect(response.body.data.password).toBeUndefined();
        });

        it('should fail with duplicate email', async () => {
            const userData = {
                name: 'JohnDoe',
                email: 'john@example.com',
                password: 'password123',
                phone: '2158723432'
            };
            const response= await request(app)
                  .post('/auth/register')
                  .send(userData)
                  .expect(400)
            expect(response.body.success).toBe()
            expect(response.body.message).toContain('Email already used')      
        });

        it('should fail with missing name', async () => {
            const userData = {
                email: 'john@example.com',
                password: 'password123',
                phone: '2158723432'
            };
            const response= await request(app)
                  .post('/auth/register')
                  .send(userData)
                  .expect(400)
            expect(response.body.success).toBe()
            expect(response.body.message).toContain('Name is required')   
        });
        
        it('should fail with missing email', async () => {
            const userData = {
                name: 'JohnDoe',
                password: 'password123',
                phone: '2158723432'
            };
            const response= await request(app)
                  .post('/auth/register')
                  .send(userData)
                  .expect(400)
            expect(response.body.success).toBe()
            expect(response.body.message).toContain('Email is required')   
        });
         it('should fail with missing password', async () => {
            const userData = {
                name: 'JohnDoe',
                email: 'john@example.com',
                phone: '2158723432'
            };
            const response= await request(app)
                  .post('/auth/register')
                  .send(userData)
                  .expect(400)
            expect(response.body.success).toBe()
            expect(response.body.message).toContain('Password is required')   
        });
        
        it('should fail with invalid email format', async () => {
             const userData = {
                name: 'JohnDoe',
                email: 'invalid-email',
                password: 'password123',
                phone: '21587232'
            };
            const response= await request(app)
                .post('/auth/register')
                .send(userData)
                .expect(400)
            expect(response.body.success).toBe()
            expect(response.body.message).toContain('valid email address')
        })
        it('should fail with short password', async () => {
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: '123',
                phone: '12345678'
            };

            const response = await request(app)
                .post('/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.success).toBe();
            expect(response.body.message).toContain('6 characters');
        });
    })

    describe('POST /auth/login',  () => {
      
       it('should login successfully', async () => {
            const userData= await registerUser();

            const response= await request(app)
                .post('/auth/login')
                .send({
                    email: userData.email,
                    password: userData.password
                })
                .expect(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toContain('successfully')  
            expect(response.body.token.accessToken).toBeDefined() 
            expect(response.body.token.refreshToken).toBeDefined() 
            expect(response.body.token.accessToken.length).toBeGreaterThan(20)
            expect(response.body.token.refreshToken.length).toBeGreaterThan(20)
            expect(response.body.password).toBeUndefined();
       })
       
       it('should fail with wrong password', async () => {
            const userData= await registerUser()

            const response= await request(app)
                .post('/auth/login')
                .send({
                    email: userData.email,
                    password: 'wrongpass'
                })
                .expect(401)
            expect(response.body.success).toBe(),
            expect(response.body.message).toContain('Invalid')
            expect(response.body.token).toBeUndefined()
       })

       it('should fail with wrong email', async () => {
            const userData= await registerUser()

            const response= await request(app)
                .post('/auth/login')
                .send({
                    email: 'invalidemail',
                    password: userData.password
                })
                .expect(400)

            console.log(response.body.message)    
            
            expect(response.body.success).toBe()
            expect(response.body.message).toContain('valid')
       })

       it('should fail with non-existent user', async () => {
            const userData= await registerUser()

            const response= await request(app)
                .post('/auth/login')
                .send({
                    email: 'notexistent@example.com',
                    password: userData.password
                })
                .expect(401)
            
                expect(response.body.success).toBe()
                expect(response.body.message).toContain('valid')
                expect(response.body.token).toBeUndefined();
       })

       it('should fail with missing email', async () => {
         const userData= await registerUser()

         const response= await request(app)
            .post('/auth/login')
            .send({
                password: userData.password
            })
            .expect(400)

         expect(response.body.success).toBe()  
         expect(response.body.message).toContain('required')
       })

       it('should fail with missing email', async () => {
         const userData= await registerUser()

         const response= await request(app)
            .post('/auth/login')
            .send({
                email: userData.email
            })
            .expect(400)

         expect(response.body.success).toBe()  
         expect(response.body.message).toContain('required')
       })

       it('JWT Token validation', async() => {

        const userData= await registerUser()

        const loginRespone= await request(app)
            .post('/auth/login')
            .send({
                email: userData.email,
                password: userData.password
            })
        const {accessToken,refreshToken}= loginRespone.body.token   

        const accessHeader= JSON.parse(Buffer.from(accessToken.split('.')[0], 'base64').toString())
        const refreshHeader= JSON.parse(Buffer.from(refreshToken.split('.')[0],'base64').toString())  
        
        expect(accessHeader.typ).toBe('JWT')
        expect(accessHeader.alg).toBe('HS256')
        expect(refreshHeader.typ).toBe('JWT')
        expect(refreshHeader.alg).toBe('HS256')
       })
    })

    describe('Profile Routes', () => {

        let token;
        let userData;
        beforeAll(async () => {
            userData= await registerUser();

            const loginResponse= await request(app)
            .post('/auth/login')
            .send({
                email: userData.email,
                password: userData.password
            })
            token= loginResponse.body.token.accessToken
        })
        
        it('GET /me should return user profile', async() => {

            const response= await request(app)
                .get('/user/me')
                .set('Authorization', `Bearer ${token}`)
                .expect(200)
            
            expect(response.body.success).toBe(true)
            expect(response.body.data.email).toBe(userData.email)
            expect(response.body.data.name).toBe(userData.name)
            expect(response.body.data.phone).toBe(userData.phone)
            expect(response.body.data.password).toBeUndefined()
        })

        it('PUT /me should update profile', async () => {
            const updatedData= {name: 'updatedName', phone: '4395734052'}

            const response= await request(app)
                .put('/user/me')
                .set('Authorization', `Bearer ${token}`)
                .send(updatedData)
                .expect(200)
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(updatedData.name);
            expect(response.body.data.phone).toBe(updatedData.phone);    
        })

        it('PUT /me with invalid data should fail', async () => {
            const updatedData= {name: '',phone: 'efjsnlef'}

            const response= await request(app)
                .put('/user/me')
                .set('Authorization', `Bearer ${token}`)
                .send(updatedData)
                .expect(400)
            expect(response.body.success).toBe(false)
            expect(response.body.message).toMatch(/number|empty/)
        })
    })
})

