// import mongoose from "mongoose";

// const UserSchema = new mongoose.Schema({}, { strict: false });

// const User = mongoose.model("User", UserSchema, "users");

// export default User;

import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },

    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    firstName: {
      type: String,
      required: true,
      trim: true
    },

    middleName: {
      type: String,
      trim: true
    },

    lastName: {
      type: String,
      required: true,
      trim: true
    },

    cellPhoneNumber: {
      type: String,
      trim: true,
      match: /^[0-9]{10,15}$/
    },

    dob: {
      type: Date,
      required: true
    },

    role: {
      type: String,
      enum: ["PATIENT", "DOCTOR", "ADMIN"],
      required: true,
      index: true
    },

    clinic: {
      type: String,
      trim: true
    },

    clinicId: {
      type: String,
      trim: true,
      index: true
    },

    userType: {
      type: String,
      default: ""
    },

    address: {
      type: String,
      default: null
    },

    city: {
      type: String,
      default: null
    },

    state: {
      type: String,
      default: null
    },

    county: {
      type: String,
      default: null
    },

    gender: {
      type: String,
      enum: ["M", "F", "O"],
      required: true
    },

    country: {
      type: String,
      default: null
    },
    passwordHash: {
  type: String,
  required: true,
  select: false
},

refreshTokens: [
  {
    tokenHash: String,
    expiresAt: Date,
    createdAt: { type: Date, default: Date.now }
  }
],

loginAttempts: {
  type: Number,
  default: 0
},

lockUntil: {
  type: Date
}
  },
  {
    collection: "users",
    timestamps: true
  }
);

/**
 * Compound Indexes for Multi-Tenant + Role Filtering
 */
userSchema.index({ clinicId: 1, role: 1 });

export default mongoose.model("Users", userSchema);

