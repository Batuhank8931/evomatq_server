const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { app } = require("electron");

// Determine base path depending on whether the app is packaged
const isPackaged = app.isPackaged;
const basePath = isPackaged
  ? path.join(process.resourcesPath, "data") // packaged app
  : path.join(__dirname, "..", "data");     // dev mode

const filePath = path.join(basePath, "users.json");

const SECRET_KEY = "my_super_secret_key"; // ideally use process.env.TOKEN_KEY in production

const loginHandler = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Read users.json
    const data = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(data);

    // Safely access users array
    const users = parsed.users || [];

    // Find matching user by name (case-insensitive)
    const user = users.find(
      (u) => u.user_name.toLowerCase() === username.toLowerCase()
    );

    if (!user) {
      return res.status(401).json({ message: "Invalid username" });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.user_name,
        role: user.user_role,
      },
      SECRET_KEY,
      { expiresIn: "90d" }
    );

    // Send token and user info
    return res.json({
      token,
      user: {
        id: user.user_id,
        username: user.user_name,
        role: user.user_role,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = loginHandler;
