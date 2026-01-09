const fs = require("fs").promises;
const path = require("path");


const appBase = process.pkg
  ? path.dirname(process.execPath)   // EXE'nin bulunduğu klasör
  : path.join(__dirname, "..");      // Normal çalışma

// Base path: exe ile aynı dizinde data klasörü

const basePath = path.join(appBase, "data");

const rack_desing = path.join(basePath, "rackdesign.json");

const product_data = path.join(basePath, "productdata.json");

// Helper functions

const readRackDesign = async () => {
  const fileContent = await fs.readFile(rack_desing, "utf-8");
  return JSON.parse(fileContent);
};

const readProductData = async () => {
  const fileContent = await fs.readFile(product_data, "utf-8");
  return JSON.parse(fileContent);
};


const updateProduct = async (data) => {
  await fs.writeFile(product_data, JSON.stringify(data, null, 2), "utf-8");
};

const generateId = ({ rack, level, slot }) => {
  return `rack-${rack}-level-${level}-slot-${slot}`;
};

const parseRackId = (id) => {
  const match = id.match(/rack-(\d+)-level-(\d+)-slot-(\d+)/);
  if (!match) return null;

  return {
    rack: Number(match[1]),
    level: Number(match[2]),
    slot: Number(match[3])
  };
};


const buildRackData = async () => {
  const rackDesigns = await readRackDesign();
  const products = await readProductData();

  // RFID → product map
  const productMap = {};
  products.forEach(p => {
    productMap[p.rfid] = p;
  });

  const result = [];

  rackDesigns.forEach(rack => {
    const rackId = rack.rack_id;

    rack.design.forEach(slot => {
      const { level_id, slot_id, rfid, quantity, weight } = slot;
      const product = rfid ? productMap[rfid] : null;

      result.push({
        id: `rack-${rackId}-level-${level_id}-slot-${slot_id}`,
        rack: rackId,
        level: level_id,
        slot: slot_id,

        // productdata'dan gelenler
        box_width_mm: product?.box_width_mm ?? null,
        product_code: product?.product_code ?? null,
        description: product?.description ?? null,
        standard: product?.standard ?? null,
        unit_weight_gram: product?.unit_weight_gram ?? null,
        status: product?.status ?? "empty",
        color: product?.color ?? "#dcdcdc",

        // 🔥 ARTIK rackdesign.json'dan
        quantity: quantity ?? 0,
        total_weight_kg: weight ?? 0,

        rfid
      });
    });
  });

  return result;
};



// GET all racks
const getRacks = async (req, res) => {
  try {
    const data = await buildRackData();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      message: "Error building rack data",
      error: error.message
    });
  }
};




// PUT (update) rack by ID
const updateRack = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedFields = req.body;

    // 1️⃣ id parse
    const parsed = parseRackId(id);
    if (!parsed) {
      return res.status(400).json({ message: "Invalid rack id format" });
    }

    const { rack, level, slot } = parsed;

    // 2️⃣ rackdesign.json → RFID bul
    const rackDesigns = await readRackDesign();

    const rackItem = rackDesigns.find(r => r.rack_id === rack);
    if (!rackItem) {
      return res.status(404).json({ message: "Rack not found" });
    }

    const slotDesign = rackItem.design.find(
      d => d.level_id === level && d.slot_id === slot
    );

    if (!slotDesign || !slotDesign.rfid) {
      return res.status(404).json({ message: "Slot or RFID not found" });
    }

    const rfid = slotDesign.rfid;

    // 3️⃣ productdata.json → ürünü bul
    const products = await readProductData();
    const productIndex = products.findIndex(p => p.rfid === rfid);

    if (productIndex === -1) {
      return res.status(404).json({
        message: "Product not found for this RFID",
        rfid
      });
    }

    // 4️⃣ ürünü güncelle
    products[productIndex] = {
      ...products[productIndex],
      ...updatedFields,
      rfid,           // garanti
      isEdited: true
    };

    // 5️⃣ productdata.json’a yaz
    await updateProduct(products);

    res.status(200).json(products[productIndex]);

  } catch (error) {
    res.status(500).json({
      message: "Error updating product data",
      error: error.message
    });
  }
};


module.exports = { getRacks, updateRack };
