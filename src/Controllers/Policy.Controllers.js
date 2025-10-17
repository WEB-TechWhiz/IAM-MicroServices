import asyncHandler from 'express-async-handler';
import Policy from '../models/policy.js';  // Adjust the path to your Policy model
import ApiError from '../utils/ApiError.js';

// Create a new policy
export const createPolicy = asyncHandler(async (req, res) => {
  const { name, description, permissions } = req.body;

  if (!name || name.trim() === '') {
    throw new ApiError(400, 'Policy name is required');
  }

  const existingPolicy = await Policy.findOne({ name: name.toLowerCase() });
  if (existingPolicy) {
    throw new ApiError(409, 'Policy with this name already exists');
  }

  const policy = await Policy.create({
    name: name.toLowerCase(),
    description: description || '',
    permissions: permissions || [],
    createdBy: req.user._id
  });

  return res.status(201).json({
    success: true,
    data: policy,
    message: 'Policy created successfully'
  });
});

// Get all policies
export const getPolicies = asyncHandler(async (req, res) => {
  const policies = await Policy.find();
  res.status(200).json({ success: true, data: policies });
});

// Get single policy by ID
export const getPolicyById = asyncHandler(async (req, res) => {
  const policy = await Policy.findById(req.params.id);
  if (!policy) {
    throw new ApiError(404, 'Policy not found');
  }
  res.status(200).json({ success: true, data: policy });
});

// Update a policy
export const updatePolicy = asyncHandler(async (req, res) => {
  const policy = await Policy.findById(req.params.id);
  if (!policy) {
    throw new ApiError(404, 'Policy not found');
  }

  policy.name = req.body.name ? req.body.name.toLowerCase() : policy.name;
  policy.description = req.body.description || policy.description;
  policy.permissions = req.body.permissions || policy.permissions;

  await policy.save();

  res.status(200).json({ success: true, data: policy, message: 'Policy updated successfully' });
});

// Delete a policy
export const deletePolicy = asyncHandler(async (req, res) => {
  const policy = await Policy.findById(req.params.id);
  if (!policy) {
    throw new ApiError(404, 'Policy not found');
  }

  await policy.remove();

  res.status(200).json({ success: true, message: 'Policy deleted successfully' });
});
