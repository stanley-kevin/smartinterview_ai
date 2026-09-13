const mongoose = require("mongoose");

/**
 * Establishes a connection to MongoDB using the URI in the environment.
 * Fails fast and loudly if the connection cannot be made, since nothing
 * in the API is useful without a database.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[db] MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[db] Connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
