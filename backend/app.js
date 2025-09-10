const express = require("express");
const cors = require("cors");
const { mongoose } = require("mongoose");
const authRoutes = require("./routes/authRoutes.js");
const listingRoutes = require("./routes/listingRoutes.js");
const uploadRoutes = require("./routes/uploadRoutes.js");
require("dotenv").config();
const app = express();

app.use(express.json());
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:5050",
  })
);

mongoose.connect(process.env.MONGO_URL);

app.get("/test", (req, res) => {
  res.json("test ok");
});

app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/listing", listingRoutes);
app.use("/api/media", uploadRoutes);

app.listen(4000);
