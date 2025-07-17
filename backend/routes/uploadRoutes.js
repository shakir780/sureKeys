const express = require("express");
const router = express.Router();
const upload = require("../middleware/cloudinaryStorage");
const { uploadImage } = require("../controllers/uploadController");
const { protect } = require("../middleware/authMiddleware");

router.post("/upload", protect, upload.single("image"), uploadImage);

module.exports = router;
