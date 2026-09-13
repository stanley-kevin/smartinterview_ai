const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [60, "Name must be under 60 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // never return password by default
    },
    // Set once a resume has been uploaded and parsed (built in a later step)
    profile: {
      targetRole: { type: String, default: null },
      resumeUploaded: { type: Boolean, default: false },
      resumeFileName: { type: String, default: null },
      extractedSkills: { type: [String], default: [] },
      missingSkills: { type: [String], default: [] },
      roleSuitabilityScore: { type: Number, default: null },
    },
    // Which experience the user last chose, so the dashboard can resume it
    lastMode: {
      type: String,
      enum: ["practice", "company", null],
      default: null,
    },
    lastCompany: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Hash the password before saving, only when it has changed
userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to compare a plaintext password against the stored hash
userSchema.methods.matchPassword = async function matchPassword(entered) {
  return bcrypt.compare(entered, this.password);
};

// Strip sensitive/internal fields whenever a user doc is serialized to JSON
userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    profile: this.profile,
    lastMode: this.lastMode,
    lastCompany: this.lastCompany,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
