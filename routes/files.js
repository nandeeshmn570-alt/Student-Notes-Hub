const express = require("express");
const fs = require("fs");
const path = require("path");

const { Note } = require("../models");
const { requireAdmin } = require("../middleware/authorization");
const { getSubjectDirectory, upload } = require("../middleware/upload");
const { ApiError } = require("../utils/apiError");
const { ApiResponse } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.post("/upload", requireAdmin, upload.array("file"), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, "No file selected");
  }

  for (const file of req.files) {
    await Note.create({
      fileName: file.filename,
      subject: req.query.subject,
      uploadedBy: "admin"
    });
  }

  res.status(201).json(new ApiResponse(201, null, "File uploaded successfully"));
}));

router.get("/files", asyncHandler(async (req, res) => {
  const { subject } = req.query;

  if (!subject) {
    return res.json([]);
  }

  let subjectDirectory;

  try {
    subjectDirectory = getSubjectDirectory(subject);
  } catch (error) {
    return res.json([]);
  }

  if (!fs.existsSync(subjectDirectory)) {
    return res.json([]);
  }

  try {
    const files = await fs.promises.readdir(subjectDirectory);
    res.json(files);
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.json([]);
    }

    throw error;
  }
}));

router.delete("/delete", requireAdmin, asyncHandler(async (req, res) => {
  const { filename, subject } = req.query;

  if (!filename || !subject) {
    throw new ApiError(400, "Missing data");
  }

  if (path.basename(filename) !== filename) {
    throw new ApiError(400, "Invalid filename");
  }

  let filePath;

  try {
    filePath = path.join(getSubjectDirectory(subject), filename);
  } catch (error) {
    throw new ApiError(400, "Invalid subject");
  }

  const deleteResult = await Note.deleteMany({ fileName: filename, subject });

  try {
    await fs.promises.unlink(filePath);
  } catch (fileError) {
    if (fileError.code !== "ENOENT") {
      throw fileError;
    }
  }

  res.status(200).json(new ApiResponse(
    200,
    { deletedRecords: deleteResult.deletedCount },
    "File and note record deleted successfully"
  ));
}));

module.exports = router;
