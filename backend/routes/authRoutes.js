const express = require("express");
const rateLimit = require("express-rate-limit");
const { body } = require("express-validator");
const {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  setMode,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Brute-force protection — only on the endpoints that accept credentials.
// Scoped here (not on the whole /api/auth prefix) so routine calls like
// GET /me on every page load don't eat into the same request budget and
// lock genuine users out of login.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: "Too many attempts. Please try again in a few minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Enter a valid email address"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/\d/)
    .withMessage("Password must contain at least one number"),
];

const loginValidation = [
  body("email").isEmail().withMessage("Enter a valid email address"),
  body("password").notEmpty().withMessage("Password is required"),
];

router.post("/register", authLimiter, registerValidation, registerUser);
router.post("/login", authLimiter, loginValidation, loginUser);
router.post("/logout", protect, logoutUser);
router.get("/me", protect, getMe);
router.patch("/mode", protect, setMode);

module.exports = router;
