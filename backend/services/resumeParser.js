const mammoth = require("mammoth");

/**
 * Extracts plain text from an uploaded resume file buffer. Supports the
 * three formats candidates actually upload: PDF, DOCX, and plain text.
 * Throws a descriptive error for anything else so the controller can
 * return a clean 400 instead of a stack trace.
 */
async function extractResumeText(buffer, mimetype, originalName) {
  const ext = (originalName.split(".").pop() || "").toLowerCase();

  if (mimetype === "application/pdf" || ext === "pdf") {
    // Required lazily: pdf-parse touches the filesystem at import time in
    // some versions when run outside its own package directory, so we
    // isolate that risk to the moment it's actually needed.
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    return data.text || "";
  }

  if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }

  if (mimetype === "text/plain" || ext === "txt") {
    return buffer.toString("utf-8");
  }

  const err = new Error(
    "Unsupported resume format. Please upload a PDF, DOCX, or TXT file."
  );
  err.statusCode = 400;
  throw err;
}

module.exports = { extractResumeText };
