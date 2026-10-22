const { app, BrowserWindow, shell, Menu, session } = require("electron");

const APP_URL =
  process.env.OPENCIRCLE_URL || "https://opencircle-lol-creative.vercel.app/app";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0c0c0e",
    title: "OpenCircle",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: require("path").join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: true,
    },
  });

  win.once("ready-to-show", () => win.show());
  win.loadURL(APP_URL);

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Keep permissions smooth (mic/camera for voice)
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
    const allow = ["media", "notifications", "display-capture", "clipboard-sanitized-write"];
    cb(allow.includes(permission));
  });

  Menu.setApplicationMenu(null);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
