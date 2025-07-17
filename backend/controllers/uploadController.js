exports.uploadImage = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    res.status(200).json({
      message: "Image uploaded successfully",
      data: {
        url: file.path,
        public_id: file.filename,
      },
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Image upload failed" });
  }
};
