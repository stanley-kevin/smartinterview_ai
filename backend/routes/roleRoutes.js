const express = require("express");
const ROLES = require("../config/roles");

const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({ success: true, roles: ROLES });
});

module.exports = router;
