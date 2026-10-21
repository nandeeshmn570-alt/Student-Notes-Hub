import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

import { Note } from "../models.js";
import { deleteFromCloudinary, uploadToCloudinary } from "../config/cloudinary.js";
import { validateSubject } from "../middleware/upload.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const extractNoteText = async (file) => {
  const fileName = (file.originalname || "").toLowerCase();
  const fileContents = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from("");
  let text = "";

  if (fileContents.length === 0) {
    return "";
  }

  try {
    if (fileName.endsWith(".pdf")) {
      const parser = new PDFParse({ data: fileContents });
      try {
        const result = await parser.getText();
        text = result.text || "";
      } finally {
        await parser.destroy();
      }
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
};

const uploadNotes = asyncHandler(async (req, res) => {
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
      const cloudFile = await uploadToCloudinary(file, subject);
      uploadedFiles.push(cloudFile);

      const noteText = await extractNoteText(file);
      await Note.create({
        fileName: cloudFile.public_id,
        originalName: file.originalname,
        noteText: noteText.slice(0, 200000),
        url: cloudFile.secure_url,
        publicId: cloudFile.public_id,
        resourceType: cloudFile.resource_type,
        subject,
        uploadedBy: "admin"
      });
      savedFileIds.push(cloudFile.public_id);
    }
  } catch (error) {
    await Note.deleteMany({ publicId: { $in: savedFileIds } });

    for (const cloudFile of uploadedFiles) {
      try {
        await deleteFromCloudinary(cloudFile.public_id, cloudFile.resource_type);
      } catch (cleanupError) {
        console.warn("Could not remove uploaded file during rollback:", cleanupError.message);
      }
    }

    throw error;
  }

  res.status(201).json(new ApiResponse(201, null, "File uploaded successfully"));
});

const listNotes = asyncHandler(async (req, res) => {
  const subject = req.query.subject;

  if (!subject) {
    return res.json([]);
  }

  try {
    validateSubject(subject);
  } catch {
    return res.json([]);
  }

  const notes = await Note.find({ subject, url: { $exists: true, $ne: "" } })
    .sort({ uploadDate: -1 })
    .select("originalName url publicId resourceType")
    .lean();

  const noteFiles = [];
  for (const note of notes) {
    noteFiles.push({
      id: note.publicId,
      fileName: note.originalName,
      url: note.url,
      resourceType: note.resourceType
    });
  }

  res.json(noteFiles);
});

const deleteNote = asyncHandler(async (req, res) => {
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
});

export {
  uploadNotes,
  listNotes,
  deleteNote
};
