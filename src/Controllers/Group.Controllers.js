 import { asyncHandler } from "../utility/asyncHandler.js";
import { ApiError } from "../utility/ApiError.js";
import { Group } from "../Models/Group.model.js";
import { User } from "../Models/User.model.js";
import { ApiResponse } from "../utility/ApiResponse.js";
import mongoose from "mongoose";

/**
 * Create a new group
 * POST /api/groups
 */
const createGroup = asyncHandler(async (req, res) => {
  try {
    const { name, description, isPrivate, members } = req.body;

    // Validate required fields
    if (!name?.trim()) {
      throw new ApiError(400, "Group name is required");
    }

    if (name.trim().length < 3 || name.trim().length > 100) {
      throw new ApiError(400, "Group name must be between 3 and 100 characters");
    }

    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    // Validate description if provided
    if (description && description.length > 500) {
      throw new ApiError(400, "Description cannot exceed 500 characters");
    }

    // Validate members array if provided
    let validatedMembers = [];
    if (members && Array.isArray(members)) {
      // Remove duplicates and validate ObjectIds
      const uniqueMembers = [...new Set(members)];
      
      for (const memberId of uniqueMembers) {
        if (!mongoose.Types.ObjectId.isValid(memberId)) {
          throw new ApiError(400, `Invalid member ID: ${memberId}`);
        }
        
        // Check if user exists
        const userExists = await User.findById(memberId).select("_id");
        if (!userExists) {
          throw new ApiError(404, `User not found with ID: ${memberId}`);
        }
        
        validatedMembers.push(memberId);
      }

      // Limit number of initial members
      if (validatedMembers.length > 50) {
        throw new ApiError(400, "Cannot add more than 50 members at once");
      }
    }

    // Ensure creator is included in members
    if (!validatedMembers.includes(req.user._id.toString())) {
      validatedMembers.push(req.user._id);
    }

    // Create group
    const group = await Group.create({
      name: name.trim(),
      description: description?.trim() || "",
      creator: req.user._id,
      admins: [req.user._id],
      members: validatedMembers,
      isPrivate: isPrivate === true
    });

    if (!group) {
      throw new ApiError(500, "Failed to create group");
    }

    // Populate group details
    const populatedGroup = await Group.findById(group._id)
      .populate("creator", "fullName username avatar")
      .populate("admins", "fullName username avatar")
      .populate("members", "fullName username avatar");

    return res
      .status(201)
      .json(new ApiResponse(201, populatedGroup, "Group created successfully"));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while creating group");
  }
});

/**
 * Get all groups (public groups or groups user is member of)
 * GET /api/groups
 */
const getAllGroups = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, search, filterBy } = req.query;

    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      throw new ApiError(400, "Invalid pagination parameters");
    }

    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = {};

    // Filter based on user's relationship with groups
    if (filterBy === "my-groups") {
      query.members = req.user._id;
    } else if (filterBy === "admin") {
      query.admins = req.user._id;
    } else if (filterBy === "created") {
      query.creator = req.user._id;
    } else {
      // Show public groups or groups user is member of
      query.$or = [
        { isPrivate: false },
        { members: req.user._id }
      ];
    }

    // Add search filter
    if (search?.trim()) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { name: { $regex: search.trim(), $options: "i" } },
          { description: { $regex: search.trim(), $options: "i" } }
        ]
      });
    }

    // Get total count
    const totalGroups = await Group.countDocuments(query);

    // Fetch groups
    const groups = await Group.find(query)
      .populate("creator", "fullName username avatar")
      .populate("admins", "fullName username avatar")
      .select("-__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Add member count to each group
    const groupsWithStats = groups.map(group => {
      const groupObj = group.toObject();
      groupObj.memberCount = group.members.length;
      groupObj.isUserMember = group.members.some(
        member => member.toString() === req.user._id.toString()
      );
      groupObj.isUserAdmin = group.admins.some(
        admin => admin._id.toString() === req.user._id.toString()
      );
      return groupObj;
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          groups: groupsWithStats,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(totalGroups / limitNum),
            totalGroups,
            hasNextPage: pageNum < Math.ceil(totalGroups / limitNum),
            hasPrevPage: pageNum > 1
          }
        },
        "Groups fetched successfully"
      )
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while fetching groups");
  }
});

