const fs = require("fs").promises;
const path = require("path");

const appBase = process.pkg
  ? path.dirname(process.execPath)   // EXE'nin bulunduğu klasör
  : path.join(__dirname, "..");      // Normal çalışma

// Base path: exe ile aynı dizinde data klasörü

const basePath = path.join(appBase, "data");


const filePath = path.join(basePath, "productdata.json");

const rackdesignPath = path.join(basePath, "rackdesign.json");

// Helper function to read JSON data
const ProductDetail = async () => {
  const fileContent = await fs.readFile(filePath, "utf-8");
  return JSON.parse(fileContent);
};

const readRackDesignData = async () => {
  try {
    const fileContent = await fs.readFile(rackdesignPath, "utf-8");
    return JSON.parse(fileContent);
  } catch {
    return [];
  }
};


// POST: Get racks by product_code / description / standard
const getRacksByProductCode = async (req, res) => {
  try {
    const {
      product_code,
      product_description,
      product_standard
    } = req.body;

    if (!product_code && !product_description && !product_standard) {
      return res.status(400).json({
        message: "At least one search field is required"
      });
    }

    const products = await ProductDetail();        // product master
    const rackDesignData = await readRackDesignData(); // stok kaynağı

    /* ---------------------------------------------------- */
    /* PREPARE SEARCH TERMS                                 */
    /* ---------------------------------------------------- */

    const code = product_code?.toString().toLowerCase();
    const desc = product_description?.toString().toLowerCase();
    const std = product_standard?.toString().toLowerCase();

    /* ---------------------------------------------------- */
    /* STEP 1: FIND PRODUCT(S) → GET RFID                  */
    /* ---------------------------------------------------- */

    const matchedProducts = products.filter(p =>
      (!code || p.product_code?.toLowerCase() === code) &&
      (!desc || p.description?.toLowerCase().includes(desc)) &&
      (!std || p.standard?.toLowerCase().includes(std))
    );

    if (matchedProducts.length === 0) {
      return res.status(202).json({
        message: "Product Not Found"
      });
    }

    /* ---------------------------------------------------- */
    /* STEP 2: PREPARE RACK DESIGN DATA                     */
    /* ---------------------------------------------------- */

    const allSlots = rackDesignData.flatMap(rack =>
      rack.design.map(slot => ({
        ...slot,
        rack_id: rack.rack_id
      }))
    );

    /* ---------------------------------------------------- */
    /* STEP 3: MERGE STOCK BY RFID                          */
    /* ---------------------------------------------------- */

    const result = matchedProducts.map(product => {

      const rfid = product.rfid;

      const relatedSlots = allSlots.filter(
        slot => slot.rfid === rfid
      );

      const totalQuantity = relatedSlots.reduce(
        (sum, slot) => sum + Number(slot.quantity || 0),
        0
      );

      return {
        ...product,
        quantity: totalQuantity,
        locations: relatedSlots.map(slot => ({
          rack_id: slot.rack_id,
          level_id: slot.level_id,
          slot_id: slot.slot_id,
          quantity: slot.quantity,
          weight: slot.weight
        }))
      };
    });

    /* ---------------------------------------------------- */

    return res.status(200).json(result);

  } catch (error) {
    console.error("getRacksByProductCode error:", error);
    return res.status(500).json({
      message: "Error reading data"
    });
  }
};



module.exports = getRacksByProductCode;
