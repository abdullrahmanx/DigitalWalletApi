# Digital Wallet API

A secure, production-ready RESTful API for managing digital wallets, transactions, and user accounts. Built with Node.js, Express, and MongoDB.

## Features

### Authentication & Security
- JWT-based authentication with access and refresh tokens
- Email verification system
- Password reset functionality
- Bcrypt password hashing
- PIN protection for sensitive operations
- Multi-layer rate limiting (auth, wallet operations, high-value transactions)
- IP banning after repeated abuse attempts
- Security headers (Helmet, CORS, XSS protection, NoSQL injection prevention)

### Wallet Management
- Create multiple wallets per user
- Support for multiple currencies (USD, EGP, EUR)
- Wallet status management (active, suspended, frozen)
- PIN-protected operations

### Transactions
- Deposit funds
- Withdraw funds (PIN-required)
- Peer-to-peer money transfers
- Transaction history with filtering and sorting
- Atomic transactions using Mongoose sessions
- Transaction cancellation workflow with admin approval

### Admin Features
- Role-based access control
- Review and approve/reject cancellation requests
- View all user wallets and transactions

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Joi
- **Security**: bcrypt, helmet, cors, express-rate-limit, xss-clean, express-mongo-sanitize, hpp
- **Email**: Nodemailer

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/abdullrahmanx/DigitalWalletApi.git
cd DigitalWalletApi
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Variables**

Create a `.env` file in the root directory (copy from `.env.example`):

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGO_URL=mongodb://localhost:27017/digital-wallet

# JWT Secrets
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH=your_jwt_refresh_secret_here

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM='"Digital Wallet API" <no-reply@yourapp.com>'

# Frontend URL
FRONT_URL=http://localhost:3000
```

**Important Notes:**
- Never commit your `.env` file to Git
- For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833), not your regular password
- Generate strong JWT secrets using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

4. **Start the server**
```bash
npm start
```

The API will be available at `http://localhost:3000`

## API Documentation

### Base URL
```
http://localhost:3000
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890"
}
```

#### Verify Email
```http
GET /auth/verify-email/:token
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Refresh Token
```http
POST /auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

#### Logout
```http
POST /auth/logout
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

#### Change Password
```http
PUT /auth/password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

#### Forgot Password
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### Reset Password
```http
POST /auth/reset-password/:token
Content-Type: application/json

{
  "newPassword": "newpassword123"
}
```

### User Endpoints

#### Get User Profile
```http
GET /user/me
Authorization: Bearer <access_token>
```

#### Update Profile
```http
PUT /user/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "John Updated",
  "phone": "+9876543210"
}
```

### Wallet Endpoints

#### Create Wallet
```http
POST /wallets
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "pin": "1234",
  "currency": "USD"
}
```

#### Get All Wallets
```http
GET /wallets?page=1&limit=10&currency=USD&sortBy=createdAt&sortOrder=desc
Authorization: Bearer <access_token>
```

#### Get Single Wallet
```http
GET /wallets/:id
Authorization: Bearer <access_token>
```

#### Update Wallet
```http
PUT /wallets/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "pin": "5678",
  "currency": "EUR",
  "status": "active"
}
```

#### Delete Wallet
```http
DELETE /wallets/:id
Authorization: Bearer <access_token>
```

#### Deposit Money
```http
POST /wallets/deposit/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": 100,
  "description": "Salary deposit"
}
```

#### Withdraw Money
```http
POST /wallets/withdraw/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": 50,
  "pin": "1234"
}
```

#### Send Money (P2P Transfer)
```http
POST /wallets/send-money/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "recipientWalletId": "recipient_wallet_id",
  "amount": 25,
  "description": "Payment for lunch"
}
```

### Transaction Endpoints

#### Get Transaction History
```http
GET /transactions/history?status=completed&type=deposit&sortBy=createdAt&order=desc
Authorization: Bearer <access_token>
```

#### Get Single Transaction
```http
GET /transactions/:id
Authorization: Bearer <access_token>
```

#### Request Transaction Cancellation
```http
POST /transactions/cancel-request/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "reason": "Sent to wrong wallet by mistake"
}
```

#### Get Cancellation Requests (Admin Only)
```http
GET /transactions/cancel-requests?page=1&limit=10&status=pending
Authorization: Bearer <admin_access_token>
```

#### Approve Cancellation (Admin Only)
```http
POST /transactions/cancel-approve/:id
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "adminReason": "Valid reason provided"
}
```

#### Reject Cancellation (Admin Only)
```http
POST /transactions/cancel-reject/:id
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "adminReason": "Transaction already completed"
}
```

## Security Features

### Rate Limiting
- **Auth endpoints**: 5 requests per 15 minutes
- **Wallet read operations**: 2 requests per 15 seconds
- **Wallet write operations**: 1 request per 15 seconds
- **High-value transfers** (>$1000): 3 requests per 5 minutes
- **Global limit**: 100 requests per 15 minutes

### IP Banning
- After 50 failed login attempts, IP is permanently banned
- After 5 failed attempts, 15-minute cooldown period

### Transaction Safety
- Mongoose transactions ensure atomic operations
- Wallets can be frozen or suspended
- Currency validation prevents cross-currency transfers
- 24-hour window for transaction cancellations

## Project Structure

```
DigitalWalletApi/
├── controllers/
│   ├── userController.js
│   └── walletController.js
├── middlewares/
│   ├── cors.js
│   ├── errorHandler.js
│   ├── rateLimit.js
│   ├── userValidation.js
│   ├── validateTransactionCancellation.js
│   ├── verifyRole.js
│   ├── verifyToken.js
│   └── walletValidation.js
├── models/
│   ├── userModel.js
│   ├── walletModel.js
│   ├── transactionModel.js
│   └── cancelTransactionModel.js
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── walletRoutes.js
│   └── transactionRoutes.js
├── utils/
│   ├── appError.js
│   ├── email.js
│   └── transactionCancel.js
├── .env.example
├── .gitignore
├── server.js
├── package.json
└── README.md
```

## Error Handling

The API uses a centralized error handling middleware that catches:
- Validation errors
- Duplicate key errors
- Cast errors (invalid MongoDB IDs)
- Custom application errors

All errors return a consistent JSON format:
```json
{
  "status": "Error",
  "message": "Error description"
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Future Enhancements

- [ ] Add unit and integration tests
- [ ] Implement webhook notifications
- [ ] Add support for more currencies
- [ ] Transaction receipts and statements
- [ ] Two-factor authentication (2FA)
- [ ] KYC verification system
- [ ] Transaction limits per user tier
- [ ] Export transaction history (CSV/PDF)

## License

This project is open source and available under the [MIT License](LICENSE).

## Author

**Abdullrahman**
- GitHub: [@abdullrahmanx](https://github.com/abdullrahmanx)

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Note**: This is a demonstration project. For production use, ensure proper security audits, compliance with financial regulations, and additional features like proper logging, monitoring, and backup strategies.
