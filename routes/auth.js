const express = require("express");
const { ApiError } = require("../utils/apiError");
const { ApiResponse } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.post("/login", asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const validCredentials = username === process.env.ADMIN_USERNAME
    && password === process.env.ADMIN_PASSWORD;

  if (!validCredentials) {
    throw new ApiError(401, "Invalid credentials");
  }

  req.session.isAdmin = true;
  res.status(200).json(new ApiResponse(200, null, "Login successful"));
}));

router.get("/check-admin", (req, res) => {
  res.json({ isAdmin: req.session.isAdmin === true });
});

router.post("/logout", asyncHandler(async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      req.session.destroy((error) => error ? reject(error) : resolve());
    });
  } catch (error) {
    throw new ApiError(500, "Logout failed");
  }

  res.clearCookie("connect.sid");
  res.status(200).json(new ApiResponse(200, null, "Logout successful"));
}));

module.exports = router;
