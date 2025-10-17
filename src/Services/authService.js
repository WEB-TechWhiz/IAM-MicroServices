//  const User = require('../models/User');
// const Session = require('../models/Session');
// const tokenService = require('./tokenService');
// const ApiError = require('../utils/ApiError');
// const { HTTP_STATUS } = require('../utils/constants');
// const logger = require('../utils/logger');

// class AuthService {
//   async register(userData) {
//     const { username, email, password } = userData;

//     const existingUser = await User.findOne({ $or: [{ email }, { username }] });
//     if (existingUser) {
//       throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'User already exists');
//     }

//     const user = await User.create({ username, email, password });
//     logger.info(`New user registered: ${email}`);

//     return this.generateAuthResponse(user);
//   }

//   async login(credentials, ipAddress, userAgent) {
//     const { email, password } = credentials;

//     const user = await User.findOne({ email }).select('+password');
//     if (!user || !(await user.comparePassword(password))) {
//       throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid credentials');
//     }

//     if (!user.isActive) {
//       throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Account is deactivated');
//     }

//     user.lastLogin = Date.now();
//     await user.save();

//     const authResponse = await this.generateAuthResponse(user);
    
//     await this.createSession(user._id, authResponse.token, authResponse.refreshToken, ipAddress, userAgent);
    
//     logger.info(`User logged in: ${email}`);
//     return authResponse;
//   }

//   async logout(userId, token) {
//     await Session.findOneAndUpdate(
//       { userId, token },
//       { isActive: false }
//     );
//     logger.info(`User logged out: ${userId}`);
//   }

//   async refreshToken(refreshToken) {
//     const decoded = tokenService.verifyRefreshToken(refreshToken);
//     const user = await User.findById(decoded.id);

//     if (!user) {
//       throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'User not found');
//     }

//     return this.generateAuthResponse(user);
//   }

//   async generateAuthResponse(user) {
//     const token = tokenService.generateAccessToken(user._id);
//     const refreshToken = tokenService.generateRefreshToken(user._id);

//     user.refreshToken = refreshToken;
//     await user.save({ validateBeforeSave: false });

//     return {
//       token,
//       refreshToken,
//       user: {
//         id: user._id,
//         username: user.username,
//         email: user.email,
//         roles: user.roles
//       }
//     };
//   }

//   async createSession(userId, token, refreshToken, ipAddress, userAgent) {
//     const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
//     await Session.create({
//       userId,
//       token,
//       refreshToken,
//       ipAddress,
//       userAgent,
//       expiresAt
//     });
//   }
// }

// module.exports = new AuthService();