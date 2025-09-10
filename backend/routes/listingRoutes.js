const express = require("express");
const {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
} = require("../controllers/listingcontroller");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Anyone logged in (landlord or agent) can create listings
router.post("/", protect, createListing);
router.get("/", getListings);
router.put("/:id", protect, updateListing);
router.delete("/:id", protect, deleteListing);
router.get("/:id", getListingById);

module.exports = router;
