function requireAdmin(req, res, next) {
  if (req.session.isAdmin !== true) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  next();
}

module.exports = { requireAdmin };
