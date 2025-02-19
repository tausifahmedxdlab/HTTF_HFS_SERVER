const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

app.use(express.static("public"));

const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, file.originalname),
});

const upload = multer({ storage });

// Upload a file
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded.");
  res.json({ message: "File uploaded successfully", filename: req.file.filename });
});

// List uploaded files
app.get("/files", (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) return res.status(500).json({ error: "Failed to read files" });
    res.json(files);
  });
});

// Download file
app.get("/download/:filename", (req, res) => {
  const filePath = path.join(__dirname, uploadDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send("File not found.");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
