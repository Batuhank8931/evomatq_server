const fs = require("fs").promises;
const path = require("path");
const { app } = require("electron");

// Determine base path depending on whether the app is packaged
const isPackaged = app.isPackaged;
const basePath = isPackaged
  ? path.join(process.resourcesPath, "data") // packaged app
  : path.join(__dirname, "..", "data");     // dev mode

const filePath = path.join(basePath, "dashboard.json");

const dashboard_data = async (req, res) => {
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const jsonData = JSON.parse(fileContent);

    res.status(200).json(jsonData);
  } catch (error) {
    res.status(500).json({ message: "Error processing request", error });
  }
};

module.exports = dashboard_data;
