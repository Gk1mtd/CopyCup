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
ipcMain.on("copy-files", (event, files, targetDirectory) => {
  // Recursive function to copy files and directories
  const copyRecursive = (source, target) => {
    const fileStats = fs.statSync(source);

    if (fileStats.isDirectory()) {
      // Create target directory if it doesn't exist
      if (!fs.existsSync(target)) {
        fs.mkdirSync(target);
      }

      // Read and copy files within the directory
      const files = fs.readdirSync(source);
      files.forEach((file) => {
        const currentSource = path.join(source, file);
        const currentTarget = path.join(target, file);
        copyRecursive(currentSource, currentTarget);
      });
    } else if (fileStats.isFile()) {
      // Copy the file if it hasn't been copied before
      if (!copiedFiles.has(source)) {
        copiedFiles.add(source);
        fs.copyFileSync(source, target);
      }
    }
  };

  // Copy each selected file to the target directory
  files.forEach((file) => {
    const fileName = path.basename(file);
    const targetPath = path.join(targetDirectory, fileName);

    try {
      // Copy the file or directory recursively
      copyRecursive(file, targetPath);
      // Send success status to the renderer process
      event.sender.send("copy-status", { filePath: file, success: true });
    } catch (error) {
      console.error("Error copying file:", error);
      // Send error status to the renderer process
      event.sender.send("copy-status", { filePath: file, success: false });
    }
  });
});
