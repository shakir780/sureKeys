const express = require("express");
const {
  createListing,
  getListings,
} = require("../controllers/listingcontroller");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Anyone logged in (landlord or agent) can create listings
router.post("/", protect, createListing);
router.get("/", getListings);

module.exports = router;
