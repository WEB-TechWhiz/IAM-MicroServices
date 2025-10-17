 const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { HTTP_STATUS } = require('../utils/constants');

class UserService {
  async getAllUsers(query = {}) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    let filter = {};
    if (search) {
      filter = {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const users = await User.find(filter)
      .populate('roles', 'name description')
      .populate('policies', 'name description')
      .skip(skip)
      .limit(parseInt(limit))
      .select('-refreshToken');

    const total = await User.countDocuments(filter);

    return {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getUserById(userId) {
    const user = await User.findById(userId)
      .populate('roles')
      .populate('policies')
      .select('-refreshToken');

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    return user;
  }

  async updateUser(userId, updateData) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-refreshToken');

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    return user;
  }

  async deleteUser(userId) {
    const user = await User.findByIdAndDelete(userId);
    
    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    await Session.deleteMany({ userId });
    return user;
  }

  async assignRoles(userId, roleIds) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { roles: { $each: roleIds } } },
      { new: true }
    ).populate('roles');

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    return user;
  }

  async removeRoles(userId, roleIds) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { roles: { $in: roleIds } } },
      { new: true }
    ).populate('roles');

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    return user;
  }
}

module.exports = new UserService();
