const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = 80;

app.use(express.static("public"));

const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, file.originalname),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".bin", ".rbl"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only .bin and .rbl files are allowed"));
    }
  },
});

// Generate MD5 checksum
const generateMD5 = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("md5");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
};

// Upload a file
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded.");
  const md5 = await generateMD5(req.file.path);
  fs.writeFileSync(`${req.file.path}.md5`, md5); // Save checksum file
  res.json({ message: "File uploaded successfully", filename: req.file.filename, md5 });
});

// List uploaded files
app.get("/files", (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) return res.status(500).json({ error: "Failed to read files" });
    res.json(files.filter((f) => !f.endsWith(".md5"))); // Exclude MD5 files
  });
});

// Download file
app.get("/download/:filename", async (req, res) => {
  const filePath = path.join(__dirname, uploadDir, req.params.filename);
  const md5Path = filePath + ".md5";

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found.");
  }

  if (fs.existsSync(md5Path)) {
    const uploadedMD5 = fs.readFileSync(md5Path, "utf8");
    const currentMD5 = await generateMD5(filePath);
    if (uploadedMD5 !== currentMD5) {
      return res.status(500).send("File integrity check failed. Possible corruption detected.");
    }
  }

res.set("Cache-Control", "public, max-age=3600");

  res.sendFile(filePath);
});


// Delete file
app.delete("/delete/:filename", (req, res) => {
  const filePath = path.join(__dirname, uploadDir, req.params.filename);
  const md5Path = filePath + ".md5";
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  if (fs.existsSync(md5Path)) fs.unlinkSync(md5Path);
  res.json({ message: "File deleted successfully" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
