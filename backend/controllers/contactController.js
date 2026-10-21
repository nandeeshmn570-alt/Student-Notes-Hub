import { Contact } from "../models.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const saveContactMessage = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    throw new ApiError(400, "All fields are mandatory.");
  }

  await Contact.create({ name, email, subject, message });
  res.status(201).json(new ApiResponse(201, null, "Message saved successfully"));
});

export { saveContactMessage };
