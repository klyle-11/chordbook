const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const isDev = process.env.NODE_ENV === 'development';

// Enable V8 flags for better stability
app.commandLine.appendSwitch('--js-flags', '--expose-gc --max-old-space-size=4096');
app.commandLine.appendSwitch('--disable-dev-shm-usage');
app.commandLine.appendSwitch('--no-sandbox');

// Storage directory for song files
const getStorageDirectory = () => {
  const userDataPath = app.getPath('userData');
  const storageDir = path.join(userDataPath, 'songs');
  return storageDir;
};

// Ensure storage directory exists
const ensureStorageDirectory = async () => {
  const storageDir = getStorageDirectory();
  try {
    await fs.access(storageDir);
  } catch {
    await fs.mkdir(storageDir, { recursive: true });
    console.log('Created storage directory:', storageDir);
  }
  return storageDir;
};

let mainWindow;

// File operation queue to prevent EMFILE errors
const fileOperationQueue = [];
let isProcessingQueue = false;
const MAX_CONCURRENT_FILES = 3; // Reduced from 5 for more stability
let operationCount = 0;

// Force garbage collection periodically
const forceGC = () => {
  if (global.gc) {
    try {
      global.gc();
      console.log('🧹 Forced garbage collection');
    } catch (err) {
      console.warn('GC not available:', err.message);
    }
  }
};

const processFileQueue = async () => {
  if (isProcessingQueue || fileOperationQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (fileOperationQueue.length > 0) {
    const batch = fileOperationQueue.splice(0, MAX_CONCURRENT_FILES);
    await Promise.allSettled(batch.map(operation => operation()));
    
    // Trigger GC every 10 operations
    operationCount += batch.length;
    if (operationCount >= 10) {
      forceGC();
      operationCount = 0;
    }
    
    // Longer delay between batches for stability
    if (fileOperationQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  isProcessingQueue = false;
};

const queueFileOperation = (operation) => {
  return new Promise((resolve, reject) => {
    fileOperationQueue.push(async () => {
      try {
        const result = await operation();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    
    // Start processing queue if not already processing
    processFileQueue().catch(console.error);
  });
};

// Retry with exponential backoff for EMFILE errors
const retryWithBackoff = async (operation, maxRetries = 3) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (error.code === 'EMFILE' && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 100; // 100ms, 200ms, 400ms
        console.warn(`EMFILE error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        forceGC(); // Try to free up resources
        continue;
      }
      throw error;
    }
  }
};

// IPC Handlers for file operations with concurrency control
ipcMain.handle('file:save', async (event, filePath, content) => {
  return queueFileOperation(() => retryWithBackoff(async () => {
    await ensureStorageDirectory();
    await fs.writeFile(filePath, content, 'utf8');
    return true;
  }));
});

ipcMain.handle('file:read', async (event, filePath) => {
  return queueFileOperation(() => retryWithBackoff(async () => {
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  }));
});

ipcMain.handle('file:delete', async (event, filePath) => {
  return queueFileOperation(() => retryWithBackoff(async () => {
    await fs.unlink(filePath);
    return true;
  }));
});

ipcMain.handle('file:list', async (event, dirPath) => {
  return queueFileOperation(() => retryWithBackoff(async () => {
    const files = await fs.readdir(dirPath);
    return files;
  }));
});

ipcMain.handle('file:stats', async (event, filePath) => {
  return queueFileOperation(() => retryWithBackoff(async () => {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      mtime: stats.mtime.toISOString()
    };
  }));
});

ipcMain.handle('app:getStorageDir', async () => {
  return await ensureStorageDirectory();
});

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 400,
    minWidth: 800,
    minHeight: 400,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.cjs')
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Optional: add your app icon
    titleBarStyle: 'default',
    show: false // Don't show until ready
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');  // Updated to match Vite's port
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));  // Fixed path for production
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // macOS specific: Re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Set up menu
  createMenu();

  // Clean up resources periodically
  const cleanupInterval = setInterval(() => {
    if (operationCount > 0) {
      console.log(`📊 Processed ${operationCount} file operations, queue length: ${fileOperationQueue.length}`);
    }
    forceGC();
  }, 30000); // Every 30 seconds

  mainWindow.on('closed', () => {
    clearInterval(cleanupInterval);
    forceGC();
    mainWindow = null;
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // Force final cleanup
  forceGC();
  
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up on app quit
app.on('before-quit', () => {
  console.log('🧹 App quitting, forcing final cleanup...');
  forceGC();
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    console.log('Prevented new window creation for:', navigationUrl);
  });
});

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            // Add your new file logic here
            console.log('New file requested');
          }
        },
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            // Add your open file logic here
            console.log('Open file requested');
          }
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            // Add your save logic here
            console.log('Save requested');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Toggle DevTools', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: 'Close', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About ChordBook',
          click: () => {
            // Add your about dialog here
            console.log('About ChordBook');
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { label: 'About ' + app.getName(), role: 'about' },
        { type: 'separator' },
        { label: 'Services', role: 'services', submenu: [] },
        { type: 'separator' },
        { label: 'Hide ' + app.getName(), accelerator: 'Command+H', role: 'hide' },
        { label: 'Hide Others', accelerator: 'Command+Alt+H', role: 'hideothers' },
        { label: 'Show All', role: 'unhide' },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'Command+Q', click: () => app.quit() }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
