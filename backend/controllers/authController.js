import bcrypt from "bcryptjs";

import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  verifyRefreshToken
} from "../config/authentication.js";
import { RefreshToken, User } from "../models.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || "refreshToken";
const REFRESH_COOKIE_MAX_AGE = Number(process.env.REFRESH_COOKIE_MAX_AGE || 604800000);

const normalizeUsername = (username) => {
  if (typeof username !== "string") return "";

  return username.trim().toLowerCase();
};

const checkCredentials = (username, password) => {
  if (!username || typeof password !== "string" || password.length === 0) {
    throw new ApiError(400, "Username and password are required");
  }
};

const setRefreshCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    // Cookie maxAge is measured in milliseconds.
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: "/"
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "strict",
    path: "/"
  });
};

const saveRefreshToken = async (user, refreshToken) => {
  const expirationDate = new Date(Date.now() + REFRESH_COOKIE_MAX_AGE);

  // Store only a hash so the original refresh token is not saved in the database.
  await RefreshToken.create({
    tokenHash: hashToken(refreshToken),
    userId: user.id,
    username: user.username,
    role: user.role,
    expiresAt: expirationDate
  });
};

const issueTokens = async (res, user) => {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

  // The refresh token is stored in a protected cookie; the access token goes to the client.
  await saveRefreshToken(user, refreshToken);
  setRefreshCookie(res, refreshToken);

  return {
    accessToken,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  };
};

const registerStudent = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const password = req.body.password;
  checkCredentials(username, password);

  if (password.length < 8) {
    throw new ApiError(400, "Student passwords must be at least 8 characters");
  }

  const usernameIsValid = /^[a-z0-9._-]{3,30}$/.test(username);
  if (!usernameIsValid) {
    throw new ApiError(400, "Username must contain 3-30 letters, numbers, dots, underscores, or hyphens");
  }

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    throw new ApiError(409, "Username is already registered");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const newUser = await User.create({
    username,
    passwordHash,
    role: "student"
  });
  const userDetails = {
    id: newUser.id,
    username,
    role: "student"
  };
  const tokens = await issueTokens(res, userDetails);

  res.status(201).json(new ApiResponse(201, tokens, "Student account created"));
});

const loginUser = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const password = req.body.password;
  checkCredentials(username, password);

  // Admin credentials come from environment variables; student accounts are stored in the database.
  const adminUsername = normalizeUsername(process.env.ADMIN_USERNAME);
  const isAdmin = username === adminUsername && password === process.env.ADMIN_PASSWORD;
  let user;

  if (isAdmin) {
    user = {
      id: "admin",
      username,
      role: "admin"
    };
  } else {
    const student = await User.findOne({ username });
    let passwordMatches = false;

    if (student) {
      passwordMatches = await bcrypt.compare(password, student.passwordHash);
    }

    if (!passwordMatches) {
      throw new ApiError(401, "Invalid username or password");
    }

    user = {
      id: student.id,
      username: student.username,
      role: student.role
    };
  }

  const tokens = await issueTokens(res, user);
  res.status(200).json(new ApiResponse(200, tokens, "Login successful"));
});

const refreshUserSession = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
  if (!refreshToken) {
    throw new ApiError(401, "Refresh token is missing");
  }

  let tokenPayload;
  try {
    tokenPayload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Refresh token is invalid or expired");
  }

  const tokenHash = hashToken(refreshToken);
  const savedToken = await RefreshToken.findOne({ tokenHash });
  const tokenIsInvalid = !savedToken
    || savedToken.revokedAt
    || savedToken.expiresAt < new Date();

  if (tokenIsInvalid) {
    throw new ApiError(401, "Refresh token is invalid or expired");
  }

  // Replace the old refresh token so it cannot be reused.
  savedToken.revokedAt = new Date();
  await savedToken.save();

  const user = {
    id: tokenPayload.sub,
    username: savedToken.username,
    role: savedToken.role
  };
  const tokens = await issueTokens(res, user);

  res.status(200).json(new ApiResponse(200, tokens, "Token refreshed"));
});

const checkAdminStatus = asyncHandler((req, res) => {
  const isAdmin = req.auth.role === "admin";

  res.json({
    isAdmin,
    user: req.auth
  });
});

const logoutUser = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME];

  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await RefreshToken.updateOne(
      { tokenHash },
      { $set: { revokedAt: new Date() } }
    );
  }

  clearRefreshCookie(res);
  res.status(200).json(new ApiResponse(200, null, "Logout successful"));
});

export {
  registerStudent,
  loginUser,
  refreshUserSession,
  checkAdminStatus,
  logoutUser
};
