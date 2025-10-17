import mongoose, { Schema } from "mongoose";

// Roles are groups of policies.
const RoleSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    enum: ['user', 'admin', 'moderator'],
    default: "user",
    unique: true,
    trim: true,
    minLength: [1, 'Role name must be at least 1 character'],
    maxLength: [64, 'Role name cannot exceed 64 characters'],
    match: [/^[a-zA-Z0-9+=,.@_-]+$/, 'Role name contains invalid characters']
  },
  description: {
    type: String,
    maxLength: [1000, 'Description cannot exceed 1000 characters']
  },
  policies: {  // fix spelling from 'Polices' to 'policies'
    type: Schema.Types.ObjectId,
    ref: "Policies"
  }
}, { timestamps: true });

export const Role = mongoose.model('Role', RoleSchema);
