const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations for song storage
  saveFile: (filePath, content) => ipcRenderer.invoke('file:save', filePath, content),
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  deleteFile: (filePath) => ipcRenderer.invoke('file:delete', filePath),
  listFiles: (dirPath) => ipcRenderer.invoke('file:list', dirPath),
  getFileStats: (filePath) => ipcRenderer.invoke('file:stats', filePath),
  
  // Storage directory
  getStorageDir: () => ipcRenderer.invoke('app:getStorageDir'),
  
  // Example: File dialog operations
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFileDialog: (content) => ipcRenderer.invoke('dialog:saveFileDialog', content),
  
  // Example: App info
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  
  // Example: Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  
  // Example: Theme handling
  setTheme: (theme) => ipcRenderer.invoke('theme:set', theme),
  getTheme: () => ipcRenderer.invoke('theme:get'),
  
  // Listeners for events from main process
  onThemeChanged: (callback) => ipcRenderer.on('theme:changed', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Example: Expose a simple API for the chord book app
contextBridge.exposeInMainWorld('chordBookAPI', {
  // Example: File operations specific to chord books
  loadChordBook: (filePath) => ipcRenderer.invoke('chordbook:load', filePath),
  saveChordBook: (chordBook) => ipcRenderer.invoke('chordbook:save', chordBook),
  exportChordBook: (chordBook, format) => ipcRenderer.invoke('chordbook:export', chordBook, format),
  
  // Example: Recent files
  getRecentFiles: () => ipcRenderer.invoke('chordbook:getRecentFiles'),
  addRecentFile: (filePath) => ipcRenderer.invoke('chordbook:addRecentFile', filePath),
  
  // Example: Chord library operations
  getChordLibrary: () => ipcRenderer.invoke('chordlibrary:get'),
  addChord: (chord) => ipcRenderer.invoke('chordlibrary:add', chord),
  updateChord: (chordId, chord) => ipcRenderer.invoke('chordlibrary:update', chordId, chord),
  deleteChord: (chordId) => ipcRenderer.invoke('chordlibrary:delete', chordId)
});

// Security: Only expose what's necessary and ensure it's safe
console.log('Preload script loaded successfully');
