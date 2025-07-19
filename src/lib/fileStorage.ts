/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Song } from '../types/song';
import { saveSongs as saveToLocalStorage } from './songStorage';
import { logger } from './logger';

// File storage configuration
const STORAGE_CONFIG = {
  maxSongsPerDevice: 100,        // Maximum songs to keep on disk
  maxFileAgeDays: 30,            // Delete files older than 30 days if over limit
  compressionEnabled: true,       // Enable JSON compression
  autoCleanupEnabled: true        // Automatically clean old files
};

// Check if we're in Electron environment
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI;
};

// Check if we're in browser environment with File System Access API
const hasFileSystemAccess = () => {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
};

// Get storage directory path (Electron only)
const getStorageDirectory = async (): Promise<string | null> => {
  if (isElectron() && window.electronAPI?.getStorageDir) {
    return await window.electronAPI.getStorageDir();
  }
  return null;
};

// Compress JSON data
const compressJSON = (data: Record<string, unknown>): string => {
  if (!STORAGE_CONFIG.compressionEnabled) {
    return JSON.stringify(data, null, 2);
  }
  
  // Simple compression: remove unnecessary whitespace
  return JSON.stringify(data);
};

// Decompress JSON data
const decompressJSON = (data: string): Record<string, unknown> => {
  return JSON.parse(data);
};

// Generate filename for a song
const getSongFileName = (song: Song): string => {
  const sanitizedName = song.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  return `song_${song.id}_${sanitizedName}.json`;
};

// Save individual song to file (Electron)
const saveSongToFileElectron = async (song: Song): Promise<boolean> => {
  try {
    if (!isElectron() || !window.electronAPI?.saveFile) {
      return false;
    }

    const storageDir = await getStorageDirectory();
    if (!storageDir) return false;

    // Helper function to safely convert to ISO string
    const safeToISOString = (date: Date | string): string => {
      if (typeof date === 'string') {
        return date; // Already a string, return as-is
      }
      if (date instanceof Date) {
        return date.toISOString();
      }
      // Fallback for any other type
      return new Date(date).toISOString();
    };

    const fileName = getSongFileName(song);
    const filePath = `${storageDir}/${fileName}`;
    
    // Safely serialize the song data
    const songData = {
      ...song,
      progressions: song.progressions.map(p => ({
        ...p,
        createdAt: safeToISOString(p.createdAt),
        updatedAt: safeToISOString(p.updatedAt)
      })),
      createdAt: safeToISOString(song.createdAt),
      updatedAt: safeToISOString(song.updatedAt),
      savedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const jsonData = compressJSON(songData);

    const success = await window.electronAPI.saveFile(filePath, jsonData);
    if (success) {
      logger.debug(`Song "${song.name}" saved to file: ${fileName}`);
    }
    return success;
  } catch (error) {
    logger.error('Error saving song to file:', error);
    return false;
  }
};

// Save individual song to browser storage
const saveSongToFileWeb = async (song: Song, directoryHandle?: FileSystemDirectoryHandle): Promise<boolean> => {
  try {
    // Helper function to safely convert to ISO string
    const safeToISOString = (date: Date | string): string => {
      if (typeof date === 'string') {
        return date; // Already a string, return as-is
      }
      if (date instanceof Date) {
        return date.toISOString();
      }
      // Fallback for any other type
      return new Date(date).toISOString();
    };

    const songData = {
      ...song,
      progressions: song.progressions.map(p => ({
        ...p,
        createdAt: safeToISOString(p.createdAt),
        updatedAt: safeToISOString(p.updatedAt)
      })),
      createdAt: safeToISOString(song.createdAt),
      updatedAt: safeToISOString(song.updatedAt),
      savedAt: new Date().toISOString(),
      version: '1.0'
    };

    if (!directoryHandle) {
      // Use localStorage as fallback for web
      const jsonData = compressJSON(songData);
      
      localStorage.setItem(`chordbook-file-${song.id}`, jsonData);
      logger.debug(`Song "${song.name}" saved to localStorage file cache`);
      return true;
    }

    // Use File System Access API if available
    if (hasFileSystemAccess()) {
      const fileName = getSongFileName(song);
      const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      
      const jsonData = compressJSON(songData);
      
      await writable.write(jsonData);
      await writable.close();
      
      logger.debug(`Song "${song.name}" saved to file: ${fileName}`);
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Error saving song to web file:', error);
    return false;
  }
};

// Load individual song from file (Electron)
const loadSongFromFileElectron = async (songId: string): Promise<Song | null> => {
  try {
    if (!isElectron() || !window.electronAPI?.readFile) {
      return null;
    }

    const storageDir = await getStorageDirectory();
    if (!storageDir) return null;

    // Find file by song ID (we need to list files and match)
    const files = await window.electronAPI.listFiles(storageDir);
    const songFile = files?.find((file: string) => file.startsWith(`song_${songId}_`));
    
    if (!songFile) return null;

    const filePath = `${storageDir}/${songFile}`;
    const fileContent = await window.electronAPI.readFile(filePath);
    
    if (!fileContent) return null;

    const songData = decompressJSON(fileContent);
    
    // Convert date strings back to Date objects
    const rawData = songData as any;
    const song: Song = {
      ...rawData,
      createdAt: new Date(rawData.createdAt),
      updatedAt: new Date(rawData.updatedAt),
      progressions: rawData.progressions.map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt)
      }))
    };
    
    logger.debug(`Song "${song.name}" loaded from file: ${songFile}`);
    return song;
  } catch (error) {
    logger.error('Error loading song from file:', error);
    return null;
  }
};

