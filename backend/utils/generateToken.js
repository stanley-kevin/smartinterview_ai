const jwt = require("jsonwebtoken");

/**
 * Signs a JWT for the given user id and attaches it to the response as an
 * httpOnly cookie. Using an httpOnly cookie (rather than localStorage)
 * keeps the token safe from XSS-based theft.
 */
const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  const cookieDays = Number(process.env.COOKIE_EXPIRES_DAYS || 7);

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: cookieDays * 24 * 60 * 60 * 1000,
  });

  return token;
};

module.exports = generateToken;
