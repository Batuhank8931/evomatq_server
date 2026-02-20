const fs = require("fs").promises;
const path = require("path");

const appBase = process.pkg
  ? path.dirname(process.execPath)
  : path.join(__dirname, "..");

const basePath = path.join(appBase, "data");
const filePath = path.join(basePath, "calibrationdatas.json");

const calibration = async (req, res) => {
  try {
    const body = req.body;
    const step = Number(body.step) || 1;

    let data = [];

    // JSON oku
    try {
      const fileData = await fs.readFile(filePath, "utf-8");
      data = JSON.parse(fileData);
    } catch {
      data = [];
    }

    // Entry bul / oluştur
    let entry = data.find(d => d.rfid === body.rfid);

    if (!entry) {
      const idParts = body.id.split("-");
      entry = {
        level_id: parseInt(idParts[3], 10) || 1,
        slot_id: parseInt(idParts[5], 10) || 1,
        rfid: body.rfid ?? "UNKNOWN",
        state: 0
      };
      data.push(entry);
    }

    /* -------------------------
       STEP 1 GELDİYSE
       state = 1 yap → 3 bekle
    -------------------------- */
    if (step === 1) {
      entry.state = 1;
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
      console.log("State set to 1, waiting for state=2");

      while (true) {
        await new Promise(r => setTimeout(r, 100));

        const currentData = JSON.parse(
          await fs.readFile(filePath, "utf-8")
        );

        const currentEntry = currentData.find(d => d.rfid === body.rfid);

        if (currentEntry?.state === 2) {
          console.log("State reached 2");
          break;
        }
      }
    }

    /* -------------------------
       STEP 2 GELDİYSE
       state = 3 → silinene kadar bekle
    -------------------------- */
    if (step === 2) {
      entry.state = 3;

      await fs.writeFile(
        filePath,
        JSON.stringify(data, null, 2),
        "utf-8"
      );

      console.log("State set to 3, waiting for deletion");

      while (true) {
        await new Promise(r => setTimeout(r, 100));

        const currentData = JSON.parse(
          await fs.readFile(filePath, "utf-8")
        );

        const currentEntry = currentData.find(d => d.rfid === body.rfid);

        if (!currentEntry) {
          console.log("Entry deleted");
          break;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Calibration flow completed",
      step
    });

  } catch (error) {
    console.error("calibration error:", error);
    res.status(500).json({ error: "Calibration failed" });
  }
};




module.exports = { calibration };