// Cleanup old song files with sequential processing
const cleanupOldFiles = async (): Promise<void> => {
  if (!STORAGE_CONFIG.autoCleanupEnabled) return;

  try {
    if (isElectron() && window.electronAPI?.listFiles && window.electronAPI?.deleteFile) {
      const storageDir = await getStorageDirectory();
      if (!storageDir) return;

      const files = await window.electronAPI.listFiles(storageDir);
      if (!files || files.length <= STORAGE_CONFIG.maxSongsPerDevice) return;

      // Get file stats sequentially to avoid EMFILE errors
      const fileStats = [];
      for (const file of files) {
        try {
          const stats = window.electronAPI ? await window.electronAPI.getFileStats(`${storageDir}/${file}`) : null;
          if (stats !== null) {
            fileStats.push({ file, stats });
          }
          
          // Small delay between stat calls
          await new Promise(resolve => setTimeout(resolve, 2));
        } catch (error) {
          logger.error(`Error getting stats for ${file}:`, error);
        }
      }

      const sortedFiles = fileStats.sort((a, b) => {
        if (!a.stats || !b.stats) return 0;
        return new Date(a.stats.mtime).getTime() - new Date(b.stats.mtime).getTime();
      }); // Oldest first

      const filesToDelete = sortedFiles.slice(0, sortedFiles.length - STORAGE_CONFIG.maxSongsPerDevice);
      
      // Delete files sequentially to avoid EMFILE errors
      for (const { file } of filesToDelete) {
        if (window.electronAPI) {
          try {
            const success = await window.electronAPI.deleteFile(`${storageDir}/${file}`);
            if (success) {
              logger.debug(`Cleaned up old song file: ${file}`);
            }
            
            // Small delay between deletions
            await new Promise(resolve => setTimeout(resolve, 5));
          } catch (error) {
            logger.error(`Error deleting file ${file}:`, error);
          }
        }
      }
    } else {
      // Web cleanup - remove old localStorage file entries
      const keys = Object.keys(localStorage).filter(key => key.startsWith('chordbook-file-'));
      
      if (keys.length <= STORAGE_CONFIG.maxSongsPerDevice) return;

      const fileEntries = keys.map(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          return { key, savedAt: new Date(data.savedAt || 0) };
        } catch {
          return { key, savedAt: new Date(0) };
        }
      });

      const sortedEntries = fileEntries.sort((a, b) => a.savedAt.getTime() - b.savedAt.getTime());
      const entriesToDelete = sortedEntries.slice(0, sortedEntries.length - STORAGE_CONFIG.maxSongsPerDevice);

      entriesToDelete.forEach(({ key }) => {
        localStorage.removeItem(key);
        logger.debug(`Cleaned up old song file cache: ${key}`);
      });
    }
  } catch (error) {
    logger.error('Error during file cleanup:', error);
  }
};

