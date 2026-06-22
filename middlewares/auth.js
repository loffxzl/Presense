export const isAdminAuthenticated = (req, res, next) => {
  if (req.session && req.session.admin) return next();
  res.redirect('/auth/login');
};

export const isUserAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) return next();
  res.redirect('/auth/login');
};