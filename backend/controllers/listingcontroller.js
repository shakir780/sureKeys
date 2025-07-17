const Listing = require("../models/Listing.js");
const User = require("../models/User.js"); // Assuming you have a User model

// @desc    Create new listing (landlord or agent)
// @route   POST /api/listings
// @access  Private
exports.createListing = async (req, res) => {
  try {
    const {
      title,
      purpose,
      state,
      locality,
      area,
      streetEstateNeighbourhood,
      propertyType,
      bedrooms,
      bathrooms,
      toilets,
      kitchens,
      propertySize,
      facilities,
      rentAmount,
      paymentFrequency,
      availability,
      description,
      images,
      photoNotes,
      inviteAgentToBid,
      agentInviteDetails,
    } = req.body;

    const { id: userId, role } = req.user; // assume user object = { id, role }

    // Parse rentAmount to handle formatted currency
    const parsedRentAmount =
      typeof rentAmount === "string"
        ? parseFloat(rentAmount.replace(/[^\d.]/g, ""))
        : Number(rentAmount);

    // Basic listing data
    const listingData = {
      creator: {
        id: userId,
        role,
      },
      title,
      purpose,
      state,
      locality,
      area,
      streetEstateNeighbourhood,
      propertyType,
      bedrooms,
      bathrooms,
      toilets,
      kitchens,
      propertySize,
      facilities,
      rentAmount: parsedRentAmount,
      paymentFrequency,
      availability,
      description,
      images,
      photoNotes,
    };

    // Only landlords can set `inviteAgentToBid` and related details
    if (role === "landlord") {
      listingData.inviteAgentToBid = inviteAgentToBid ?? false;

      // Add agent invitation details if provided
      if (inviteAgentToBid && agentInviteDetails) {
        const processedAgentDetails = {
          preferredAgentType: agentInviteDetails.preferredAgentType || "any",
          additionalRequirements:
            agentInviteDetails.additionalRequirements || "",
        };

        // Parse commission rate if provided
        if (agentInviteDetails.commissionRate) {
          const parsedCommission =
            typeof agentInviteDetails.commissionRate === "string"
              ? parseFloat(
                  agentInviteDetails.commissionRate.replace(/[^\d.]/g, "")
                )
              : Number(agentInviteDetails.commissionRate);

          if (parsedCommission > 0) {
            processedAgentDetails.commissionRate = parsedCommission;
          }
        }

        listingData.agentInviteDetails = processedAgentDetails;
      }
    }

    const listing = await Listing.create(listingData);

    res.status(201).json({
      message: "Listing created successfully",
      data: listing,
    });
  } catch (error) {
    console.error("Error creating listing:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }

    res.status(500).json({ message: "Failed to create listing" });
  }
};

// @desc    Get listings with optional filters
// @route   GET /api/listings
// @access  Public
exports.getListings = async (req, res) => {
  try {
    const {
      state,
      locality,
      area,
      propertyType,
      minRent,
      maxRent,
      bedrooms,
      bathrooms,
      inviteAgentToBid,
      page = 1,
      limit = 10,
      sort = "-createdAt",
    } = req.query;

    // Build filter object
    const filter = { status: "active" };

    if (state) filter.state = new RegExp(state, "i");
    if (locality) filter.locality = new RegExp(locality, "i");
    if (area) filter.area = new RegExp(area, "i");
    if (propertyType) filter.propertyType = propertyType;
    if (bedrooms) filter.bedrooms = Number(bedrooms);
    if (bathrooms) filter.bathrooms = Number(bathrooms);
    if (inviteAgentToBid) filter.inviteAgentToBid = inviteAgentToBid === "true";

    // Price range filter
    if (minRent || maxRent) {
      filter.rentAmount = {};
      if (minRent) filter.rentAmount.$gte = Number(minRent);
      if (maxRent) filter.rentAmount.$lte = Number(maxRent);
    }

    const skip = (page - 1) * limit;

    const listings = await Listing.find(filter)
      .populate("creator.id", "name email phone")
      .populate("selectedAgent.agentId", "name email phone")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await Listing.countDocuments(filter);

    res.status(200).json({
      message: "Listings retrieved successfully",
      data: {
        listings,
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    console.error("Error getting listings:", error);
    res.status(500).json({ message: "Failed to get listings" });
  }
};

// @desc    Submit agent bid for a listing
// @route   POST /api/listings/:id/bids
// @access  Private (Agent only)
exports.submitAgentBid = async (req, res) => {
  try {
    const { id: listingId } = req.params;
    const { proposedCommission, coverLetter, experience } = req.body;
    const { id: agentId, role } = req.user;

    // Check if user is an agent
    if (role !== "agent") {
      return res.status(403).json({ message: "Only agents can submit bids" });
    }

    // Find the listing
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Check if listing accepts agent bids
    if (!listing.inviteAgentToBid) {
      return res
        .status(400)
        .json({ message: "This listing is not accepting agent bids" });
    }

    // Check if listing is active
    if (listing.status !== "active") {
      return res.status(400).json({ message: "This listing is not active" });
    }

    // Parse proposed commission
    const parsedCommission =
      typeof proposedCommission === "string"
        ? parseFloat(proposedCommission.replace(/[^\d.]/g, ""))
        : Number(proposedCommission);

    // Add the bid
    await listing.addAgentBid(
      agentId,
      parsedCommission,
      coverLetter,
      experience
    );

    res.status(201).json({
      message: "Bid submitted successfully",
      data: listing,
    });
  } catch (error) {
    console.error("Error submitting bid:", error);

    if (
      error.message === "Agent has already submitted a bid for this listing"
    ) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Failed to submit bid" });
  }
};

// @desc    Accept agent bid
// @route   PUT /api/listings/:id/bids/:bidId/accept
// @access  Private (Landlord only)
exports.acceptAgentBid = async (req, res) => {
  try {
    const { id: listingId, bidId } = req.params;
    const { id: userId, role } = req.user;

    // Check if user is a landlord
    if (role !== "landlord") {
      return res
        .status(403)
        .json({ message: "Only landlords can accept bids" });
    }

    // Find the listing
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Check if user owns the listing
    if (listing.creator.id.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "You can only accept bids on your own listings" });
    }

    // Accept the bid
    await listing.acceptAgentBid(bidId);

    res.status(200).json({
      message: "Bid accepted successfully",
      data: listing,
    });
  } catch (error) {
    console.error("Error accepting bid:", error);

    if (error.message === "Bid not found") {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: "Failed to accept bid" });
  }
};

// @desc    Reject agent bid
// @route   PUT /api/listings/:id/bids/:bidId/reject
// @access  Private (Landlord only)
exports.rejectAgentBid = async (req, res) => {
  try {
    const { id: listingId, bidId } = req.params;
    const { id: userId, role } = req.user;

    // Check if user is a landlord
    if (role !== "landlord") {
      return res
        .status(403)
        .json({ message: "Only landlords can reject bids" });
    }

    // Find the listing
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Check if user owns the listing
    if (listing.creator.id.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "You can only reject bids on your own listings" });
    }

    // Reject the bid
    await listing.rejectAgentBid(bidId);

    res.status(200).json({
      message: "Bid rejected successfully",
      data: listing,
    });
  } catch (error) {
    console.error("Error rejecting bid:", error);

    if (error.message === "Bid not found") {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: "Failed to reject bid" });
  }
};

