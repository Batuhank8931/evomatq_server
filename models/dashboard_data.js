const fs = require("fs").promises;
const path = require("path");

const appBase = process.pkg
  ? path.dirname(process.execPath)   // EXE'nin bulunduğu klasör
  : path.join(__dirname, "..");      // Normal çalışma

// Base path: exe ile aynı dizinde data klasörü

const basePath = path.join(appBase, "data");

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
