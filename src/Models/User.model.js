import mongoose,{Schema} from 'mongoose';
import jwt from "jsonwebtoken";
import bcrypt from 'bcryptjs';

// Stores identity info.
const userSchema = new Schema({
  // Basic User Information
   userName: {
    type: String,
    required: [true, 'User name is required'],
    unique: true,
    trim: true,
    minLength: [3, 'User name must be at least 3 characters'],
    maxLength: [64, 'User name cannot exceed 64 characters'],
    match: [/^[a-zA-Z0-9._-]+$/, 'User name can only contain alphanumeric characters, dots, underscores, and hyphens']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minLength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  RefrenceToken:{
  type:String,
  }
}, 
{
    timestamps:true
})

//mongoose hook 
userSchema.pre("save", function(next) {
  if(!this.isModified("password")) return next();
  this.password=bcrypt.hash(this.password,10)
  next()
})

userSchema.methods.isPasswordCorrect=async function(password) {
 return await bcrypt.compare(password,this.password)
}
userSchema.methods.generateAccessToken=async function() {

  return jwt.sign(
    {
      _id: this._id,
      email:this.email,
      userName:this.userName,
    },
    process.env.ACCESS_TOKEN_SECRET,{
      expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}
userSchema.methods.generateRefressToken=async function() {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,{
      expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    }
  )
}
export const User = mongoose.model('User', userSchema);