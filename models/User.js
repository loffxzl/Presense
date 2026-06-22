import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  fullName: { type: String },
  phone: { type: String },
  line1: { type: String },
  line2: { type: String },
  city: { type: String },
  state: { type: String },
  postalCode: { type: String },
  country: { type: String },
  isDefault: { type: Boolean, default: false }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'blocked'], default: 'active' },
  avatarUrl: { type: String },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationExpiry: { type: Date },
  addresses: [addressSchema]
}, { timestamps: true });

export default mongoose.model('User', userSchema);