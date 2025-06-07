const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

let lastOutputPath = '';

function createWindow() {
  console.log('Preload path:', path.join(__dirname, 'preload.js'));
  console.log('FFmpeg path:', ffmpegPath);

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.icns')
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('convert-video', async (event, inputPath, suggestedName) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save Converted Video',
    defaultPath: path.join(os.homedir(), 'Downloads', suggestedName),
    buttonLabel: 'Save Video',
    filters: [{ name: 'MP4 Video', extensions: ['mp4'] }]
  });

  if (canceled) {
    return { success: false, error: 'Save cancelled' };
  }

  const outputPath = filePath;
  lastOutputPath = '';

  console.log('🟡 Received conversion request');
  console.log('📥 Input path:', inputPath);
  console.log('📤 Output path:', outputPath);

  return new Promise((resolve, reject) => {
    const args = [
      '-i', inputPath,
      '-b:v', '500k',
      '-vf', 'scale=480:-2',
      '-y',
      outputPath
    ];

    execFile(ffmpegPath, args, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ FFmpeg execution error:', error.message);
        console.error('🧾 stderr:', stderr);
        resolve({ success: false, error: error.message || stderr });
      } else {
        console.log('✅ FFmpeg finished successfully');
        lastOutputPath = outputPath;
        resolve({ success: true, output: outputPath });
      }
    });
  });
});

ipcMain.on('reveal-file', () => {
  if (lastOutputPath) {
    shell.showItemInFolder(lastOutputPath);
  }
});