const multer = require("multer");

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = (file.originalname.split(".").pop() || "").toLowerCase();
  const extOk = ["pdf", "docx", "txt"].includes(ext);
  if (ALLOWED_MIME_TYPES.has(file.mimetype) || extOk) {
    return cb(null, true);
  }
  cb(new Error("Only PDF, DOCX, or TXT resumes are accepted"));
};

const uploadResume = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = { uploadResume };
