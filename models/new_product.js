const fs = require("fs").promises;
const path = require("path");

const appBase = process.pkg
  ? path.dirname(process.execPath)
  : path.join(__dirname, "..");

const basePath = path.join(appBase, "data");
const filePath = path.join(basePath, "new_productdatas.json");

const new_productStepTwo = async (req, res) => {
  try {
    const body = req.body;
    console.log("new_product body:", body);

    // JSON dosyasını oku
    let data = [];
    try {
      const fileData = await fs.readFile(filePath, "utf-8");
      data = JSON.parse(fileData);
    } catch (err) {
      data = [];
    }

    // RFID’ye göre kaydı bul veya yoksa ekle
    let entry = data.find(d => d.rfid === body.rfid);
    if (!entry) {
      const idParts = body.id.split('-');
      const level_id = parseInt(idParts[3], 10) || 1;
      const slot_id = parseInt(idParts[5], 10) || 1;

      entry = {
        level_id,
        slot_id,
        rfid: body.rfid ?? "UNKNOWN",
        quantity: body.amount ?? null,
        state: 2,
        ack: 0
      };
      data.push(entry);
    } else {
      // Mevcut kaydı güncelle
      entry.quantity = body.amount ?? entry.quantity;
      entry.state = 2;
    }

    // JSON’a yaz
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    console.log("Data written with state=2 and updated quantity");

    // JSON’dan silinene ya da error state’e çekilene kadar bekle
    const waitForDeletion = async () => {
      while (true) {
        try {
          const fileData = await fs.readFile(filePath, "utf-8");
          const currentData = JSON.parse(fileData);
          const index = currentData.findIndex(d => d.rfid === body.rfid);

          // ✅ Kayıt silinmişse → normal çık
          if (index === -1) {
            console.log("Entry deleted from JSON");
            break;
          }

          const currentEntry = currentData[index];

          // ❌ state error ise → sil, terminate et
          if (currentEntry.state === "error") {
            // JSON’dan sil
            currentData.splice(index, 1);

            await fs.writeFile(
              filePath,
              JSON.stringify(currentData, null, 2),
              "utf-8"
            );

            throw new Error(
              "Rack does not contain the product. The operation has been terminated."
            );
          }

        } catch (err) {
          // Bilinçli terminate hatası
          if (
            err.message ===
            "Rack does not contain the product. The operation has been terminated."
          ) {
            throw err;
          }

          console.error("Error reading JSON file:", err);
        }

        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms bekle
      }
    };

    await waitForDeletion();

    res.status(200).json({ success: true, message: "Product data saved and entry deleted" });
  } catch (error) {
    console.error("new_product error:", error);
    res.status(500).json({ message: "Error saving product data", error });
  }
};

module.exports = { new_productStepTwo };
