const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on('get-dropped-files', (event, files) => {
  event.returnValue = files;
});

ipcMain.on('open-folder-dialog', (event) => {
  dialog
    .showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    })
    .then((result) => {
      if (!result.canceled && result.filePaths.length > 0) {
        event.sender.send('selected-folder', result.filePaths[0]);
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

ipcMain.on('copy-files', (event, files, targetDirectory) => {
  try {
    files.forEach((file) => {
      const fileName = path.basename(file);
      const targetPath = path.join(targetDirectory, fileName);

      const fileStats = fs.statSync(file);
      if (fileStats.isFile()) {
        fs.copyFileSync(file, targetPath);
      } else if (fileStats.isDirectory()) {
        copyDirectoryRecursiveSync(file, targetPath);
      }
    });

    event.returnValue = true;
  } catch (error) {
    console.error('Error copying files:', error);
    event.returnValue = false;
  }
});

function copyDirectoryRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target);
  }

  const files = fs.readdirSync(source);
  files.forEach((file) => {
    const currentSource = path.join(source, file);
    const currentTarget = path.join(target, file);
    if (fs.statSync(currentSource).isDirectory()) {
      copyDirectoryRecursiveSync(currentSource, currentTarget);
    } else {
      fs.copyFileSync(currentSource, currentTarget);
    }
  });
}
