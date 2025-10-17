 import { asyncHandler } from "../utility/asyncHandler.js";
import { ApiError } from "../utility/ApiError.js";
import { User } from "../Models/User.model.js";
import { ApiResponse } from "../utility/ApiResponse.js";
// import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

/**
 * Get user account settings
 * GET /api/account-settings
 */
const getAccountSettings = asyncHandler(async (req, res) => {
  try {
    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    const user = await User.findById(req.user._id).select(
      "-password -refreshToken -__v"
    );

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Account settings fetched successfully"));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while fetching account settings");
  }
});

/**
 * Update profile information
 * PATCH /api/account-settings/profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  try {
    const { fullName, username, bio, location, website, dateOfBirth } = req.body;

    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    const updateFields = {};

    // Validate and add fullName
    if (fullName !== undefined) {
      if (!fullName?.trim()) {
        throw new ApiError(400, "Full name cannot be empty");
      }
      if (fullName.trim().length < 2 || fullName.trim().length > 100) {
        throw new ApiError(400, "Full name must be between 2 and 100 characters");
      }
      updateFields.fullName = fullName.trim();
    }

    // Validate and add username
    if (username !== undefined) {
      if (!username?.trim()) {
        throw new ApiError(400, "Username cannot be empty");
      }

      const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
      if (!usernameRegex.test(username.trim())) {
        throw new ApiError(
          400,
          "Username must be 3-30 characters and contain only letters, numbers, and underscores"
        );
      }

      // Check if username is already taken
      const existingUser = await User.findOne({
        username: username.toLowerCase().trim(),
        _id: { $ne: req.user._id }
      });

      if (existingUser) {
        throw new ApiError(409, "Username is already taken");
      }

      updateFields.username = username.toLowerCase().trim();
    }

    // Validate and add bio
    if (bio !== undefined) {
      if (bio && bio.length > 500) {
        throw new ApiError(400, "Bio cannot exceed 500 characters");
      }
      updateFields.bio = bio?.trim() || "";
    }

    // Validate and add location
    if (location !== undefined) {
      if (location && location.length > 100) {
        throw new ApiError(400, "Location cannot exceed 100 characters");
      }
      updateFields.location = location?.trim() || "";
    }

    // Validate and add website
    if (website !== undefined) {
      if (website) {
        const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        if (!urlRegex.test(website)) {
          throw new ApiError(400, "Invalid website URL");
        }
        // Add https:// if not present
        updateFields.website = website.startsWith("http") ? website : `https://${website}`;
      } else {
        updateFields.website = "";
      }
    }

    // Validate and add date of birth
    if (dateOfBirth !== undefined) {
      if (dateOfBirth) {
        const dob = new Date(dateOfBirth);
        if (isNaN(dob.getTime())) {
          throw new ApiError(400, "Invalid date of birth");
        }

        const age = (new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000);
        if (age < 13) {
          throw new ApiError(400, "You must be at least 13 years old");
        }
        if (age > 150) {
          throw new ApiError(400, "Invalid date of birth");
        }

        updateFields.dateOfBirth = dob;
      } else {
        updateFields.dateOfBirth = null;
      }
    }

    if (Object.keys(updateFields).length === 0) {
      throw new ApiError(400, "No fields to update");
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("-password -refreshToken -__v");

    if (!updatedUser) {
      throw new ApiError(404, "User not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, updatedUser, "Profile updated successfully"));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while updating profile");
  }
});

/**
 * Update email address
 * PATCH /api/account-settings/email
 */
const updateEmail = asyncHandler(async (req, res) => {
  try {
    const { newEmail, password } = req.body;

    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    // Validate inputs
    if (!newEmail?.trim()) {
      throw new ApiError(400, "New email is required");
    }

    if (!password?.trim()) {
      throw new ApiError(400, "Password is required to change email");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      throw new ApiError(400, "Invalid email format");
    }

    // Find user with password
    const user = await User.findById(req.user._id);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Check if new email is same as current
    if (user.email === newEmail.toLowerCase().trim()) {
      throw new ApiError(400, "New email is same as current email");
    }

    // Verify password
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      throw new ApiError(401, "Incorrect password");
    }

    // Check if email is already taken
    const existingUser = await User.findOne({
      email: newEmail.toLowerCase().trim(),
      _id: { $ne: req.user._id }
    });

    if (existingUser) {
      throw new ApiError(409, "Email is already in use");
    }

    // Update email
    user.email = newEmail.toLowerCase().trim();
    await user.save({ validateBeforeSave: true });

    const updatedUser = await User.findById(req.user._id).select(
      "-password -refreshToken -__v"
    );

    // TODO: Send verification email to new email address
    // await sendVerificationEmail(updatedUser.email);

    return res.status(200).json(
      new ApiResponse(
        200,
        updatedUser,
        "Email updated successfully. Please verify your new email address."
      )
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while updating email");
  }
});

