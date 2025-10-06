 const Role = require('../models/Role');
const ApiError = require('../utils/apiError');
const { HTTP_STATUS } = require('../utils/constants');

class RoleService {
  async createRole(roleData) {
    const existingRole = await Role.findOne({ name: roleData.name });
    if (existingRole) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Role already exists');
    }

    const role = await Role.create(roleData);
    return role;
  }

  async getAllRoles() {
    return await Role.find().populate('policies');
  }

  async getRoleById(roleId) {
    const role = await Role.findById(roleId).populate('policies');
    if (!role) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Role not found');
    }
    return role;
  }

  async updateRole(roleId, updateData) {
    const role = await Role.findByIdAndUpdate(
      roleId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!role) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Role not found');
    }

    return role;
  }

  async deleteRole(roleId) {
    const role = await Role.findById(roleId);
    
    if (!role) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Role not found');
    }

    if (role.isSystem) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Cannot delete system role');
    }

    await Role.findByIdAndDelete(roleId);
    return role;
  }
}

module.exports = new RoleService();