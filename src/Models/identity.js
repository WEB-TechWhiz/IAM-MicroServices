 // models/identityProvider.js
import mongoose from 'mongoose';

const identitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Identity Provider name is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minLength: [1, 'Name must be at least 1 character'],
    maxLength: [128, 'Name cannot exceed 128 characters'],
    match: [/^[a-zA-Z0-9+=,.@_\- ]+$/, 'Name contains invalid characters']
  },
  authorityUrl: {
    type: String,
    required: [true, 'Authority URL is required'],
    trim: true
  },
  clientId: {
    type: String,
    required: [true, 'Client ID is required'],
    trim: true
  },
  clientSecret: {
    type: String,
    required: [true, 'Client Secret is required']
  },
  description: {
    type: String,
    trim: true,
    maxLength: [1000, 'Description cannot exceed 1000 characters']
  },
  provider: {
    type:String
  }
}, { timestamps: true });

const Identity = mongoose.model('Identity', identitySchema);

export default Identity;
