const fs = require("fs").promises;
const path = require("path");

const appBase = process.pkg
	? path.dirname(process.execPath)
	: path.join(__dirname, "..");

const basePath = path.join(appBase, "data");
const filePath = path.join(basePath, "rackdesign.json");

const readData = async () => {
	const fileContent = await fs.readFile(filePath, "utf-8");
	return JSON.parse(fileContent);
};

const writeData = async (data) => {
	await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
};

// Rack tasarımını getir
const GetRackDesign = async (req, res) => {
	try {
		const data = await readData();
		const { id } = req.params;

		if (id) {
			const rack = data.find((r) => r.rack_id === parseInt(id));
			if (!rack) return res.status(404).json({ message: "Rack not found" });
			return res.status(200).json(rack);
		}

		res.status(200).json(data);
	} catch (error) {
		res.status(500).json({ message: "Error reading rack design", error });
	}
};

// Yeni rack ekle
const InsertRackDesign = async (req, res) => {
	try {
		const newRack = req.body;

		if (!newRack || !newRack.rack_id || !Array.isArray(newRack.design)) {
			return res.status(400).json({ message: "Invalid rack format" });
		}

		const data = await readData();

		const exists = data.find((r) => r.rack_id === newRack.rack_id);
		if (exists) {
			return res.status(400).json({ message: "Rack ID already exists" });
		}

		// 🔹 RFID boş olarak eklenecek
		const normalizedDesign = newRack.design.map(item => ({
			level_id: item.level_id,
			slot_id: item.slot_id,
			rfid: item.rfid ?? null
		}));

		const rackToInsert = {
			rack_id: newRack.rack_id,
			design: normalizedDesign
		};

		data.push(rackToInsert);
		await writeData(data);

		res.status(201).json({ message: "Rack added successfully" });
	} catch (error) {
		res.status(500).json({ message: "Error inserting rack", error });
	}
};


// Var olan rack'i güncelle
const updateRackDesign = async (req, res) => {
	try {
		const { id } = req.params;
		const updatedDesign = req.body;

		if (!updatedDesign || !Array.isArray(updatedDesign.design)) {
			return res.status(400).json({ message: "Invalid design format" });
		}

		const data = await readData();
		const rackIndex = data.findIndex(
			(r) => r.rack_id === parseInt(id)
		);

		if (rackIndex === -1) {
			return res.status(404).json({ message: "Rack not found" });
		}

		const existingDesign = data[rackIndex].design;

		const mergedDesign = updatedDesign.design.map(newItem => {
			const oldItem = existingDesign.find(
				d =>
					d.level_id === newItem.level_id &&
					d.slot_id === newItem.slot_id
			);

			return {
				level_id: newItem.level_id,
				slot_id: newItem.slot_id,
				// 🔴 RFID sadece GELİRSE değişir, gelmezse korunur
				rfid:
					newItem.rfid !== undefined
						? newItem.rfid
						: oldItem?.rfid ?? null
			};
		});

		data[rackIndex].design = mergedDesign;
		await writeData(data);

		res.status(200).json({ message: "Rack updated successfully" });
	} catch (error) {
		res.status(500).json({ message: "Error updating rack", error });
	}
};



// Rack sil
const deleteRackDesign = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await readData();

		const rackIndex = data.findIndex((r) => r.rack_id === parseInt(id));
		if (rackIndex === -1) {
			return res.status(404).json({ message: "Rack not found" });
		}

		data.splice(rackIndex, 1); // İlgili rack'i sil
		await writeData(data);

		res.status(200).json({ message: "Rack deleted successfully" });
	} catch (error) {
		res.status(500).json({ message: "Error deleting rack", error });
	}
};


module.exports = { GetRackDesign, InsertRackDesign, updateRackDesign, deleteRackDesign };
