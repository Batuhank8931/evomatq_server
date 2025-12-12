const fs = require("fs").promises;
const path = require("path");
const { app } = require("electron");

let filePath;

// Helper function to get the correct file path
const getFilePath = () => {
  if (filePath) return filePath; // cache

  const isPackaged = app.isPackaged;
  const basePath = isPackaged
    ? path.join(process.resourcesPath, "data") // packaged app
    : path.join(__dirname, "..", "data");     // dev mode

  filePath = path.join(basePath, "users.json");
  return filePath;
};

// GET: Get all users with user_role = Reviewer
const getReviewers = async (req, res) => {
  try {
    // Read the JSON file
    const data = await fs.readFile(getFilePath(), "utf-8");
    const parsedData = JSON.parse(data);

    // Filter only reviewers
    const reviewers = parsedData.users.filter(
      (user) => user.user_role === "Reviewer"
    );

    res.status(200).json(reviewers);
  } catch (error) {
    console.error("Error reading users file:", error);
    res.status(500).json({ message: "Error retrieving reviewers", error });
  }
};

module.exports = getReviewers;
