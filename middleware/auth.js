function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next(); // user is logged in, continue to the route
  }
  req.session.redirectTo = req.originalUrl;
  res.redirect('/login'); // redirect if not logged in
}

module.exports = { isAuthenticated };