/**
 * Get group by ID
 * GET /api/groups/:groupId
 */
const getGroupById = asyncHandler(async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw new ApiError(400, "Invalid group ID");
    }

    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    const group = await Group.findById(groupId)
      .populate("creator", "fullName username avatar email")
      .populate("admins", "fullName username avatar")
      .populate("members", "fullName username avatar");

    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    // Check if user has access to view group
    const isMember = group.members.some(
      member => member._id.toString() === req.user._id.toString()
    );

    if (group.isPrivate && !isMember) {
      throw new ApiError(403, "You don't have access to this private group");
    }

    // Add additional info
    const groupObj = group.toObject();
    groupObj.memberCount = group.members.length;
    groupObj.isUserMember = isMember;
    groupObj.isUserAdmin = group.admins.some(
      admin => admin._id.toString() === req.user._id.toString()
    );
    groupObj.isUserCreator = group.creator._id.toString() === req.user._id.toString();

    return res
      .status(200)
      .json(new ApiResponse(200, groupObj, "Group fetched successfully"));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while fetching group");
  }
});

/**
 * Update group details
 * PATCH /api/groups/:groupId
 */
const updateGroup = asyncHandler(async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, isPrivate } = req.body;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw new ApiError(400, "Invalid group ID");
    }

    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    // Find group
    const group = await Group.findById(groupId);

    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    // Check if user is admin
    const isAdmin = group.admins.some(
      admin => admin.toString() === req.user._id.toString()
    );

    if (!isAdmin) {
      throw new ApiError(403, "Only group admins can update group details");
    }

    // Validate and prepare update fields
    const updateFields = {};

    if (name !== undefined) {
      if (!name?.trim()) {
        throw new ApiError(400, "Group name cannot be empty");
      }
      if (name.trim().length < 3 || name.trim().length > 100) {
        throw new ApiError(400, "Group name must be between 3 and 100 characters");
      }
      updateFields.name = name.trim();
    }

    if (description !== undefined) {
      if (description && description.length > 500) {
        throw new ApiError(400, "Description cannot exceed 500 characters");
      }
      updateFields.description = description?.trim() || "";
    }

    if (isPrivate !== undefined) {
      updateFields.isPrivate = isPrivate === true;
    }

    // Update group
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $set: updateFields },
      { new: true, runValidators: true }
    )
      .populate("creator", "fullName username avatar")
      .populate("admins", "fullName username avatar")
      .populate("members", "fullName username avatar");

    return res
      .status(200)
      .json(new ApiResponse(200, updatedGroup, "Group updated successfully"));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while updating group");
  }
});

/**
 * Delete group
 * DELETE /api/groups/:groupId
 */
const deleteGroup = asyncHandler(async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw new ApiError(400, "Invalid group ID");
    }

    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    const group = await Group.findById(groupId);

    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    // Only creator can delete group
    if (group.creator.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "Only the group creator can delete the group");
    }

    await Group.findByIdAndDelete(groupId);

    // TODO: Delete associated data (messages, files, etc.)
    // await Message.deleteMany({ group: groupId });
    // await File.deleteMany({ group: groupId });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Group deleted successfully"));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while deleting group");
  }
});

/**
 * Add members to group
 * POST /api/groups/:groupId/members
 */
