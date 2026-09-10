const bcrypt = require("bcryptjs");
const express = require("express");

const {
  createAccessToken,
  createRefreshToken,
  hashToken,
  verifyRefreshToken
} = require("../config/authentication");
const { RefreshToken, User } = require("../models");
const { requireAccessToken } = require("../middleware/authorization");
const { ApiError } = require("../utils/apiError");
const { ApiResponse } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function normalizeUsername(username) {
  return typeof username === "string" ? username.trim().toLowerCase() : "";
}

function validateCredentials(username, password) {
  if (!username || typeof password !== "string" || password.length === 0) {
    throw new ApiError(400, "Username and password are required");
  }
}

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: "/"
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, { httpOnly: true, sameSite: "strict", path: "/" });
}

async function saveRefreshToken(user, refreshToken) {
  await RefreshToken.create({
    tokenHash: hashToken(refreshToken),
    userId: user.id,
    username: user.username,
    role: user.role,
    expiresAt: new Date(Date.now() + REFRESH_COOKIE_MAX_AGE)
  });
}

async function issueTokens(res, user) {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);
  await saveRefreshToken(user, refreshToken);
  setRefreshCookie(res, refreshToken);

  return { accessToken, user: { id: user.id, username: user.username, role: user.role } };
}

router.post("/register", asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const { password } = req.body;
  validateCredentials(username, password);

  if (password.length < 8) {
    throw new ApiError(400, "Student passwords must be at least 8 characters");
  }

  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    throw new ApiError(400, "Username must contain 3-30 letters, numbers, dots, underscores, or hyphens");
  }

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    throw new ApiError(409, "Username is already registered");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ username, passwordHash, role: "student" });
  const tokens = await issueTokens(res, { id: user.id, username, role: "student" });

  res.status(201).json(new ApiResponse(201, tokens, "Student account created"));
}));

router.post("/login", asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const { password } = req.body;
  validateCredentials(username, password);

  const isAdmin = username === normalizeUsername(process.env.ADMIN_USERNAME)
    && password === process.env.ADMIN_PASSWORD;
  let user;

  if (isAdmin) {
    user = { id: "admin", username, role: "admin" };
  } else {
    const student = await User.findOne({ username });
    const passwordMatches = student && await bcrypt.compare(password, student.passwordHash);

    if (!passwordMatches) {
      throw new ApiError(401, "Invalid username or password");
    }

    user = { id: student.id, username: student.username, role: student.role };
  }

  const tokens = await issueTokens(res, user);
  res.status(200).json(new ApiResponse(200, tokens, "Login successful"));
}));

router.post("/refresh", asyncHandler(async (req, res) => {
  const oldRefreshToken = req.cookies[REFRESH_COOKIE_NAME];
  if (!oldRefreshToken) {
    throw new ApiError(401, "Refresh token is missing");
  }

  let tokenPayload;
  try {
    tokenPayload = verifyRefreshToken(oldRefreshToken);
  } catch (error) {
    throw new ApiError(401, "Refresh token is invalid or expired");
  }

  const storedToken = await RefreshToken.findOne({ tokenHash: hashToken(oldRefreshToken) });
  if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
    throw new ApiError(401, "Refresh token is invalid or expired");
  }

  storedToken.revokedAt = new Date();
  await storedToken.save();

  const user = {
    id: tokenPayload.sub,
    username: storedToken.username,
    role: storedToken.role
  };
  const tokens = await issueTokens(res, user);
  res.status(200).json(new ApiResponse(200, tokens, "Token refreshed"));
}));

router.get("/check-admin", requireAccessToken, (req, res) => {
  res.json({ isAdmin: req.auth.role === "admin", user: req.auth });
});

router.post("/logout", asyncHandler(async (req, res) => {
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
  if (refreshToken) {
    await RefreshToken.updateOne(
      { tokenHash: hashToken(refreshToken) },
      { $set: { revokedAt: new Date() } }
    );
  }

  clearRefreshCookie(res);
  res.status(200).json(new ApiResponse(200, null, "Logout successful"));
}));

module.exports = router;
