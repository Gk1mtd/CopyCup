const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const fs = require("fs");
const path = require("path");

let mainWindow;

// Create a Set to store copied files
const copiedFiles = new Set();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile("index.html");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", () => {
  dialog
    .showOpenDialog({
      properties: ["openDirectory"],
    })
    .then((result) => {
      if (!result.canceled && result.filePaths.length > 0) {
        createWindow();
        mainWindow.webContents.on("did-finish-load", () => {
          mainWindow.webContents.send("selected-folder", result.filePaths[0]);
        });
      } else {
        app.quit();
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on("copy-files", (event, files, targetDirectory) => {
  const copyRecursive = (source, target) => {
    const fileStats = fs.statSync(source);

    if (fileStats.isDirectory()) {
      if (!fs.existsSync(target)) {
        fs.mkdirSync(target);
      }

      const files = fs.readdirSync(source);
      files.forEach((file) => {
        const currentSource = path.join(source, file);
        const currentTarget = path.join(target, file);
        copyRecursive(currentSource, currentTarget);
      });
    } else if (fileStats.isFile()) {
      // Copy only if the file hasn't been copied before
      if (!copiedFiles.has(source)) {
        copiedFiles.add(source);
        fs.copyFileSync(source, target);
      }
    }
  };

  files.forEach((file) => {
    const fileName = path.basename(file);
    const targetPath = path.join(targetDirectory, fileName);

    try {
      copyRecursive(file, targetPath);
      event.sender.send("copy-status", { filePath: file, success: true });
    } catch (error) {
      console.error("Error copying file:", error);
      event.sender.send("copy-status", { filePath: file, success: false });
    }
  });
});
