const fs = require("fs").promises;
const path = require("path");

const appBase = process.pkg
  ? path.dirname(process.execPath)
  : path.join(__dirname, "..");

const basePath = path.join(appBase, "data");
const filePath = path.join(basePath, "flashlight.json");

const get_flash_light = async (req, res) => {
  try {
    const { id, light, state } = req.body;
    // state: true = yak, false = söndür

    if (
      typeof id !== "string" ||
      typeof light !== "number" ||
      light < 1 ||
      light > 4 ||
      typeof state !== "boolean"
    ) {
      return res.status(400).json({
        error: "id(string), light(1-4) and state(boolean) must be provided"
      });
    }
    // JSON'u tamamen boş bir obje ile sıfırla
    await fs.writeFile(filePath, JSON.stringify({}, null, 2), "utf-8");
    // Dosyayı oku
    let data = {};
    try {
      const fileContent = await fs.readFile(filePath, "utf-8");
      data = JSON.parse(fileContent);
    } catch {
      data = {};
    }

    // Slot yoksa oluştur
    if (!data[id]) {
      data[id] = {};
    }

    // Sadece ilgili rengi güncelle
    data[id][light] = state;

    await fs.writeFile(
      filePath,
      JSON.stringify(data, null, 2),
      "utf-8"
    );

    res.json({
      success: true,
      id,
      light,
      state,
      data: data[id]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const clear_flash_light = async (req, res) => {
  try {
    // JSON'u tamamen boş bir obje ile sıfırla
    await fs.writeFile(filePath, JSON.stringify({}, null, 2), "utf-8");

    res.json({
      success: true,
      message: "Flash light data cleared",
      data: {}
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};


module.exports = { get_flash_light, clear_flash_light };
