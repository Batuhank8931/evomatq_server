const fs = require("fs").promises;
const path = require("path");

const appBase = process.pkg
    ? path.dirname(process.execPath)
    : path.join(__dirname, "..");

const basePath = path.join(appBase, "data");
const productdata = path.join(basePath, "productdata.json");
const rackdesignPath = path.join(basePath, "rackdesign.json");

const getallrfids = async (req, res) => {
  try {
    const fileData = await fs.readFile(productdata, "utf-8");
    const products = JSON.parse(fileData);

    // Sadece RFID'leri al
    const rfids = products.map(p => p.rfid);

    return res.status(200).json(rfids);
  } catch (error) {
    console.error("Error reading productdata:", error);
    return res.status(500).json({ error: "Failed to read product data" });
  }
};

const getproductbyrfid = async (req, res) => {
  try {
    const { rfid } = req.body;  // body üzerinden al

    const fileData = await fs.readFile(productdata, "utf-8");
    const products = JSON.parse(fileData);

    const product = products.find(p => p.rfid === rfid);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.status(200).json(product);
  } catch (error) {
    console.error("Error reading productdata:", error);
    return res.status(500).json({ error: "Failed to read product data" });
  }
};


const saveProductAndRack = async (req, res) => {
  try {
    const {
      rfid,
      product_code,
      description,
      standard,
      unit_weight_gram,
      quantity,
      total_weight_kg
    } = req.body;

    if (!rfid) {
      return res.status(400).json({ error: "RFID is required" });
    }

    /* =========================
       1️⃣ PRODUCTDATA
    ========================= */

    const productFile = await fs.readFile(productdataPath, "utf-8");
    const products = JSON.parse(productFile);

    let product = products.find(p => p.rfid === rfid);

    if (!product) {
      const newId =
        products.length > 0
          ? Math.max(...products.map(p => Number(p.id))) + 1
          : 1;

      product = {
        id: String(newId),
        product_code,
        description,
        standard,
        unit_weight_gram,
        rfid
      };

      products.push(product);

      await fs.writeFile(
        productdataPath,
        JSON.stringify(products, null, 2),
        "utf-8"
      );
    }

    /* =========================
       2️⃣ RACKDESIGN
    ========================= */

    const rackFile = await fs.readFile(rackdesignPath, "utf-8");
    const racks = JSON.parse(rackFile);

    let rackUpdated = false;

    for (const rack of racks) {
      for (const slot of rack.design) {
        if (slot.rfid === rfid) {
          slot.quantity = quantity ?? slot.quantity ?? 0;
          slot.weight = total_weight_kg ?? slot.weight ?? 0;
          rackUpdated = true;
        }
      }
    }

    if (rackUpdated) {
      await fs.writeFile(
        rackdesignPath,
        JSON.stringify(racks, null, 2),
        "utf-8"
      );
    }

    return res.status(200).json({
      success: true,
      product_saved: true,
      rack_updated: rackUpdated
    });

  } catch (err) {
    console.error("SAVE ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};



module.exports = { getallrfids, getproductbyrfid };
