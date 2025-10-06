 import mongoose,{Schema}from "mongoose";
// import { timeStamp } from "node:console";
// Roles are groups of policies.
const RoleShema= new Schema({
    roleName: {
    type: String,
    required: [true, 'Role name is required'],
    unique: true,
    trim: true,
    minLength: [1, 'Role name must be at least 1 character'],
    maxLength: [64, 'Role name cannot exceed 64 characters'],
    match: [/^[a-zA-Z0-9+=,.@_-]+$/, 'Role name contains invalid characters']
  },
   roleId: {
    type: String,
    unique: true,
   },
   description: {
    type: String,
    maxLength: [1000, 'Description cannot exceed 1000 characters']
  },
},{timeStamp:true})

export const Role=mongoose.Model('Role',RoleShema);
