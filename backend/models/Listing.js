const mongoose = require("mongoose");

const videoLinkSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      enum: [
        "youtube",
        "tiktok",
        "facebook",
        "instagram",
        "vimeo",
        "twitter",
        "linkedin",
        "other",
      ],
      default: "other",
    },
    title: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);
// Agent invitation details sub-schema
const agentInviteDetailsSchema = new mongoose.Schema(
  {
    commissionRate: {
      type: Number,
      min: 0,
      required: false,
    },
    preferredAgentType: {
      type: String,
      enum: ["any", "local", "experienced", "premium"],
      default: "any",
    },
    additionalRequirements: {
      type: String,
      maxlength: 500,
      required: false,
    },
  },
  { _id: false }
);

const photoSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    isCover: {
      type: Boolean,
      default: false,
    },
    publicId: {
      type: String, // if using Cloudinary or similar
    },
  },
  { _id: false }
);

// Agent bid sub-schema (for storing agent proposals)
const agentBidSchema = new mongoose.Schema(
  {
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    proposedCommission: {
      type: Number,
      required: true,
      min: 0,
    },
    coverLetter: {
      type: String,
      maxlength: 1000,
      required: true,
    },
    experience: {
      type: String,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const listingSchema = new mongoose.Schema(
  {
    creator: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // or "Agent" if agents are separate
        required: true,
      },
      role: {
        type: String,
        enum: ["landlord", "agent"],
        required: true,
      },
    },

    // Basic listing information
    title: { type: String, required: true },
    purpose: { type: String, enum: ["For Rent", "Short Let"], required: true },
    state: { type: String, required: true },
    locality: { type: String, required: true },
    area: { type: String, required: true },
    streetEstateNeighbourhood: { type: String, required: true },
    propertyType: { type: String, required: true },

    // Property details
    bedrooms: { type: Number, min: 0, max: 20 },
    bathrooms: { type: Number, min: 0, max: 20 },
    toilets: { type: Number, min: 0, max: 20 },
    kitchens: { type: Number, min: 0, max: 10 },
    propertySize: { type: Number, min: 1, max: 10000 },
    facilities: [{ type: String }],
    rentAmount: { type: Number, required: true },
    paymentFrequency: {
      type: String,
      enum: ["monthly", "quarterly", "yearly"],
      required: true,
    },
    availability: {
      type: String,
      enum: ["yes", "no"],
      required: true,
    },
    description: { type: String, required: true },

    // Landlord living status
    landlordLivesInCompound: {
      type: Boolean,
      default: false,
      required: true,
    },

    // Media
    images: [photoSchema], // Assuming photoSchema is defined elsewhere
    photoNotes: { type: String },
    videoLinks: [videoLinkSchema],

    // Agent invitation system
    inviteAgentToBid: { type: Boolean, default: false },
    agentInviteDetails: {
      type: agentInviteDetailsSchema,
      required: function () {
        return this.inviteAgentToBid === true;
      },
    },

    // Agent bids/proposals
    agentBids: [agentBidSchema],

    // Selected agent (if any)
    selectedAgent: {
      agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      commission: {
        type: Number,
        min: 0,
      },
      selectedAt: {
        type: Date,
      },
    },

    // Listing status
    status: {
      type: String,
      enum: ["active", "inactive", "rented", "under_negotiation"],
      default: "active",
    },

    // Analytics
    views: {
      type: Number,
      default: 0,
    },

    // Featured listing
    isFeatured: {
      type: Boolean,
      default: false,
    },

    // Expiration date
    expiresAt: {
      type: Date,
      default: function () {
        // Default to 30 days from creation
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for getting active bids count
listingSchema.virtual("activeBidsCount").get(function () {
  return this.agentBids.filter((bid) => bid.status === "pending").length;
});

// Virtual for checking if listing is expired
listingSchema.virtual("isExpired").get(function () {
  return this.expiresAt < new Date();
});

// Index for better query performance
listingSchema.index({ state: 1, locality: 1, area: 1 });
listingSchema.index({ propertyType: 1 });
listingSchema.index({ rentAmount: 1 });
listingSchema.index({ "creator.id": 1 });
listingSchema.index({ status: 1 });
listingSchema.index({ inviteAgentToBid: 1 });
listingSchema.index({ landlordLivesInCompound: 1 }); // New index
listingSchema.index({ createdAt: -1 });

// Pre-save middleware to handle agent invitation logic
listingSchema.pre("save", function (next) {
  // If inviteAgentToBid is false, remove agentInviteDetails
  if (!this.inviteAgentToBid) {
    this.agentInviteDetails = undefined;
  }

  // Only landlords can invite agents
  if (this.creator.role !== "landlord") {
    this.inviteAgentToBid = false;
    this.agentInviteDetails = undefined;
  }

  next();
});

// Method to add agent bid
listingSchema.methods.addAgentBid = function (
  agentId,
  proposedCommission,
  coverLetter,
  experience
) {
  // Check if agent already has a bid
  const existingBid = this.agentBids.find(
    (bid) => bid.agentId.toString() === agentId.toString()
  );

  if (existingBid) {
    throw new Error("Agent has already submitted a bid for this listing");
  }

  this.agentBids.push({
    agentId,
    proposedCommission,
    coverLetter,
    experience,
  });

  return this.save();
};

// Method to accept agent bid
listingSchema.methods.acceptAgentBid = function (bidId) {
  const bid = this.agentBids.id(bidId);
  if (!bid) {
    throw new Error("Bid not found");
  }

  // Set all other bids to rejected
  this.agentBids.forEach((b) => {
    if (b._id.toString() !== bidId.toString()) {
      b.status = "rejected";
    } else {
      b.status = "accepted";
    }
  });

  // Set selected agent
  this.selectedAgent = {
    agentId: bid.agentId,
    commission: bid.proposedCommission,
    selectedAt: new Date(),
  };

  // Close bidding
  this.inviteAgentToBid = false;

  return this.save();
};

// Method to reject agent bid
listingSchema.methods.rejectAgentBid = function (bidId) {
  const bid = this.agentBids.id(bidId);
  if (!bid) {
    throw new Error("Bid not found");
  }

  bid.status = "rejected";
  return this.save();
};

module.exports = mongoose.model("Listing", listingSchema);
