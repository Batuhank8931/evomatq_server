const app = require("./app");
const os = require("os");

const PORT = process.env.PORT || 3008;

// LAN IPv4 almak
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}

const HOST = getLocalIP();

app.listen(PORT, HOST, () => {
  console.log("===========================================");
  console.log(`EvomatQ server is running!`);
  console.log(`Local:   http://localhost:${PORT}`);
  console.log(`LAN:     http://${HOST}:${PORT}`);
  console.log("===========================================");
});
