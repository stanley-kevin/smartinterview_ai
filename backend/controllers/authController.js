const asyncHandler = require("express-async-handler");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }

  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(409);
    throw new Error("An account with that email already exists");
  }

  const user = await User.create({ name, email, password });

  generateToken(res, user._id);

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    user: user.toSafeObject(),
  });
});

/**
 * @desc    Authenticate a user and return a session cookie
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }

  const { email, password } = req.body;

  // include password explicitly since the schema excludes it by default
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  generateToken(res, user._id);

  res.status(200).json({
    success: true,
    message: "Logged in successfully",
    user: user.toSafeObject(),
  });
});

/**
 * @desc    Log the current user out by clearing the auth cookie
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logoutUser = asyncHandler(async (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

/**
 * @desc    Get the currently authenticated user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: req.user.toSafeObject() });
});

/**
 * @desc    Record which mode (practice / company) the user picked, so the
 *          dashboard can resume the right experience next time they log in.
 * @route   PATCH /api/auth/mode
 * @access  Private
 */
const setMode = asyncHandler(async (req, res) => {
  const { mode, company, role } = req.body;

  if (!["practice", "company"].includes(mode)) {
    res.status(400);
    throw new Error("Mode must be either 'practice' or 'company'");
  }

  if (mode === "company" && !company) {
    res.status(400);
    throw new Error("A company must be selected for Company-Based Mode");
  }

  req.user.lastMode = mode;
  req.user.lastCompany = mode === "company" ? company : null;
  if (role) req.user.profile.targetRole = role;
  await req.user.save();

  res.status(200).json({ success: true, user: req.user.toSafeObject() });
});

module.exports = { registerUser, loginUser, logoutUser, getMe, setMode };
