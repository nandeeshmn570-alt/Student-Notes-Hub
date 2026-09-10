const { verifyAccessToken } = require("../config/authentication");

function requireAccessToken(req, res, next) {
  const authorizationHeader = req.headers.authorization || "";
  if (!authorizationHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access token is required" });
  }

  try {
    req.auth = verifyAccessToken(authorizationHeader.slice("Bearer ".length));
    next();
  } catch (error) {
    return res.status(401).json({ message: "Access token is invalid or expired" });
  }
}

function requireAdmin(req, res, next) {
  requireAccessToken(req, res, () => {
    if (req.auth.role !== "admin") {
      return res.status(403).json({ message: "Admin access is required" });
    }

    next();
  });
}

module.exports = { requireAccessToken, requireAdmin };
