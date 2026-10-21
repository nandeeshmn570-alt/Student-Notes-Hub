const express = require("express");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

const { Note } = require("../models");
const { deleteFromCloudinary, uploadToCloudinary } = require("../config/cloudinary");
const { requireAdmin } = require("../middleware/authorization");
const { upload, validateSubject } = require("../middleware/upload");
const { ApiError } = require("../utils/apiError");
const { ApiResponse } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

async function extractNoteText(file) {
  const fileName = (file.originalname || "").toLowerCase();
  const fileContents = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from("");
  let text = "";

  if (fileContents.length === 0) {
    return "";
  }

  try {
    if (fileName.endsWith(".pdf")) {
      const result = await pdfParse(fileContents);
      text = result.text || "";
    } else if (fileName.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer: fileContents });
      text = result.value || "";
    } else if (
      fileName.endsWith(".txt")
      || fileName.endsWith(".md")
      || fileName.endsWith(".csv")
      || fileName.endsWith(".json")
    ) {
      text = fileContents.toString("utf8");
    }
  } catch (error) {
    console.warn("Note text extraction failed for", file.originalname, error.message);
  }

  return text.replace(/\s+/g, " ").trim();
}

router.post("/upload", requireAdmin, upload.array("file"), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, "No file selected");
  }

  const subject = req.query.subject;
  try {
    validateSubject(subject);
  } catch {
    throw new ApiError(400, "Invalid subject");
  }

  const uploadedFiles = [];
  const savedFileIds = [];

  try {
    for (const file of req.files) {
      const uploadedFile = await uploadToCloudinary(file, subject);
      uploadedFiles.push(uploadedFile);

      const noteText = await extractNoteText(file);

      await Note.create({
        fileName: uploadedFile.public_id,
        originalName: file.originalname,
        noteText: noteText.slice(0, 200000),
        url: uploadedFile.secure_url,
        publicId: uploadedFile.public_id,
        resourceType: uploadedFile.resource_type,
        subject,
        uploadedBy: "admin"
      });
      savedFileIds.push(uploadedFile.public_id);
    }
  } catch (error) {
    await Note.deleteMany({ publicId: { $in: savedFileIds } });

    for (const uploadedFile of uploadedFiles) {
      try {
        await deleteFromCloudinary(uploadedFile.public_id, uploadedFile.resource_type);
      } catch (cleanupError) {
        console.warn("Could not remove uploaded file during rollback:", cleanupError.message);
      }
    }

    throw error;
  }

  res.status(201).json(new ApiResponse(201, null, "File uploaded successfully"));
}));

router.get("/files", asyncHandler(async (req, res) => {
  const subject = req.query.subject;

  if (!subject) {
    return res.json([]);
  }

  try {
    validateSubject(subject);
  } catch {
    return res.json([]);
  }

  const files = await Note.find({ subject, url: { $exists: true, $ne: "" } })
    .sort({ uploadDate: -1 })
    .select("originalName url publicId resourceType")
    .lean();

  res.json(files.map((file) => ({
    id: file.publicId,
    fileName: file.originalName,
    url: file.url,
    resourceType: file.resourceType
  })));
}));

router.delete("/delete", requireAdmin, asyncHandler(async (req, res) => {
  const fileId = req.query.filename;
  const subject = req.query.subject;

  if (!fileId || !subject) {
    throw new ApiError(400, "Missing data");
  }

  try {
    validateSubject(subject);
  } catch {
    throw new ApiError(400, "Invalid subject");
  }

  const note = await Note.findOne({ publicId: fileId, subject });
  if (!note) {
    throw new ApiError(404, "File not found");
  }

  await deleteFromCloudinary(note.publicId, note.resourceType);
  await Note.deleteOne({ _id: note._id });

  res.status(200).json(new ApiResponse(
    200,
    { deletedRecords: 1 },
    "File and note record deleted successfully"
  ));
}));

module.exports = router;
