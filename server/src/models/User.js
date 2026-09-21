const mongoose = require('mongoose');

const portfolioItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    url: { type: String, trim: true, default: '' },
    imageUrl: { type: String, trim: true, default: '' },
  },
  { _id: true }
);

const freelancerProfileSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '' },
    skills: [{ type: String, trim: true }],
    hourlyRate: { type: Number, min: 0, default: 0 },
    portfolio: [portfolioItemSchema],
    availability: {
      type: String,
      enum: ['available', 'busy', 'unavailable'],
      default: 'available',
    },
  },
  { _id: false }
);

const clientProfileSchema = new mongoose.Schema(
  {
    companyName: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['freelancer', 'client', 'admin'], required: true },
    isBlocked: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    avatarUrl: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 1000 },
    location: { type: String, default: '', maxlength: 120 },
    freelancerProfile: { type: freelancerProfileSchema, default: () => ({}) },
    clientProfile: { type: clientProfileSchema, default: () => ({}) },
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
