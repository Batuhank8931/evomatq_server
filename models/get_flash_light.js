const fs = require("fs").promises;
const path = require("path");
const { app } = require("electron");

// Determine base path depending on whether the app is packaged
const isPackaged = app.isPackaged;
const basePath = isPackaged
  ? path.join(process.resourcesPath, "data") // packaged app
  : path.join(__dirname, "..", "data");     // dev mode

const filePath = path.join(basePath, "flashlight.json");

const get_flash_light = async (req, res) => {
  try {
    const { id, light } = req.body;

    if (typeof id === "undefined" || typeof light !== "boolean") {
      return res.status(400).json({ error: "ID must be provided and light must be boolean" });
    }

    // Read current JSON file
    let data = [];
    try {
      const fileContent = await fs.readFile(filePath, "utf-8");
      data = JSON.parse(fileContent);
    } catch (err) {
      // If file doesn't exist or is empty, start with empty array
      data = [];
    }

    if (light) {
      // Add ID if not already in the array
      if (!data.includes(id)) {
        data.push(id);
      }
    } else {
      // Remove ID if exists
      data = data.filter(item => item !== id);
    }

    // Save updated data back to file
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");

    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = get_flash_light;
