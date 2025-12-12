const fs = require("fs").promises;
const path = require("path");
const { app } = require("electron");

// Determine base path depending on whether the app is packaged
const isPackaged = app.isPackaged;
const basePath = isPackaged
    ? path.join(process.resourcesPath, "data") // packaged app
    : path.join(__dirname, "..", "data");     // dev mode


const filePath = path.join(basePath, "requests.json");

const usersFilePath = path.join(basePath, "users.json");

const rackdataPath = path.join(basePath, "rackdata.json");

const activereqeustsPath = path.join(basePath, "activerequests.json");


// Helper: read requests
const readRequests = async () => {
    try {
        const fileContent = await fs.readFile(filePath, "utf-8");
        return JSON.parse(fileContent);
    } catch {
        return [];
    }
};

// Helper: read rack data
const readRackData = async () => {
    try {
        const fileContent = await fs.readFile(rackdataPath, "utf-8");
        return JSON.parse(fileContent);
    } catch {
        return [];
    }
};


// Helper: read users
const readUsers = async () => {
    try {
        const fileContent = await fs.readFile(usersFilePath, "utf-8");
        return JSON.parse(fileContent).users || [];
    } catch {
        return [];
    }
};

// Helper: read users
const readActiveRequests = async () => {
    try {
        const fileContent = await fs.readFile(activereqeustsPath, "utf-8");
        return JSON.parse(fileContent);
    } catch {
        return [];
    }
};

// Helper function to write requests
const writeRequests = async (requests) => {
    await fs.writeFile(filePath, JSON.stringify(requests, null, 2), "utf-8");
};

const writeActiveRequests = async (requests) => {
    await fs.writeFile(activereqeustsPath, JSON.stringify(requests, null, 2), "utf-8");
};

// POST: Add a new request
const addRequest = async (req, res) => {
    try {
        const requestsArray = req.body.input;
        const userId = req.body.userId;

        if (!Array.isArray(requestsArray) || requestsArray.length === 0) {
            return res.status(400).json({ message: "Request body must be a non-empty array" });
        }

        const existingRequests = await readRequests();
        const activeExistingRequests = await readActiveRequests();
        const rackData = await readRackData();   // <-- AVAILABLE QUANTITIES

        // NEXT GLOBAL ADDING NUMBER
        const nextAddingNumber = existingRequests.length > 0
            ? Math.max(...existingRequests.map(r => r.adding_number || 0)) + 1
            : 1;

        // NEXT GLOBAL UNIQUE REQUEST ID
        const maxExistingId = existingRequests.length > 0
            ? Math.max(...existingRequests.map(r => r.id || 0))
            : 0;

        let currentId = maxExistingId + 1;

        const now = new Date();

        // Gün, ay, yıl
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Aylar 0-11 arası
        const year = now.getFullYear();

        // Saat, dakika, saniye (24 saat formatı)
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');

        // Son format: dd/mm/yyyy HH:MM:SS
        const timestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

        // -------------- IMPORTANT PART: CHECK QUANTITIES FIRST --------------
        for (const r of requestsArray) {
            const rackItem = rackData.find(x => x.product_code === r.productCode);

            if (!rackItem) {
                return res.status(400).json({
                    message: `Product code ${r.productCode} not found in rack data`
                });
            }

            const availableQty = Number(rackItem.quantity || 0);

            if (r.requestedQuantity > availableQty) {
                return res.status(400).json({
                    message: `Requested quantity for product ${r.productCode} exceeds available quantity`,
                    productCode: r.productCode,
                    requested: r.requestedQuantity,
                    available: availableQty
                });
            }
        }
        // ---------------------------------------------------------------------

        // Create new requests with unique ID
        const newRequests = requestsArray.map(r => ({
            productCode: r.productCode,
            id: currentId++,
            description: r.description,
            standard: r.standard,
            quantity: r.quantity || 0,
            requestedQuantity: r.requestedQuantity,
            status: "Pending",
            adding_number: nextAddingNumber,
            userId,
            selectedViewer: "",
            created_at: timestamp,
            updated_at: timestamp,
            preparing_at: null,
            ready_at: null,
            cancelled_at: null
        }));

        // Add only one entry to active requests for this adding_number
        const newActiveRequest = {
            adding_number: nextAddingNumber,
            status: "Pending",
            selectedViewer: "",
            created_at: timestamp,
            updated_at: timestamp
        };

        await writeRequests([...existingRequests, ...newRequests]);
        await writeActiveRequests([...activeExistingRequests, newActiveRequest]);

        res.status(201).json({
            message: "Requests added successfully",
            requests: newRequests,
            request_id: nextAddingNumber
        });

    } catch (error) {
        res.status(500).json({ message: "Error adding requests", error });
    }
};


