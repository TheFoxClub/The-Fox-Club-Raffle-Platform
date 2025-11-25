module.exports = function isAdmin(req, res, next) {
  try {
    const user = req.payload;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }
    next();
  } catch (err) {
    return res.status(403).json({ message: "Forbidden" });
  }
};
