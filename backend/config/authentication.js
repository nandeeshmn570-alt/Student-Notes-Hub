import crypto from "node:crypto";
import jwt from "jsonwebtoken";

const ACCESS_TOKEN_DURATION = process.env.ACCESS_TOKEN_DURATION || "15m";
const REFRESH_TOKEN_DURATION = process.env.REFRESH_TOKEN_DURATION || "7d";
const REQUIRED_AUTH_SECRETS = ["ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"];

const validateAuthenticationConfig = () => {
  const missingSecrets = REQUIRED_AUTH_SECRETS.filter((name) => !process.env[name]);

  if (missingSecrets.length > 0) {
    throw new Error(`Missing authentication environment variables: ${missingSecrets.join(", ")}`);
  }
};

const getRequiredSecret = (name) => {
  if (!process.env[name]) {
    throw new Error(`${name} is not configured`);
  }

  return process.env[name];
};

const createAccessToken = (user) => {
  return jwt.sign(
    { username: user.username, role: user.role },
    getRequiredSecret("ACCESS_TOKEN_SECRET"),
    { subject: user.id, expiresIn: ACCESS_TOKEN_DURATION }
  );
};

const createRefreshToken = (user) => {
  return jwt.sign(
    { username: user.username, role: user.role },
    getRequiredSecret("REFRESH_TOKEN_SECRET"),
    { subject: user.id, expiresIn: REFRESH_TOKEN_DURATION }
  );
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, getRequiredSecret("ACCESS_TOKEN_SECRET"));
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, getRequiredSecret("REFRESH_TOKEN_SECRET"));
};

export {
  createAccessToken,
  createRefreshToken,
  hashToken,
  validateAuthenticationConfig,
  verifyAccessToken,
  verifyRefreshToken
};
