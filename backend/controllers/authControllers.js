const User = require("../models/User.js");
const bcrypt = require("bcrypt");
const sendOTP = require("../utils/sendOtp.js");
const resendOtp = require("../utils/resendOtp.js");
const jwt = require("jsonwebtoken");
exports.register = async (req, res) => {
  const { name, email, password, phoneNumber, role } = req.body;

  // 1. Validate input
  const missingFields = [];
  if (!name) missingFields.push("name");
  if (!email) missingFields.push("email");
  if (!password) missingFields.push("password");
  if (!phoneNumber) missingFields.push("phoneNumber");
  if (!role) missingFields.push("role");

  if (missingFields.length > 0) {
    return res.status(400).json({
      message: "Missing required fields",
      missing: missingFields,
    });
  }

  try {
    // 2. Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    // 3. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Create user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      role,
      otp,
      otpExpiresAt,
    });

    // 6. Send email via Resend
    await sendOTP(email, otp, name);

    // 7. Respond
    const userResponse = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
      role: newUser.role,
    };

    res.status(201).json({
      message: "User registered successfully. Check your email for OTP.",
      user: userResponse,
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Validation failed", details: error.errors });
    }

    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(409).json({ message: "Email is already taken." });
    }

    res.status(500).json({
      message: "Something went wrong. Please try again later.",
    });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  // 1. Validate input
  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required.",
    });
  }

  try {
    // 2. Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // 3. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // 4. Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 5. Send user info (excluding password) + token
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
    };

    res.status(200).json({
      message: "Login successful",
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Something went wrong." });
  }
};

exports.verify = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required." });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.verified) {
      return res.status(400).json({ message: "User is already verified." });
    }

    if (!user.otp || !user.otpExpiresAt) {
      return res
        .status(400)
        .json({ message: "OTP not set. Please register again." });
    }

    const isOtpValid = user.otp === otp;
    const isOtpExpired = user.otpExpiresAt < new Date();

    if (!isOtpValid) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    if (isOtpExpired) {
      return res.status(410).json({ message: "OTP has expired." });
    }

    // Mark user as verified
    user.verified = true;
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    return res.status(200).json({ message: "Account verified successfully." });
  } catch (err) {
    console.error("OTP verification error:", err);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

exports.resendOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Find user using the normalized email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const name = user.name;

    // Generate new OTP and expiration
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Update user record
    user.otp = newOtp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // Send OTP email
    await resendOtp(email, newOtp, name); // Your wrapper mail util

    res.json({ message: "OTP resent successfully" });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};
