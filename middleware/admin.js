function isAdmin(req, res, next) {
  if (req.session.userId && req.user && req.user.isAdmin) {
    return next(); // allow admin access
  }
  res.status(403).send("Access denied. Admins only.");
}

module.exports = { isAdmin };
