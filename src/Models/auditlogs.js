  import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, // Who performed the action
    ref: "User",
    required: true
  },
  action: {
    type: String, // e.g. LOGIN, CREATE_USER, DELETE_FILE
    required: true
  },
  resource: {
    type: String, // What resource was affected (User, File, Role)
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId, // Optional → specific resource ID
    refPath: "resource", // Dynamic reference (User, File, etc.)
  },
  ipAddress: {
    type: String, // Track IP address for security
  },
  userAgent: {
    type: String, // Browser/device info
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed, // Store old data before update
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed, // Store new data after update
  },
},{timestamps:true});

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
