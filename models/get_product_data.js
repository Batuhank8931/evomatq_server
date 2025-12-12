const fs = require("fs").promises;
const path = require("path");
const { app } = require("electron");

// Determine base path depending on whether the app is packaged
const isPackaged = app.isPackaged;
const basePath = isPackaged
  ? path.join(process.resourcesPath, "data") // packaged app
  : path.join(__dirname, "..", "data");     // dev mode

const filePath = path.join(basePath, "rackdata.json");

// Helper function to read JSON data
const ProductDetail = async () => {
  const fileContent = await fs.readFile(filePath, "utf-8");
  return JSON.parse(fileContent);
};

// POST: Get racks by product_code / description / standard
const getRacksByProductCode = async (req, res) => {
  console.log(req.body);
  try {
    const { product_code, product_description, product_standard } = req.body;

    if (!product_code && !product_description && !product_standard) {
      return res.status(400).json({ message: "At least one search field is required" });
    }

    const data = await ProductDetail(); // JSON array

    // Convert search terms to lowercase once
    const code = product_code?.toString().toLowerCase();
    const desc = product_description?.toString().toLowerCase();
    const std = product_standard?.toString().toLowerCase();

    // Filter by all non-empty fields
    const filtered = data.filter((item) => {
      return (
        (!code || item.product_code?.toLowerCase() === code) &&
        (!desc || item.description?.toLowerCase().includes(desc)) &&
        (!std || item.standard?.toLowerCase().includes(std))
      );
    });

    if (filtered.length === 0) {
      return res.status(202).json({ message: "Product Not Found" });
    }

    res.status(200).json(filtered);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error reading data", error });
  }
};



module.exports = getRacksByProductCode;
