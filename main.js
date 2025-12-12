const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let logWindow;

function createLogWindow() {
    logWindow = new BrowserWindow({
        width: 500,
        height: 300,
        title: 'Server Log',
        webPreferences: {
            nodeIntegration: true, // basit kullanım için
            contextIsolation: false
        }
    });

    // Basit bir HTML sayfası yükle
    logWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
        <html>
        <head>
            <title>Server Log</title>
            <style>
                body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; padding: 10px; }
                #log { white-space: pre-wrap; }
            </style>
        </head>
        <body>
            <div id="log"></div>
            <script>
                const { ipcRenderer } = require('electron');
                ipcRenderer.on('log-message', (event, msg) => {
                    const logDiv = document.getElementById('log');
                    logDiv.textContent += msg + '\\n';
                    logDiv.scrollTop = logDiv.scrollHeight;
                });
            </script>
        </body>
        </html>
    `));
}

app.whenReady().then(() => {
    //createLogWindow();

    const server = require(path.join(__dirname, 'bin', 'www.js'));

    const log = (msg) => {
        console.log(msg);
        if (logWindow) logWindow.webContents.send('log-message', msg);
    }

    log('EvomatQ server is running in Electron (headless)');

    process.on('unhandledRejection', (reason, promise) => {
        log('Unhandled Rejection: ' + reason);
    });
});

app.on('quit', () => {
    console.log('Electron quitting...');
});
