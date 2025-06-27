const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserOTPVerificationSchma = new Schema({
  userId: String,
  otp: String,
  createdAt: Date,
  expiresAt: Date,
});

const UserOTPVerification = mongoose.model(
  "UserOTPVerification",
  UserOTPVerificationSchma
);

module.exports = UserOTPVerification;
