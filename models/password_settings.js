const fs = require("fs").promises;
const path = require("path");

// Electron içinde uygulamanın resourcesPath'i kullan
const isPackaged = require("electron").app.isPackaged;
const basePath = isPackaged
  ? path.join(process.resourcesPath, "data") // packaged app
  : path.join(__dirname, "..", "data");    // dev mode

const filePath = path.join(basePath, "users.json");

// Get all users
const getPasswordSettings = async (req, res) => {
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const jsonData = JSON.parse(fileContent);

    res.status(200).json(jsonData.users || []);
  } catch (error) {
    res.status(500).json({ message: "Error reading user data", error });
  }
};

// Update the entire users list
const updatePasswordSettings = async (req, res) => {
  try {
    const newSettings = req.body;

    if (!Array.isArray(newSettings)) {
      return res.status(400).json({ message: "Invalid data format, expected an array of users" });
    }

    const newData = { users: newSettings };
    await fs.writeFile(filePath, JSON.stringify(newData, null, 2), "utf-8");

    res.status(200).json({ message: "User settings updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error updating user data", error });
  }
};

// Add a single new user (auto-increment user_id)
const addNewUser = async (req, res) => {
  try {
    const { user_name, password, user_role, email } = req.body;

    if (!user_name || !password || !user_role || !email) {
      return res.status(400).json({ message: "Missing required fields: user_name, password, user_role" });
    }

    const fileContent = await fs.readFile(filePath, "utf-8");
    const jsonData = JSON.parse(fileContent);

    const users = jsonData.users || [];

    // Check for duplicate username
    if (users.some((u) => u.user_name === user_name)) {
      return res.status(409).json({ message: "User with this name already exists" });
    }

    // Determine next ID
    const nextId = users.length > 0 ? Math.max(...users.map((u) => u.user_id)) + 1 : 1;

    const newUser = {
      user_id: nextId,
      user_name,
      user_role,
      password,
      email,
    };

    users.push(newUser);

    await fs.writeFile(filePath, JSON.stringify({ users }, null, 2), "utf-8");

    res.status(201).json({ message: "New user added successfully", newUser });
  } catch (error) {
    res.status(500).json({ message: "Error adding new user", error });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { user_id } = req.params;

    const fileContent = await fs.readFile(filePath, "utf-8");
    const jsonData = JSON.parse(fileContent);
    const users = jsonData.users || [];

    const index = users.findIndex((u) => u.user_id === parseInt(user_id));
    if (index === -1) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove user
    users.splice(index, 1);

    await fs.writeFile(filePath, JSON.stringify({ users }, null, 2), "utf-8");

    res.status(200).json({ message: `User with ID ${user_id} deleted successfully` });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error });
  }
};

module.exports = { getPasswordSettings, updatePasswordSettings, addNewUser, deleteUser };