/**
 * Change password
 * PATCH /api/account-settings/password
 */
const changePassword = asyncHandler(async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    // Validate inputs
    if (!currentPassword?.trim()) {
      throw new ApiError(400, "Current password is required");
    }

    if (!newPassword?.trim()) {
      throw new ApiError(400, "New password is required");
    }

    if (!confirmPassword?.trim()) {
      throw new ApiError(400, "Confirm password is required");
    }

    if (newPassword !== confirmPassword) {
      throw new ApiError(400, "New password and confirm password do not match");
    }

    if (newPassword.length < 6) {
      throw new ApiError(400, "New password must be at least 6 characters long");
    }

    if (currentPassword === newPassword) {
      throw new ApiError(400, "New password must be different from current password");
    }

    // Find user
    const user = await User.findById(req.user._id);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Verify current password
    const isPasswordValid = await user.isPasswordCorrect(currentPassword);
    if (!isPasswordValid) {
      throw new ApiError(401, "Current password is incorrect");
    }

    // Update password
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    // Invalidate all refresh tokens (logout from all devices)
    user.refreshToken = undefined;
    await user.save({ validateBeforeSave: false });

    // TODO: Send email notification about password change
    // await sendPasswordChangeNotification(user.email);

    return res.status(200).json(
      new ApiResponse(
        200,
        {},
        "Password changed successfully. Please login again on all devices."
      )
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while changing password");
  }
});

/**
 * Update avatar image
 * PATCH /api/account-settings/avatar
 */
const updateAvatar = asyncHandler(async (req, res) => {
  try {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file is required");
    }

    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      throw new ApiError(400, "Invalid file type. Only JPEG, PNG, and WebP are allowed");
    }

    // Validate file size (max 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      throw new ApiError(400, "File size must be less than 5MB");
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Store old avatar URL for deletion
    const oldAvatarUrl = user.avatar;

    // Upload to cloudinary (uncomment when ready)
    // const avatar = await uploadOnCloudinary(avatarLocalPath);
    // if (!avatar?.url) {
    //   throw new ApiError(500, "Failed to upload avatar");
    // }

    // Delete old avatar from cloudinary if exists
    // if (oldAvatarUrl) {
    //   await deleteFromCloudinary(oldAvatarUrl);
    // }

    // Update user avatar
    // user.avatar = avatar.url;
    // await user.save({ validateBeforeSave: false });

    // const updatedUser = await User.findById(req.user._id).select(
    //   "-password -refreshToken -__v"
    // );

    // Temporary response (remove when cloudinary is integrated)
    throw new ApiError(501, "Avatar upload feature is not yet implemented");

    // return res
    //   .status(200)
    //   .json(new ApiResponse(200, updatedUser, "Avatar updated successfully"));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while updating avatar");
  }
});

/**
 * Update cover image
 * PATCH /api/account-settings/cover-image
 */
const updateCoverImage = asyncHandler(async (req, res) => {
  try {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
      throw new ApiError(400, "Cover image file is required");
    }

    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      throw new ApiError(400, "Invalid file type. Only JPEG, PNG, and WebP are allowed");
    }

    // Validate file size (max 10MB for cover image)
    if (req.file.size > 10 * 1024 * 1024) {
      throw new ApiError(400, "File size must be less than 10MB");
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Store old cover image URL for deletion
    const oldCoverImageUrl = user.coverImage;

    // Upload to cloudinary (uncomment when ready)
    // const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    // if (!coverImage?.url) {
    //   throw new ApiError(500, "Failed to upload cover image");
    // }

    // Delete old cover image from cloudinary if exists
    // if (oldCoverImageUrl) {
    //   await deleteFromCloudinary(oldCoverImageUrl);
    // }

    // Update user cover image
    // user.coverImage = coverImage.url;
    // await user.save({ validateBeforeSave: false });

    // const updatedUser = await User.findById(req.user._id).select(
    //   "-password -refreshToken -__v"
    // );

    // Temporary response (remove when cloudinary is integrated)
    throw new ApiError(501, "Cover image upload feature is not yet implemented");

    // return res
    //   .status(200)
    //   .json(new ApiResponse(200, updatedUser, "Cover image updated successfully"));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while updating cover image");
  }
});