// GET: Return all requests
const getRequests = async (req, res) => {
    try {
        const requests = await readRequests();
        const rackData = await readRackData();
        const users = await readUsers();

        // Build fast maps
        const rackMap = {};
        rackData.forEach(r => rackMap[r.product_code] = r.quantity);

        const requestMap = {};

        requests
            .filter(r => ["Pending", "Preparing"].includes(r.status))
            .forEach(r => {
                const code = r.productCode;
                const qty = Number(r.requestedQuantity) || 0;

                if (!requestMap[code]) {
                    requestMap[code] = 0;
                }

                requestMap[code] += qty;
            });

        const userMap = {};
        users.forEach(u => userMap[u.user_id] = u.user_name);

        // Enrich requests with quantity + user_name
        const enrichedRequests = requests.map(reqItem => ({
            ...reqItem,
            availableQuantity: rackMap[reqItem.productCode] - (requestMap[reqItem.productCode] || 0) || 0,
            user_name: userMap[reqItem.userId] || null
        }));

        res.status(200).json(enrichedRequests);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Error retrieving requests", error });
    }
};

const getActiveRquests = async (req, res) => {
    try {
        const requests = await readRequests();
        const rackData = await readRackData();
        const users = await readUsers();
        const activeRequests = await readActiveRequests();

        // Build fast maps
        const rackMap = {};
        rackData.forEach(r => rackMap[r.product_code] = r.quantity);

        const userMap = {};
        users.forEach(u => userMap[u.user_id] = u.user_name);

        // Enrich requests with quantity + user_name
        const enrichedRequests = requests.map(reqItem => ({
            ...reqItem,
            availableQuantity: rackMap[reqItem.productCode] || 0,
            user_name: userMap[reqItem.userId] || null
        }));

        // Get active adding_numbers
        const activeAddingNumbers = activeRequests
            .filter(ar => ar.status === "Pending" || ar.status === "Preparing")
            .map(ar => ar.adding_number);

        // Filter enriched requests based on active adding_numbers
        const filteredRequests = enrichedRequests.filter(reqItem =>
            activeAddingNumbers.includes(reqItem.adding_number)
        );


        res.status(200).json(filteredRequests);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Error retrieving requests", error });
    }
};


// PUT: Update status for all requests by adding_number
const updateRequestsStatus = async (req, res) => {
    const { adding_number } = req.params;
    const { status } = req.body;
    const userId = req.user.user_id; // logged-in user

    const users = await readUsers();

    const userMap = {};
    users.forEach(u => userMap[u.user_id] = u.user_name);

    const userName = userMap[userId];

    try {
        if (!adding_number || status === undefined) {
            return res.status(400).json({ message: "adding_number and status are required" });
        }

        const existingRequests = await readRequests();
        const activeExistingRequests = await readActiveRequests();
        let updated = false;

        const now = new Date();

        // Gün, ay, yıl
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Aylar 0-11 arası
        const year = now.getFullYear();

        // Saat, dakika, saniye (24 saat formatı)
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');

        // Son format: dd/mm/yyyy HH:MM:SS
        const timestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

        // Update main requests
        const updatedRequests = existingRequests.map(r => {
            if (r.status === "Cancelled") return r;

            if (r.adding_number === Number(adding_number)) {
                updated = true;

                const updatedFields = {
                    status,
                    selectedViewer: userName,
                    updated_at: timestamp
                };

                if (status === "Preparing") {
                    updatedFields.preparing_at = timestamp;
                } else if (status === "Ready") {
                    updatedFields.ready_at = timestamp;
                }

                return { ...r, ...updatedFields };
            }

            return r;
        });

        if (!updated) {
            return res.status(404).json({ message: `No requests found with adding_number ${adding_number}` });
        }

        // Update or create active request for this adding_number
        let foundActive = false;
        const updatedActiveRequests = activeExistingRequests.map(ar => {
            if (ar.adding_number === Number(adding_number)) {
                foundActive = true;
                return {
                    ...ar,
                    status,
                    selectedViewer: userName,
                    updated_at: timestamp
                };
            }
            return ar;
        });

        // If no active request exists for this adding_number, create one
        if (!foundActive) {
            updatedActiveRequests.push({
                adding_number: Number(adding_number),
                status,
                selectedViewer: userName,
                created_at: timestamp,
                updated_at: timestamp
            });
        }

        await writeRequests(updatedRequests);
        await writeActiveRequests(updatedActiveRequests);

        res.status(200).json({
            message: `Requests with adding_number ${adding_number} updated successfully`,
            status,
            viewer: userName
        });
    } catch (error) {
        res.status(500).json({ message: "Error updating requests", error });
    }
};

