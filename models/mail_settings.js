const fs = require("fs").promises;
const path = require("path");
const { app } = require("electron");

// Determine base path depending on whether the app is packaged
const isPackaged = app.isPackaged;
const basePath = isPackaged
  ? path.join(process.resourcesPath, "data") // packaged app
  : path.join(__dirname, "..", "data");     // dev mode

const filePath = path.join(basePath, "mailsettings.json");

const getMailSettings = async (req, res) => {
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const jsonData = JSON.parse(fileContent);
    res.status(200).json(jsonData);
  } catch (error) {
    res.status(500).json({ message: "Error reading mail settings", error });
  }
};

const updateMailSettings = async (req, res) => {
  try {
    const newSettings = req.body;

    if (!Array.isArray(newSettings)) {
      return res.status(400).json({ message: "Invalid data format, expected an array" });
    }

    await fs.writeFile(filePath, JSON.stringify(newSettings, null, 2), "utf-8");

    res.status(200).json({ message: "Mail settings updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error updating mail settings", error });
  }
};

module.exports = { getMailSettings, updateMailSettings };
