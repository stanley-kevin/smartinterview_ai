require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const companyRoutes = require("./routes/companyRoutes");
const roleRoutes = require("./routes/roleRoutes");
const roundRoutes = require("./routes/roundRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const aptitudeRoutes = require("./routes/aptitudeRoutes");
const technicalMcqRoutes = require("./routes/technicalMcqRoutes");
const gdRoutes = require("./routes/gdRoutes");
const codingRoutes = require("./routes/codingRoutes");
const technicalInterviewRoutes = require("./routes/technicalInterviewRoutes");
const systemDesignRoutes = require("./routes/systemDesignRoutes");
const hrRoutes = require("./routes/hrRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

connectDB();

const app = express();

// --- Core middleware -------------------------------------------------
app.use(helmet());
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// --- Routes ------------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "API is healthy" });
});

app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/rounds", roundRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/aptitude", aptitudeRoutes);
app.use("/api/technical-mcq", technicalMcqRoutes);
app.use("/api/rounds/gd", gdRoutes);
app.use("/api/gd", gdRoutes);
app.use("/api/rounds/coding", codingRoutes);
app.use("/api/coding", codingRoutes);
app.use("/api/rounds/technical-interview", technicalInterviewRoutes);
app.use("/api/technical-interview", technicalInterviewRoutes);
app.use("/api/rounds/system-design", systemDesignRoutes);
app.use("/api/system-design", systemDesignRoutes);
app.use("/api/rounds/hr", hrRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/dashboard", dashboardRoutes);

// --- Error handling (must be last) -------------------------------------
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[server] Running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
});
