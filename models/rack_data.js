const fs = require("fs").promises;
const path = require("path");


const appBase = process.pkg
  ? path.dirname(process.execPath)   // EXE'nin bulunduğu klasör
  : path.join(__dirname, "..");      // Normal çalışma

// Base path: exe ile aynı dizinde data klasörü

const basePath = path.join(appBase, "data");

const rack_desing = path.join(basePath, "rackdesign.json");

const product_data = path.join(basePath, "productdata.json");

const changed_data = path.join(basePath, "changedproduct.json");

// Helper functions

const readRackDesign = async () => {
  const fileContent = await fs.readFile(rack_desing, "utf-8");
  return JSON.parse(fileContent);
};

const readProductData = async () => {
  const fileContent = await fs.readFile(product_data, "utf-8");
  return JSON.parse(fileContent);
};

const updateChangedProduct = async (dataArray) => {
  await fs.writeFile(changed_data, JSON.stringify(dataArray, null, 2), "utf-8");
};

const updateProduct = async (data) => {
  await fs.writeFile(product_data, JSON.stringify(data, null, 2), "utf-8");
};

const generateId = ({ rack, level, slot }) => {
  return `rack-${rack}-level-${level}-slot-${slot}`;
};


const generateNextId = (products) => {
  if (!products.length) return "1";
  const maxId = Math.max(...products.map(p => Number(p.id || 0)));
  return String(maxId + 1);
};

const pickProductFields = (data) => {
  const result = {
    product_code: data.product_code,
    description: data.description,
    standard: data.standard
  };

  if (data.unit_weight_gram !== undefined) {
    result.unit_weight_gram = data.unit_weight_gram;
  }

  return result;
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

    const rackItem = rackDesigns.find(r => String(r.rack_id) === String(rack));

    if (!rackItem) {
      return res.status(404).json({ message: "Rack not found" });
    }

    const slotDesign = rackItem.design.find(
      d =>
        String(d.level_id) === String(level) &&
        String(d.slot_id) === String(slot)
    );

    if (!slotDesign) {
      return res.status(404).json({ message: "Slot not found" });
    }

    if (!slotDesign.rfid || String(slotDesign.rfid).trim() === "") {
      return res.status(404).json({ message: "RFID not found" });
    }

    const oldRfid = String(slotDesign.rfid).trim().toUpperCase();

    // 3️⃣ productdata.json → ürünü bul
    const products = await readProductData();

    const productIndex = products.findIndex(p =>
      String(p.rfid).trim().toUpperCase() === oldRfid
    );

    const allRevisedData = [
      {
        ...updatedFields,
        rack,
        level,
        slot
      }
    ];


    console.log(allRevisedData);

    await updateChangedProduct(allRevisedData);

    const newRfid = updatedFields.rfid
      ? String(updatedFields.rfid).trim().toUpperCase()
      : null;

    // 5️⃣ productdata.json güncelle (ürün varsa update, yoksa ekle)
    if (productIndex === -1) {
      const newProduct = {
        id: generateNextId(products),
        ...pickProductFields(updatedFields),
        rfid: newRfid || oldRfid
      };

      products.push(newProduct);
      await updateProduct(products);

      return res.status(200).json(newProduct);
    } else {
      products[productIndex] = {
        ...products[productIndex],
        ...pickProductFields(updatedFields),
        rfid: newRfid || oldRfid
      };

      await updateProduct(products);

      return res.status(200).json(products[productIndex]);
    }


  } catch (error) {
    res.status(500).json({
      message: "Error updating product data",
      error: error.message
    });
  }
};




module.exports = { getRacks, updateRack };
