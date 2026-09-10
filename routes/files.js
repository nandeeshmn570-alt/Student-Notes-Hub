const express = require("express");

const { Note } = require("../models");
const { deleteFromCloudinary, uploadToCloudinary } = require("../config/cloudinary");
const { requireAdmin } = require("../middleware/authorization");
const { upload, validateSubject } = require("../middleware/upload");
const { ApiError } = require("../utils/apiError");
const { ApiResponse } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.post("/upload", requireAdmin, upload.array("file"), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, "No file selected");
  }

  const subject = req.query.subject;
  try {
    validateSubject(subject);
  } catch (error) {
    throw new ApiError(400, "Invalid subject");
  }

  const uploadedFiles = [];
  const savedNoteIds = [];

  try {
    for (const file of req.files) {
      const cloudinaryFile = await uploadToCloudinary(file, subject);
      uploadedFiles.push(cloudinaryFile);

      await Note.create({
        fileName: cloudinaryFile.public_id,
        originalName: file.originalname,
        url: cloudinaryFile.secure_url,
        publicId: cloudinaryFile.public_id,
        resourceType: cloudinaryFile.resource_type,
        subject,
        uploadedBy: "admin"
      });
      savedNoteIds.push(cloudinaryFile.public_id);
    }
  } catch (error) {
    await Note.deleteMany({ publicId: { $in: savedNoteIds } });

    for (const file of uploadedFiles) {
      await deleteFromCloudinary(file.public_id, file.resource_type).catch(() => {});
    }

    throw error;
  }

  res.status(201).json(new ApiResponse(201, null, "File uploaded successfully"));
}));

router.get("/files", asyncHandler(async (req, res) => {
  const { subject } = req.query;

  if (!subject) {
    return res.json([]);
  }

  try {
    validateSubject(subject);
  } catch (error) {
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
  const { filename, subject } = req.query;

  if (!filename || !subject) {
    throw new ApiError(400, "Missing data");
  }

  try {
    validateSubject(subject);
  } catch (error) {
    throw new ApiError(400, "Invalid subject");
  }

  const note = await Note.findOne({ publicId: filename, subject });
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
