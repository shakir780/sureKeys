const express = require("express");
const { createListing } = require("../controllers/listingcontroller");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Anyone logged in (landlord or agent) can create listings
router.post("/", protect, createListing);

module.exports = router;
