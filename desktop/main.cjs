const { app, BrowserWindow, shell } = require("electron");
const APP_URL = process.env.ORBITA_WEB_URL;
function createWindow() {
  if (!APP_URL || !/^https:\/\//i.test(APP_URL)) throw new Error("Set ORBITA_WEB_URL to the deployed HTTPS Orbita website.");
  const win = new BrowserWindow({
    width: 1440, height: 940, minWidth: 900, minHeight: 650,
    title: "Orbita", backgroundColor: "#080d18", autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.webContents.setWindowOpenHandler(({url}) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return {action:"deny"};
  });
  win.loadURL(APP_URL);
}
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