const addMembers = asyncHandler(async (req, res) => {
  try {
    const { groupId } = req.params;
    const { members } = req.body;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw new ApiError(400, "Invalid group ID");
    }

    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    if (!members || !Array.isArray(members) || members.length === 0) {
      throw new ApiError(400, "Members array is required");
    }

    if (members.length > 50) {
      throw new ApiError(400, "Cannot add more than 50 members at once");
    }

    // Find group
    const group = await Group.findById(groupId);

    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    // Check if user is admin
    const isAdmin = group.admins.some(
      admin => admin.toString() === req.user._id.toString()
    );

    if (!isAdmin) {
      throw new ApiError(403, "Only group admins can add members");
    }

    // Validate and filter members
    const validMembers = [];
    const existingMembers = [];
    const invalidUsers = [];

    for (const memberId of members) {
      if (!mongoose.Types.ObjectId.isValid(memberId)) {
        invalidUsers.push(memberId);
        continue;
      }

      // Check if already a member
      if (group.members.some(m => m.toString() === memberId)) {
        existingMembers.push(memberId);
        continue;
      }

      // Verify user exists
      const userExists = await User.findById(memberId).select("_id");
      if (!userExists) {
        invalidUsers.push(memberId);
        continue;
      }

      validMembers.push(memberId);
    }

    if (validMembers.length === 0) {
      throw new ApiError(400, "No valid members to add");
    }

    // Add members
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { members: { $each: validMembers } } },
      { new: true }
    )
      .populate("creator", "fullName username avatar")
      .populate("admins", "fullName username avatar")
      .populate("members", "fullName username avatar");

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          group: updatedGroup,
          added: validMembers.length,
          alreadyMembers: existingMembers.length,
          invalid: invalidUsers.length
        },
        `Successfully added ${validMembers.length} member(s)`
      )
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while adding members");
  }
});

/**
 * Remove member from group
 * DELETE /api/groups/:groupId/members/:memberId
 */
const removeMember = asyncHandler(async (req, res) => {
  try {
    const { groupId, memberId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw new ApiError(400, "Invalid group ID");
    }

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      throw new ApiError(400, "Invalid member ID");
    }

    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    const group = await Group.findById(groupId);

    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    // Check permissions
    const isAdmin = group.admins.some(
      admin => admin.toString() === req.user._id.toString()
    );
    const isSelf = memberId === req.user._id.toString();
    const isCreator = group.creator.toString() === req.user._id.toString();

    // Users can remove themselves or admins can remove others
    if (!isSelf && !isAdmin) {
      throw new ApiError(403, "You don't have permission to remove this member");
    }

    // Cannot remove creator
    if (memberId === group.creator.toString()) {
      throw new ApiError(400, "Cannot remove group creator");
    }

    // Check if member exists in group
    const isMember = group.members.some(m => m.toString() === memberId);

    if (!isMember) {
      throw new ApiError(404, "User is not a member of this group");
    }

    // Remove from members and admins (if applicable)
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      {
        $pull: {
          members: memberId,
          admins: memberId
        }
      },
      { new: true }
    )
      .populate("creator", "fullName username avatar")
      .populate("admins", "fullName username avatar")
      .populate("members", "fullName username avatar");

    return res
      .status(200)
      .json(new ApiResponse(200, updatedGroup, "Member removed successfully"));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while removing member");
  }
});

/**
 * Promote member to admin
 * POST /api/groups/:groupId/admins/:memberId
 */
const promoteToAdmin = asyncHandler(async (req, res) => {
  try {
    const { groupId, memberId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw new ApiError(400, "Invalid group ID");
    }

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      throw new ApiError(400, "Invalid member ID");
    }

    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    const group = await Group.findById(groupId);

    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    // Only creator or existing admins can promote
    const isAdmin = group.admins.some(
      admin => admin.toString() === req.user._id.toString()
    );

    if (!isAdmin) {
      throw new ApiError(403, "Only admins can promote members");
    }

    // Check if user is a member
    const isMember = group.members.some(m => m.toString() === memberId);

    if (!isMember) {
      throw new ApiError(404, "User is not a member of this group");
    }

    // Check if already admin
    const isAlreadyAdmin = group.admins.some(
      admin => admin.toString() === memberId
    );

    if (isAlreadyAdmin) {
      throw new ApiError(400, "User is already an admin");
    }

    // Promote to admin
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { admins: memberId } },
      { new: true }
    )
      .populate("creator", "fullName username avatar")
      .populate("admins", "fullName username avatar")
      .populate("members", "fullName username avatar");

    return res
      .status(200)
      .json(new ApiResponse(200, updatedGroup, "Member promoted to admin successfully"));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while promoting member");
  }
});

