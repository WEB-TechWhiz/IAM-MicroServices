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
