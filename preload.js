const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  convertVideo: async (inputPath, outputPath) => {
    return await ipcRenderer.invoke('convert-video', inputPath, outputPath);
  },
  revealFile: () => ipcRenderer.send('reveal-file')
});
