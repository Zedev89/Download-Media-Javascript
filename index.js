const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('fs');
const os = require('os');

// Determine the temp folder path (same logic as main.js)
function getOutputFolder() {
  if (process.env.VIDEO_CAPTURES_DIR) {
    return process.env.VIDEO_CAPTURES_DIR;
  } else if (process.platform === 'win32') {
    return path.join(process.env.USERPROFILE, "Videos", "Captures");
  } else {
    return path.join(process.env.HOME || os.homedir(), "Videos", "Captures");
  }
}
const operationFolder = path.join(getOutputFolder(), "downloading");

// Set ffmpeg/ffprobe paths for packaged app
function getResourcePath(binName) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'bin', binName + (process.platform === 'win32' ? '.exe' : ''));
  } else {
    return path.join(__dirname, 'bin', binName + (process.platform === 'win32' ? '.exe' : ''));
  }
}

// Set environment variables so fluent-ffmpeg finds the binaries
process.env.FFMPEG_PATH = getResourcePath('ffmpeg');
process.env.FFPROBE_PATH = getResourcePath('ffprobe');

// Fix yt-dlp path for packaged app (asar.unpacked)
if (app.isPackaged) {
  const ytdlpDir = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'youtube-dl-exec', 'bin');
  process.env.YOUTUBE_DL_DIR = ytdlpDir;
  console.log("YOUTUBE_DL_DIR:", ytdlpDir);
}

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 1000,
        height: 600,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    // Cleanup temp folders when window is closed
    mainWindow.on('close', () => {
        try {
            if (fs.existsSync(operationFolder)) {
                fs.rmSync(operationFolder, { recursive: true, force: true });
                console.log("Temp folder cleaned up");
            }
        } catch (err) {
            console.error("Cleanup error:", err);
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Uncomment for debugging:
    // mainWindow.webContents.openDevTools();
};

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Cleanup temp folders on quit
app.on('before-quit', () => {
    try {
        if (fs.existsSync(operationFolder)) {
            fs.rmSync(operationFolder, { recursive: true, force: true });
        }
    } catch (err) {
        console.error("Cleanup error:", err);
    }
});