// PUT: Update status for a specific item (adding_number + product_code + id)
const updateRequestsItem = async (req, res) => {
    const { adding_number, product_code, id } = req.params; // id eklendi
    const { status } = req.body;

    const userId = req.user.user_id;
    const users = await readUsers();

    const userMap = {};
    users.forEach(u => userMap[u.user_id] = u.user_name);

    const userName = userMap[userId];

    try {
        if (!adding_number || !product_code || !id || status === undefined) {
            return res.status(400).json({ message: "adding_number, product_code, id ve status gerekli" });
        }

        const existingRequests = await readRequests();
        let updated = false;

        const updatedRequests = existingRequests.map(r => {
            if (
                r.adding_number === Number(adding_number) &&
                r.productCode === product_code &&
                r.id === Number(id)  // id kontrolü eklendi
            ) {
                updated = true;

                const updatedFields = {
                    status,
                    selectedViewer: userName
                };

                if (status === "Preparing") {
                    updatedFields.preparing_at = new Date().toISOString();
                } else if (status === "Ready") {
                    updatedFields.ready_at = new Date().toISOString();
                }

                return { ...r, ...updatedFields };
            }
            return r;
        });

        if (!updated) {
            return res.status(404).json({
                message: `No item found with adding_number ${adding_number}, product_code ${product_code} and id ${id}`
            });
        }

        await writeRequests(updatedRequests);

        res.status(200).json({
            message: `Item ${product_code} in request ${adding_number} (id: ${id}) updated successfully`,
            status,
            viewer: userName
        });
    } catch (error) {
        res.status(500).json({ message: "Error updating request item", error });
    }
};


// PUT: Update requestedQuantity for all requests by adding_number
const updateRequestsQuantity = async (req, res) => {
    try {
        const { adding_number, product_code, id } = req.params; // Hepsini parametreden alıyoruz
        const { requestedQuantity } = req.body;

        if (!adding_number || !product_code || !id || requestedQuantity === undefined) {
            return res.status(400).json({ message: "adding_number, product_code, id ve requestedQuantity gerekli" });
        }

        const existingRequests = await readRequests();
        let updated = false;

        const now = new Date();

        // Gün, ay, yıl
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Aylar 0-11 arası
        const year = now.getFullYear();

        // Saat, dakika, saniye (24 saat formatı)
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');

        // Son format: dd/mm/yyyy HH:MM:SS
        const timestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

        const updatedRequests = existingRequests.map(r => {
            if (
                r.adding_number === Number(adding_number) &&
                r.productCode === product_code &&
                r.id === Number(id)
            ) {
                updated = true;
                return {
                    ...r,
                    requestedQuantity,
                    updated_at: timestamp
                };
            }
            return r;
        });

        if (!updated) {
            return res.status(404).json({ message: `No requests found matching the given criteria` });
        }

        await writeRequests(updatedRequests);

        res.status(200).json({
            message: `Request updated successfully`,
            requestedQuantity
        });
    } catch (error) {
        res.status(500).json({ message: "Error updating requested quantity", error });
    }
};




module.exports = { writeRequests, addRequest, getRequests, getActiveRquests, updateRequestsStatus, updateRequestsQuantity, updateRequestsItem };
