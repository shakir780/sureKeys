const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6, // Optional: Enforce stronger passwords
    },

    phoneNumber: {
      type: String,
      required: true,
      match: [/^(\+234|0)[789][01]\d{8}$/, "Invalid Nigerian phone number"],
    },

    role: {
      type: String,
      enum: ["tenant", "landlord", "agent"],
      default: "tenant",
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      default: null,
    },

    otpExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

const UserModel = mongoose.model("User", UserSchema);
module.exports = UserModel;
