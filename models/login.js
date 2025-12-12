const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const appBase = process.pkg
  ? path.dirname(process.execPath)   // EXE'nin bulunduğu klasör
  : path.join(__dirname, "..");      // Normal çalışma

// Base path: exe ile aynı dizinde data klasörü

const basePath = path.join(appBase, "data");


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
