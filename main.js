// Import required modules from Electron and Node.js
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const fs = require("fs");
const path = require("path");

// Declare a variable to hold the main window reference
let mainWindow;

// Create a Set to store copied files
const copiedFiles = new Set();

// Function to create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Load the HTML file into the main window
  mainWindow.loadFile("index.html");

  // Event handler for the "closed" event of the main window
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Event listener for when the app is ready
app.on("ready", () => {
  // Open a dialog to select a directory
  dialog
    .showOpenDialog({
      properties: ["openDirectory"],
    })
    .then((result) => {
      // If a directory is selected
      if (!result.canceled && result.filePaths.length > 0) {
        // Create the main window
        createWindow();
        // Once the window finishes loading, send the selected folder path to it
        mainWindow.webContents.on("did-finish-load", () => {
          mainWindow.webContents.send("selected-folder", result.filePaths[0]);
        });
      } else {
        // Quit the app if no directory is selected
        app.quit();
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

// Event listener for when all windows are closed
app.on("window-all-closed", () => {
  // Quit the app on all platforms except macOS
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Event listener for when the app is activated (macOS specific)
app.on("activate", () => {
  // Recreate the main window if it's null (e.g., app was reactivated)
  if (mainWindow === null) {
    createWindow();
  }
});

// Event listener for IPC messages related to copying files
ipcMain.on("copy-files", async (event, files, targetDirectory) => {
  // Recursive function to copy files and directories
  const copyRecursive = async (source, target) => {
    try {
      const fileStats = await fs.promises.stat(source);

      if (fileStats.isDirectory()) {
        try {
          await fs.promises.access(target);
        } catch (error) {
          await fs.promises.mkdir(target);
        }

        const files = await fs.promises.readdir(source);

        for (const file of files) {
          const currentSource = path.join(source, file);
          const currentTarget = path.join(target, file);
          await copyRecursive(currentSource, currentTarget);
        }
      } else if (fileStats.isFile()) {
        if (!copiedFiles.has(source)) {
          copiedFiles.add(source);
          await fs.promises.copyFile(source, target);
          console.log("done with copy: ", source);
        }
      }
    } catch (error) {
      console.error("Error copying file:", error);
      throw error; // Rethrow the error to be caught outside
    }
  };

  for (const file of files) {
    const fileName = path.basename(file);
    const targetPath = path.join(targetDirectory, fileName);

    try {
      await copyRecursive(file, targetPath);
      event.sender.send("copy-status", { filePath: file, success: true });
    } catch (error) {
      console.error("Error copying file:", error);
      event.sender.send("copy-status", { filePath: file, success: false });
    }
  }
});
