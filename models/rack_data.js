const fs = require("fs").promises;
const path = require("path");
const { app } = require("electron");


// Determine base path depending on whether the app is packaged
const isPackaged = app.isPackaged;
const basePath = isPackaged
  ? path.join(process.resourcesPath, "data") // packaged app
  : path.join(__dirname, "..", "data");     // dev mode

const filePath = path.join(basePath, "rackdata.json");

// Helper functions
const readData = async () => {
  const fileContent = await fs.readFile(filePath, "utf-8");
  return JSON.parse(fileContent);
};

const writeData = async (data) => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
};

// GET all racks
const getRacks = async (req, res) => {
  try {
    const data = await readData();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Error reading data", error });
  }
};

// POST new rack
const createRack = async (req, res) => {
  try {
    const data = await readData();
    const newEntry = req.body;

    if (!newEntry.id) {
      return res.status(400).json({ message: "ID is required" });
    }

    const exists = data.find((item) => item.id === newEntry.id);
    if (exists) {
      return res.status(400).json({ message: "ID already exists" });
    }

    data.push(newEntry);
    await writeData(data);
    res.status(201).json(newEntry);
  } catch (error) {
    res.status(500).json({ message: "Error saving data", error });
  }
};

// PUT (update) rack by ID
const updateRack = async (req, res) => {
  try {
    const data = await readData();
    const { id } = req.params;
    const updatedEntry = req.body;

    const index = data.findIndex((item) => item.id === id);
    if (index === -1) {
      return res.status(404).json({ message: "Entry not found" });
    }

    data[index] = { ...data[index], ...updatedEntry };
    await writeData(data);
    res.status(200).json(data[index]);
  } catch (error) {
    res.status(500).json({ message: "Error updating data", error });
  }
};

// DELETE rack by ID
const deleteRack = async (req, res) => {
  try {
    const data = await readData();
    const { id } = req.params;

    const index = data.findIndex((item) => item.id === id);
    if (index === -1) {
      return res.status(404).json({ message: "Entry not found" });
    }

    const deleted = data.splice(index, 1);
    await writeData(data);
    res.status(200).json(deleted[0]);
  } catch (error) {
    res.status(500).json({ message: "Error deleting data", error });
  }
};

module.exports = { getRacks, createRack, updateRack, deleteRack };
