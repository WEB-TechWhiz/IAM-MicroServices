import { ApiError } from "../utility/ApiError.js";
import { asyncHandler } from "../utility/asyncHandler.js";
import { Role } from '../Models/Roles.models.js';
import { ApiResponse } from "../utility/ApiResponse.js";

// Create Role - ensures name uniqueness, default permissions if any
const createRole = asyncHandler(async (req, res) => {
  const { name, description, permissions } = req.body;
  if (!name || name.trim() === "") throw new ApiError(400, "Role name is required");

  const existing = await Role.findOne({ name: name.toLowerCase() });
  if (existing) throw new ApiError(409, "Role with this name already exists");

  const role = await Role.create({
    name: name.toLowerCase(),
    description: description || "",
    permissions: permissions || [],
    createdBy: req.user._id,
  });

  res.status(201).json(new ApiResponse(201, role, "Role created successfully"));
});

// Get all roles with optional search
const getAllRoles = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;
  const query = search ? { name: { $regex: search, $options: 'i' } } : {};
  const roles = await Role.find(query)
    .skip((page - 1) * parseInt(limit))
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });
  const total = await Role.countDocuments(query);
  res.status(200).json(new ApiResponse(200, {
    roles,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      total,
      limit: parseInt(limit),
    },
  }, "Roles fetched successfully"));
});

// Get role by ID
const getRoleById = asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  if (!roleId) throw new ApiError(400, "Role ID is required");
  const role = await Role.findById(roleId);
  if (!role) throw new ApiError(404, "Role not found");
  res.status(200).json(new ApiResponse(200, role, "Role fetched successfully"));
});

// Update role
const updateRole = asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  const { name, description, permissions } = req.body;
  if (!roleId) throw new ApiError(400, "Role ID is required");
  const role = await Role.findById(roleId);
  if (!role) throw new ApiError(404, "Role not found");
  if (name && name.toLowerCase() !== role.name) {
    const existing = await Role.findOne({ name: name.toLowerCase() });
    if (existing) throw new ApiError(409, "Role with this name already exists");
    role.name = name.toLowerCase();
  }
  if (description !== undefined) role.description = description;
  if (permissions !== undefined) role.permissions = permissions;
  role.updatedBy = req.user._id;
  await role.save();
  res.status(200).json(new ApiResponse(200, role, "Role updated successfully"));
});

// Delete role - prevent system roles if applicable
const deleteRole = asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  if (!roleId) throw new ApiError(400, "Role ID is required");
  const role = await Role.findById(roleId);
  if (!role) throw new ApiError(404, "Role not found");
  if (role.isSystemRole) throw new ApiError(403, "System roles cannot be deleted");
  await Role.findByIdAndDelete(roleId);
  res.status(200).json(new ApiResponse(200, {}, "Role deleted successfully"));
});

// Assign role to user
const assignRoleToUser = asyncHandler(async (req, res) => {
  const { userId, roleId } = req.body;
  if (!userId || !roleId) throw new ApiError(400, "User ID and Role ID are required");
  const role = await Role.findById(roleId);
  if (!role) throw new ApiError(404, "Role not found");
  const { User } = await import('../Models/User.model.js');
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");
  user.role = roleId;
  await user.save({ validateBeforeSave: false });
  const updatedUser = await User.findById(userId).select("-password -refreshToken").populate('role', 'name permissions');
  res.status(200).json(new ApiResponse(200, updatedUser, "Role assigned to user successfully"));
});

// Get users by role
const getUsersByRole = asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  if (!roleId) throw new ApiError(400, "Role ID is required");
  const role = await Role.findById(roleId);
  if (!role) throw new ApiError(404, "Role not found");
  const { User } = await import('../Models/User.model.js');
  const users = await User.find({ role: roleId })
    .select("-password -refreshToken")
    .skip((page - 1) * parseInt(limit))
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });
  const total = await User.countDocuments({ role: roleId });
  res.status(200).json(new ApiResponse(200, {
    role: role.name,
    users,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      total,
      limit: parseInt(limit),
    }
  }, "Users fetched successfully"));
});

// Add permission to role
const addPermissionToRole = asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  const { permission } = req.body;
  if (!roleId || !permission) throw new ApiError(400, "Role ID and permission are required");
  const role = await Role.findById(roleId);
  if (!role) throw new ApiError(404, "Role not found");
  if (role.permissions.includes(permission))
    throw new ApiError(409, "Permission already exists in this role");
  role.permissions.push(permission);
  role.updatedBy = req.user._id;
  await role.save();
  res.status(200).json(new ApiResponse(200, role, "Permission added successfully"));
});

// Remove permission from role
const removePermissionFromRole = asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  const { permission } = req.body;
  if (!roleId || !permission) throw new ApiError(400, "Role ID and permission are required");
  const role = await Role.findById(roleId);
  if (!role) throw new ApiError(404, "Role not found");
  role.permissions = role.permissions.filter(p => p !== permission);
  role.updatedBy = req.user._id;
  await role.save();
  res.status(200).json(new ApiResponse(200, role, "Permission removed successfully"));
});

export {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
  assignRoleToUser,
  getUsersByRole,
  addPermissionToRole,
  removePermissionFromRole,
};
