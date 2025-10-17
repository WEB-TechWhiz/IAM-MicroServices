const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../utils/constants');

class TokenService {
  generateAccessToken(userId) {
    return jwt.sign({ id: userId }, config.jwt.secret, {
      expiresIn: config.jwt.expire
    });
  }

  generateRefreshToken(userId) {
    return jwt.sign({ id: userId }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpire
    });
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid or expired token');
    }
  }

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, config.jwt.refreshSecret);
    } catch (error) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid or expired refresh token');
    }
  }

  setCookieToken(res, token, refreshToken) {
    const cookieOptions = {
      expires: new Date(Date.now() + config.cookie.expire * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'strict'
    };

    res.cookie('accessToken', token, cookieOptions);
    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
  }

  clearCookies(res) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
  }
}

module.exports = new TokenService();