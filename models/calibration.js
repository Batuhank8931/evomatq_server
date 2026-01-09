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
	console.log("calibration body:", body);

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
		state: 1
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

	// JSON’dan silinene kadar bekle
	const waitForDeletion = async () => {
	  while (true) {
		try {
		  const fileData = await fs.readFile(filePath, "utf-8");
		  const currentData = JSON.parse(fileData);
		  const currentEntry = currentData.find(d => d.rfid === body.rfid);

		  if (!currentEntry) {
			console.log("Entry deleted from JSON");
			break; // silinmiş, çık
		  }
		} catch (err) {
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

module.exports = { calibration };