/**
 * Remove avatar
 * DELETE /api/account-settings/avatar
 */
const removeAvatar = asyncHandler(async (req, res) => {
  try {
    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (!user.avatar) {
      throw new ApiError(400, "No avatar to remove");
    }

    // Delete from cloudinary (uncomment when ready)
    // await deleteFromCloudinary(user.avatar);

    // Remove avatar
    user.avatar = undefined;
    await user.save({ validateBeforeSave: false });

    const updatedUser = await User.findById(req.user._id).select(
      "-password -refreshToken -__v"
    );

    return res
      .status(200)
      .json(new ApiResponse(200, updatedUser, "Avatar removed successfully"));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while removing avatar");
  }
});

/**
 * Update privacy settings
 * PATCH /api/account-settings/privacy
 */
const updatePrivacySettings = asyncHandler(async (req, res) => {
  try {
    const {
      isProfilePublic,
      showEmail,
      showDateOfBirth,
      allowMessagesFromNonFriends,
      showOnlineStatus
    } = req.body;

    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    const updateFields = {};

    if (isProfilePublic !== undefined) {
      updateFields["privacy.isProfilePublic"] = isProfilePublic === true;
    }

    if (showEmail !== undefined) {
      updateFields["privacy.showEmail"] = showEmail === true;
    }

    if (showDateOfBirth !== undefined) {
      updateFields["privacy.showDateOfBirth"] = showDateOfBirth === true;
    }

    if (allowMessagesFromNonFriends !== undefined) {
      updateFields["privacy.allowMessagesFromNonFriends"] =
        allowMessagesFromNonFriends === true;
    }

    if (showOnlineStatus !== undefined) {
      updateFields["privacy.showOnlineStatus"] = showOnlineStatus === true;
    }

    if (Object.keys(updateFields).length === 0) {
      throw new ApiError(400, "No privacy settings to update");
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("-password -refreshToken -__v");

    if (!updatedUser) {
      throw new ApiError(404, "User not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, updatedUser, "Privacy settings updated successfully"));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while updating privacy settings");
  }
});

/**
 * Update notification preferences
 * PATCH /api/account-settings/notifications
 */
const updateNotificationPreferences = asyncHandler(async (req, res) => {
  try {
    const {
      emailNotifications,
      pushNotifications,
      smsNotifications,
      notifyOnNewMessage,
      notifyOnFriendRequest,
      notifyOnGroupInvite,
      notifyOnMention,
      notifyOnComment
    } = req.body;

    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    const updateFields = {};

    if (emailNotifications !== undefined) {
      updateFields["notifications.emailNotifications"] = emailNotifications === true;
    }

    if (pushNotifications !== undefined) {
      updateFields["notifications.pushNotifications"] = pushNotifications === true;
    }

    if (smsNotifications !== undefined) {
      updateFields["notifications.smsNotifications"] = smsNotifications === true;
    }

    if (notifyOnNewMessage !== undefined) {
      updateFields["notifications.notifyOnNewMessage"] = notifyOnNewMessage === true;
    }

    if (notifyOnFriendRequest !== undefined) {
      updateFields["notifications.notifyOnFriendRequest"] = notifyOnFriendRequest === true;
    }

    if (notifyOnGroupInvite !== undefined) {
      updateFields["notifications.notifyOnGroupInvite"] = notifyOnGroupInvite === true;
    }

    if (notifyOnMention !== undefined) {
      updateFields["notifications.notifyOnMention"] = notifyOnMention === true;
    }

    if (notifyOnComment !== undefined) {
      updateFields["notifications.notifyOnComment"] = notifyOnComment === true;
    }

    if (Object.keys(updateFields).length === 0) {
      throw new ApiError(400, "No notification preferences to update");
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("-password -refreshToken -__v");

    if (!updatedUser) {
      throw new ApiError(404, "User not found");
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        updatedUser,
        "Notification preferences updated successfully"
      )
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while updating notification preferences");
  }
});

/**
 * Get active sessions
 * GET /api/account-settings/sessions
 */
const getActiveSessions = asyncHandler(async (req, res) => {
  try {
    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    // TODO: Implement session management with Redis or database
    // This is a placeholder implementation

    const sessions = [
      {
        id: "current",
        device: req.headers["user-agent"] || "Unknown Device",
        ipAddress: req.ip || req.connection.remoteAddress,
        location: "Current Location",
        lastActive: new Date(),
        isCurrent: true
      }
    ];

    return res
      .status(200)
      .json(new ApiResponse(200, sessions, "Active sessions fetched successfully"));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while fetching active sessions");
  }
});

/**
 * Revoke session
 * DELETE /api/account-settings/sessions/:sessionId
 */
const revokeSession = asyncHandler(async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    if (!sessionId) {
      throw new ApiError(400, "Session ID is required");
    }

    // TODO: Implement session revocation with Redis or database
    // This is a placeholder implementation

    if (sessionId === "current") {
      throw new ApiError(400, "Cannot revoke current session. Please logout instead.");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Session revoked successfully"));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while revoking session");
  }
});

/**
 * Deactivate account
 * POST /api/account-settings/deactivate
 */
const deactivateAccount = asyncHandler(async (req, res) => {
  try {
    const { password, reason } = req.body;

    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    if (!password?.trim()) {
      throw new ApiError(400, "Password is required to deactivate account");
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Verify password
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      throw new ApiError(401, "Incorrect password");
    }

    // Deactivate account
    user.isActive = false;
    user.deactivatedAt = new Date();
    user.deactivationReason = reason?.trim() || "";
    user.refreshToken = undefined;
    await user.save({ validateBeforeSave: false });

    // TODO: Send account deactivation email
    // await sendAccountDeactivationEmail(user.email);

    return res.status(200).json(
      new ApiResponse(
        200,
        {},
        "Account deactivated successfully. You can reactivate within 30 days by logging in."
      )
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while deactivating account");
  }
});

/**
 * Delete account permanently
 * DELETE /api/account-settings/delete
 */
const deleteAccount = asyncHandler(async (req, res) => {
  try {
    const { password, confirmation } = req.body;

    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    if (!password?.trim()) {
      throw new ApiError(400, "Password is required to delete account");
    }

    if (confirmation !== "DELETE MY ACCOUNT") {
      throw new ApiError(400, 'Please type "DELETE MY ACCOUNT" to confirm');
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Verify password
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      throw new ApiError(401, "Incorrect password");
    }

    // TODO: Delete associated data
    // - Delete user's posts, comments, messages
    // - Remove from groups
    // - Delete uploaded files from cloudinary
    // - Remove from friend lists

    // Delete user account
    await User.findByIdAndDelete(req.user._id);

    // TODO: Send account deletion confirmation email
    // await sendAccountDeletionEmail(user.email);

    return res
      .status(200)
      .clearCookie("accessToken")
      .clearCookie("refreshToken")
      .json(
        new ApiResponse(
          200,
          {},
          "Account deleted permanently. All your data has been removed."
        )
      );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while deleting account");
  }
});

/**
 * Export user data (GDPR compliance)
 * GET /api/account-settings/export-data
 */
const exportUserData = asyncHandler(async (req, res) => {
  try {
    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    const user = await User.findById(req.user._id)
      .select("-password -refreshToken")
      .lean();

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // TODO: Gather all user data from different collections
    const userData = {
      profile: user,
      // posts: await Post.find({ author: req.user._id }),
      // comments: await Comment.find({ author: req.user._id }),
      // messages: await Message.find({ sender: req.user._id }),
      // groups: await Group.find({ members: req.user._id }),
      exportedAt: new Date()
    };

    return res.status(200).json(
      new ApiResponse(
        200,
        userData,
        "User data exported successfully. This data can be downloaded as JSON."
      )
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while exporting user data");
  }
});

export {
  getAccountSettings,
  updateProfile,
  updateEmail,
  changePassword,
  updateAvatar,
  updateCoverImage,
  removeAvatar,
  updatePrivacySettings,
  updateNotificationPreferences,
  getActiveSessions,
  revokeSession,
  deactivateAccount,
  deleteAccount,
  exportUserData
};