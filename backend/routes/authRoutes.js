const express = require("express");
const router = express.Router();
const authController = require("../controllers/authControllers.js");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/verify-otp", authController.verify);
router.post("/resend-otp", authController.resendOtp);

module.exports = router;