/**
 * Demote admin to member
 * DELETE /api/groups/:groupId/admins/:memberId
 */
const demoteAdmin = asyncHandler(async (req, res) => {
  try {
    const { groupId, memberId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw new ApiError(400, "Invalid group ID");
    }

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      throw new ApiError(400, "Invalid member ID");
    }

    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    const group = await Group.findById(groupId);

    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    // Only creator can demote admins
    if (group.creator.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "Only the group creator can demote admins");
    }

    // Cannot demote creator
    if (memberId === group.creator.toString()) {
      throw new ApiError(400, "Cannot demote group creator");
    }

    // Check if user is an admin
    const isAdmin = group.admins.some(admin => admin.toString() === memberId);

    if (!isAdmin) {
      throw new ApiError(400, "User is not an admin");
    }

    // Demote admin
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $pull: { admins: memberId } },
      { new: true }
    )
      .populate("creator", "fullName username avatar")
      .populate("admins", "fullName username avatar")
      .populate("members", "fullName username avatar");

    return res
      .status(200)
      .json(new ApiResponse(200, updatedGroup, "Admin demoted successfully"));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while demoting admin");
  }
});

/**
 * Leave group
 * POST /api/groups/:groupId/leave
 */
const leaveGroup = asyncHandler(async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw new ApiError(400, "Invalid group ID");
    }

    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    const group = await Group.findById(groupId);

    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    // Creator cannot leave (must delete group or transfer ownership)
    if (group.creator.toString() === req.user._id.toString()) {
      throw new ApiError(400, "Group creator cannot leave. Please delete the group or transfer ownership first");
    }

    // Check if user is a member
    const isMember = group.members.some(
      m => m.toString() === req.user._id.toString()
    );

    if (!isMember) {
      throw new ApiError(400, "You are not a member of this group");
    }

    // Remove user from members and admins
    await Group.findByIdAndUpdate(groupId, {
      $pull: {
        members: req.user._id,
        admins: req.user._id
      }
    });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Successfully left the group"));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while leaving group");
  }
});

/**
 * Get group members
 * GET /api/groups/:groupId/members
 */
const getGroupMembers = asyncHandler(async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 20, role } = req.query;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      throw new ApiError(400, "Invalid group ID");
    }

    if (!req.user?._id) {
      throw new ApiError(401, "User not authenticated");
    }

    const group = await Group.findById(groupId);

    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    // Check access for private groups
    const isMember = group.members.some(
      m => m.toString() === req.user._id.toString()
    );

    if (group.isPrivate && !isMember) {
      throw new ApiError(403, "You don't have access to this private group");
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      throw new ApiError(400, "Invalid pagination parameters");
    }

    // Filter members based on role
    let memberIds = [];
    if (role === "admin") {
      memberIds = group.admins;
    } else if (role === "creator") {
      memberIds = [group.creator];
    } else {
      memberIds = group.members;
    }

    const skip = (pageNum - 1) * limitNum;
    const totalMembers = memberIds.length;

    // Paginate member IDs
    const paginatedIds = memberIds.slice(skip, skip + limitNum);

    // Fetch member details
    const members = await User.find({ _id: { $in: paginatedIds } })
      .select("fullName username avatar email createdAt")
      .lean();

    // Add role information
    const membersWithRole = members.map(member => ({
      ...member,
      isCreator: member._id.toString() === group.creator.toString(),
      isAdmin: group.admins.some(admin => admin.toString() === member._id.toString())
    }));

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          members: membersWithRole,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(totalMembers / limitNum),
            totalMembers,
            hasNextPage: pageNum < Math.ceil(totalMembers / limitNum),
            hasPrevPage: pageNum > 1
          }
        },
        "Group members fetched successfully"
      )
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while fetching group members");
  }
});

export {
  createGroup,
  getAllGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addMembers,
  removeMember,
  promoteToAdmin,
  demoteAdmin,
  leaveGroup,
  getGroupMembers
};