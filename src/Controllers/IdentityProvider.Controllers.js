//  import asyncHandler from 'express-async-handler';
import { asyncHandler } from '../utility/asyncHandler.js';
import IdentityProvider from '../Models/identity.js';  // Adjust path as needed
import ApiError from '../utils/ApiError.js';

// Create a new Identity Provider
export const createIdentityProvider = asyncHandler(async (req, res) => {
  const { name, authorityUrl, clientId, clientSecret, description } = req.body;

  if (!name || !authorityUrl || !clientId || !clientSecret) {
    throw new ApiError(400, 'Name, Authority URL, Client ID, and Client Secret are required');
  }

  const existingProvider = await IdentityProvider.findOne({ name: name.toLowerCase() });
  if (existingProvider) {
    throw new ApiError(409, 'Identity Provider with this name already exists');
  }

  const identityProvider = await IdentityProvider.create({
    name: name.toLowerCase(),
    authorityUrl,
    clientId,
    clientSecret,
    description: description || '',
    createdBy: req.user._id
  });

  res.status(201).json({
    success: true,
    data: identityProvider,
    message: 'Identity Provider created successfully'
  });
});

// Get list of all Identity Providers
export const getIdentityProviders = asyncHandler(async (req, res) => {
  const providers = await IdentityProvider.find();
  res.status(200).json({ success: true, data: providers });
});

// Get single Identity Provider by ID
export const getIdentityProviderById = asyncHandler(async (req, res) => {
  const provider = await IdentityProvider.findById(req.params.id);
  if (!provider) {
    throw new ApiError(404, 'Identity Provider not found');
  }
  res.status(200).json({ success: true, data: provider });
});

// Update an Identity Provider
export const updateIdentityProvider = asyncHandler(async (req, res) => {
  const provider = await IdentityProvider.findById(req.params.id);
  if (!provider) {
    throw new ApiError(404, 'Identity Provider not found');
  }

  provider.name = req.body.name ? req.body.name.toLowerCase() : provider.name;
  provider.authorityUrl = req.body.authorityUrl || provider.authorityUrl;
  provider.clientId = req.body.clientId || provider.clientId;
  provider.clientSecret = req.body.clientSecret || provider.clientSecret;
  provider.description = req.body.description || provider.description;

  await provider.save();

  res.status(200).json({ success: true, data: provider, message: 'Identity Provider updated successfully' });
});

// Delete an Identity Provider
export const deleteIdentityProvider = asyncHandler(async (req, res) => {
  const provider = await IdentityProvider.findById(req.params.id);
  if (!provider) {
    throw new ApiError(404, 'Identity Provider not found');
  }

  await provider.remove();

  res.status(200).json({ success: true, message: 'Identity Provider deleted successfully' });
});
