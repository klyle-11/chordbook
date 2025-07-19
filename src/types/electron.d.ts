// Global type declarations for Electron APIs

export interface ElectronAPI {
  // File operations
  saveFile: (filePath: string, content: string) => Promise<boolean>;
  readFile: (filePath: string) => Promise<string | null>;
  deleteFile: (filePath: string) => Promise<boolean>;
  listFiles: (dirPath: string) => Promise<string[] | null>;
  getFileStats: (filePath: string) => Promise<{ size: number; mtime: string } | null>;
  
  // Directory operations
  getStorageDir: () => Promise<string>;
  
  // App info
  platform: string;
  versions: NodeJS.ProcessVersions;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
