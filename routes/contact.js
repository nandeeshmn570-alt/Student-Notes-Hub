const express = require("express");

const { Contact } = require("../models");
const { ApiError } = require("../utils/apiError");
const { ApiResponse } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.post("/contact", asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    throw new ApiError(400, "All fields are mandatory.");
  }

  await Contact.create({ name, email, subject, message });
  res.status(201).json(new ApiResponse(201, null, "Message saved successfully"));
}));

module.exports = router;
