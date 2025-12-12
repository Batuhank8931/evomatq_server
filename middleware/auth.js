// Middleware to verify JWT token
const jwt = require("jsonwebtoken");

// Use the same secret as in loginHandler
const SECRET_KEY = process.env.TOKEN_KEY || "my_super_secret_key"; // Use env in production

function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ message: "Authorization header is missing" });
  }

  // Expecting header in format: "Bearer <token>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ message: "Malformed authorization header" });
  }

  const token = parts[1];
  if (!token) {
    return res.status(401).json({ message: "Token is missing" });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      console.error("Token verification error:", err.message);
      // Differentiate error types if needed
      const message =
        err.name === "TokenExpiredError"
          ? "Token has expired"
          : "Invalid token";
      return res.status(401).json({ message });
    }

    // Attach decoded user info to request
    req.user = decoded;
    next();
  });
}

module.exports = verifyToken;