// Save all songs to individual files with sequential processing to prevent EMFILE errors
export const saveSongsToFiles = async (songs: Song[]): Promise<void> => {
  try {
    // Also save to localStorage for compatibility
    saveToLocalStorage(songs);

    // Process songs sequentially to prevent file descriptor exhaustion
    let successCount = 0;
    
    for (const song of songs) {
      try {
        let result = false;
        if (isElectron()) {
          result = await saveSongToFileElectron(song);
        } else {
          result = await saveSongToFileWeb(song);
        }
        
        if (result) {
          successCount++;
        }
        
        // Small delay between saves to prevent overwhelming the system
        if (songs.length > 10) {
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      } catch (error) {
        logger.error(`Error saving individual song ${song.name}:`, error);
      }
    }
    
    logger.infoThrottled('batch-save', `Saved ${successCount}/${songs.length} songs to individual files`);

    // Cleanup old files if needed
    if (songs.length > 0) {
      await cleanupOldFiles();
    }
  } catch (error) {
    logger.error('Error saving songs to files:', error);
  }
};

// Load all songs from files (with fallback to localStorage)
export const loadSongsFromFiles = async (): Promise<Song[]> => {
  try {
    const songs: Song[] = [];

    if (isElectron() && window.electronAPI?.listFiles) {
      const storageDir = await getStorageDirectory();
      if (storageDir) {
        const files = await window.electronAPI.listFiles(storageDir);
        const songFiles = files?.filter((file: string) => file.startsWith('song_') && file.endsWith('.json')) || [];

        for (const file of songFiles) {
          const songId = file.split('_')[1]; // Extract song ID from filename
          const song = await loadSongFromFileElectron(songId);
          if (song) {
            songs.push(song);
          }
        }
      }
    } else {
      // Web version - load from localStorage file cache
      const keys = Object.keys(localStorage).filter(key => key.startsWith('chordbook-file-'));
      
      for (const key of keys) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const songData = decompressJSON(data);
            const rawData = songData as any;
            const song: Song = {
              ...rawData,
              createdAt: new Date(rawData.createdAt),
              updatedAt: new Date(rawData.updatedAt),
              progressions: rawData.progressions.map((p: any) => ({
                ...p,
                createdAt: new Date(p.createdAt),
                updatedAt: new Date(p.updatedAt)
              }))
            };
            songs.push(song);
          }
        } catch (error) {
          console.error(`Error loading song from ${key}:`, error);
        }
      }
    }

    logger.infoThrottled('batch-load', `Loaded ${songs.length} songs from individual files`);
    return songs;
  } catch (error) {
    logger.error('Error loading songs from files:', error);
    return [];
  }
};

// Delete individual song file
export const deleteSongFile = async (song: Song): Promise<boolean> => {
  try {
    if (isElectron() && window.electronAPI?.deleteFile) {
      const storageDir = await getStorageDirectory();
      if (storageDir) {
        const fileName = getSongFileName(song);
        const filePath = `${storageDir}/${fileName}`;
        const success = await window.electronAPI.deleteFile(filePath);
        if (success) {
          logger.debug(`Deleted song file: ${fileName}`);
        }
        return success;
      }
    } else {
      // Web version - remove from localStorage file cache
      const key = `chordbook-file-${song.id}`;
      localStorage.removeItem(key);
      logger.debug(`Deleted song file cache: ${key}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Error deleting song file:', error);
    return false;
  }
};

// Get storage statistics with sequential file processing
export const getStorageStats = async (): Promise<{
  totalSongs: number;
  totalSizeKB: number;
  oldestFile?: Date;
  newestFile?: Date;
}> => {
  try {
    if (isElectron() && window.electronAPI?.listFiles && window.electronAPI?.getFileStats) {
      const storageDir = await getStorageDirectory();
      if (!storageDir) {
        return { totalSongs: 0, totalSizeKB: 0 };
      }

      const files = await window.electronAPI.listFiles(storageDir);
      const songFiles = files?.filter((file: string) => file.startsWith('song_') && file.endsWith('.json')) || [];
      
      let totalSize = 0;
      let oldestDate: Date | undefined;
      let newestDate: Date | undefined;

      // Process files sequentially to avoid EMFILE errors
      for (const file of songFiles) {
        try {
          const stats = await window.electronAPI.getFileStats(`${storageDir}/${file}`);
          if (stats) {
            totalSize += stats.size;
            const fileDate = new Date(stats.mtime);
            
            if (!oldestDate || fileDate < oldestDate) {
              oldestDate = fileDate;
            }
            if (!newestDate || fileDate > newestDate) {
              newestDate = fileDate;
            }
          }
          
          // Small delay between stat calls
          await new Promise(resolve => setTimeout(resolve, 2));
        } catch (error) {
          logger.error(`Error getting stats for ${file}:`, error);
        }
      }

      return {
        totalSongs: songFiles.length,
        totalSizeKB: Math.round(totalSize / 1024),
        oldestFile: oldestDate,
        newestFile: newestDate
      };
    } else {
      // Web version - check localStorage
      const keys = Object.keys(localStorage).filter(key => key.startsWith('chordbook-file-'));
      let totalSize = 0;

      keys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          totalSize += new Blob([data]).size;
        }
      });

      return {
        totalSongs: keys.length,
        totalSizeKB: Math.round(totalSize / 1024)
      };
    }
  } catch (error) {
    logger.error('Error getting storage stats:', error);
    return { totalSongs: 0, totalSizeKB: 0 };
  }
};