// @desc    Get agent bids for a listing
// @route   GET /api/listings/:id/bids
// @access  Private (Landlord only)
exports.getListingBids = async (req, res) => {
  try {
    const { id: listingId } = req.params;
    const { id: userId, role } = req.user;

    // Check if user is a landlord
    if (role !== "landlord") {
      return res.status(403).json({ message: "Only landlords can view bids" });
    }

    // Find the listing
    const listing = await Listing.findById(listingId)
      .populate("agentBids.agentId", "name email phone profilePicture")
      .populate("creator.id", "name email");

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Check if user owns the listing
    if (listing.creator.id.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "You can only view bids on your own listings" });
    }

    res.status(200).json({
      message: "Bids retrieved successfully",
      data: {
        listing: {
          id: listing._id,
          title: listing.title,
          inviteAgentToBid: listing.inviteAgentToBid,
          agentInviteDetails: listing.agentInviteDetails,
        },
        bids: listing.agentBids,
      },
    });
  } catch (error) {
    console.error("Error getting listing bids:", error);
    res.status(500).json({ message: "Failed to get listing bids" });
  }
};

// @desc    Update listing
// @route   PUT /api/listings/:id
// @access  Private
exports.updateListing = async (req, res) => {
  try {
    const { id: listingId } = req.params;
    const { id: userId, role } = req.user;
    const updateData = req.body;

    // Find the listing
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Check if user owns the listing
    if (listing.creator.id.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "You can only update your own listings" });
    }

    // Parse rent amount if provided
    if (updateData.rentAmount) {
      updateData.rentAmount =
        typeof updateData.rentAmount === "string"
          ? parseFloat(updateData.rentAmount.replace(/[^\d.]/g, ""))
          : Number(updateData.rentAmount);
    }

    // Handle agent invitation details
    if (updateData.agentInviteDetails) {
      const processedAgentDetails = {
        preferredAgentType:
          updateData.agentInviteDetails.preferredAgentType ||
          listing.agentInviteDetails?.preferredAgentType ||
          "any",
        additionalRequirements:
          updateData.agentInviteDetails.additionalRequirements || "",
      };

      // Parse commission rate if provided
      if (updateData.agentInviteDetails.commissionRate) {
        const parsedCommission =
          typeof updateData.agentInviteDetails.commissionRate === "string"
            ? parseFloat(
                updateData.agentInviteDetails.commissionRate.replace(
                  /[^\d.]/g,
                  ""
                )
              )
            : Number(updateData.agentInviteDetails.commissionRate);

        if (parsedCommission > 0) {
          processedAgentDetails.commissionRate = parsedCommission;
        }
      }

      updateData.agentInviteDetails = processedAgentDetails;
    }

    // Update the listing
    const updatedListing = await Listing.findByIdAndUpdate(
      listingId,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Listing updated successfully",
      data: updatedListing,
    });
  } catch (error) {
    console.error("Error updating listing:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }

    res.status(500).json({ message: "Failed to update listing" });
  }
};

// @desc    Delete listing
// @route   DELETE /api/listings/:id
// @access  Private
exports.deleteListing = async (req, res) => {
  try {
    const { id: listingId } = req.params;
    const { id: userId } = req.user;

    // Find the listing
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Check if user owns the listing
    if (listing.creator.id.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "You can only delete your own listings" });
    }

    await Listing.findByIdAndDelete(listingId);

    res.status(200).json({
      message: "Listing deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting listing:", error);
    res.status(500).json({ message: "Failed to delete listing" });
  }
};
