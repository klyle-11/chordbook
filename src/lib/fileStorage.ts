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

// Save all songs to a single consolidated JSON file (Electron)
const saveAllSongsToFile = async (songs: Song[]): Promise<boolean> => {
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

    const fileName = 'chordbook-songs-consolidated.json';
    const filePath = `${storageDir}/${fileName}`;
    
    // Create consolidated data structure with metadata
    const consolidatedData = {
      version: '2.0',
      saveType: 'consolidated',
      savedAt: new Date().toISOString(),
      songCount: songs.length,
      totalProgressions: songs.reduce((total, song) => total + (song.progressions?.length || 0), 0),
      songs: songs.map(song => ({
        ...song,
        progressions: song.progressions.map(p => ({
          ...p,
          createdAt: safeToISOString(p.createdAt),
          updatedAt: safeToISOString(p.updatedAt)
        })),
        createdAt: safeToISOString(song.createdAt),
        updatedAt: safeToISOString(song.updatedAt)
      }))
    };
    
    const jsonData = compressJSON(consolidatedData);

    const success = await window.electronAPI.saveFile(filePath, jsonData);
    if (success) {
      logger.debug(`All songs saved to consolidated file: ${fileName} (${songs.length} songs)`);
      
      // Clean up old individual song files after successful consolidated save
      await cleanupIndividualSongFiles(songs);
    }
    return success;
  } catch (error) {
    logger.error('Error saving songs to consolidated file:', error);
    return false;
  }
};

// Clean up old individual song files after consolidation
const cleanupIndividualSongFiles = async (songs: Song[]): Promise<void> => {
  try {
    if (!isElectron() || !window.electronAPI?.deleteFile) {
      return;
    }

    const storageDir = await getStorageDirectory();
    if (!storageDir) return;

    // Delete old individual song files
    for (const song of songs) {
      try {
        const oldFileName = getSongFileName(song);
        const oldFilePath = `${storageDir}/${oldFileName}`;
        await window.electronAPI.deleteFile(oldFilePath);
        logger.debug(`Cleaned up old song file: ${oldFileName}`);
      } catch (error) {
        // Ignore cleanup errors for individual files
        logger.debug(`Could not clean up old song file for ${song.name}:`, error);
      }
    }
  } catch (error) {
    logger.error('Error during individual song file cleanup:', error);
  }
};

// Save all songs to consolidated web storage
const saveSongsToFileWeb = async (songs: Song[]): Promise<boolean> => {
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

    // Create consolidated data structure for web storage
    const consolidatedData = {
      version: '2.0',
      saveType: 'consolidated-web',
      savedAt: new Date().toISOString(),
      songCount: songs.length,
      totalProgressions: songs.reduce((total, song) => total + (song.progressions?.length || 0), 0),
      songs: songs.map(song => ({
        ...song,
        progressions: song.progressions.map(p => ({
          ...p,
          createdAt: safeToISOString(p.createdAt),
          updatedAt: safeToISOString(p.updatedAt)
        })),
        createdAt: safeToISOString(song.createdAt),
        updatedAt: safeToISOString(song.updatedAt)
      }))
    };

    const jsonData = compressJSON(consolidatedData);
    
    // Save to localStorage with consolidated key
    localStorage.setItem('chordbook-songs-consolidated-file', jsonData);
    
    // Clean up old individual file entries from localStorage
    const oldKeys = Object.keys(localStorage).filter(key => key.startsWith('chordbook-file-'));
    oldKeys.forEach(key => localStorage.removeItem(key));
    
    logger.debug(`All songs saved to consolidated web storage (${songs.length} songs)`);
    return true;
  } catch (error) {
    logger.error('Error saving songs to consolidated web storage:', error);
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

    // Use consolidated file approach for better storage efficiency
    const success = await saveAllSongsToFile(songs);
    
    if (success) {
      logger.infoThrottled('consolidated-save', `Saved ${songs.length} songs to consolidated file`);
    } else {
      // Fallback to web storage if Electron save fails
      if (!isElectron()) {
        await saveSongsToFileWeb(songs);
        logger.infoThrottled('web-save', `Saved ${songs.length} songs to web storage`);
      } else {
        throw new Error('Failed to save songs to consolidated file');
      }
    }

    // Cleanup old files if needed (but only after successful save)
    if (success && songs.length > 0) {
      await cleanupOldFiles();
    }
  } catch (error) {
    logger.error('Error saving songs to files:', error);
    throw error; // Re-throw to trigger failure handling in calling code
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
        
        // First try to load from consolidated file
        const consolidatedFile = files?.find((file: string) => file === 'chordbook-songs-consolidated.json');
        
        if (consolidatedFile) {
          try {
            const filePath = `${storageDir}/${consolidatedFile}`;
            const fileContent = await window.electronAPI.readFile(filePath);
            
            if (fileContent) {
              const consolidatedData = decompressJSON(fileContent) as any;
              
              // Handle consolidated format
              if (consolidatedData.songs && Array.isArray(consolidatedData.songs)) {
                for (const songData of consolidatedData.songs) {
                  const song: Song = {
                    ...songData,
                    createdAt: new Date(songData.createdAt),
                    updatedAt: new Date(songData.updatedAt),
                    progressions: songData.progressions.map((p: any) => ({
                      ...p,
                      createdAt: new Date(p.createdAt),
                      updatedAt: new Date(p.updatedAt)
                    }))
                  };
                  songs.push(song);
                }
                
                logger.debug(`Loaded ${songs.length} songs from consolidated file`);
                return songs; // Return early if consolidated load successful
              }
            }
          } catch (error) {
            logger.error('Error loading from consolidated file, trying individual files:', error);
          }
        }
        
        // Fallback to individual files if consolidated file doesn't exist or fails
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
      // Web version - first try consolidated storage, then fallback to individual files
      try {
        const consolidatedData = localStorage.getItem('chordbook-songs-consolidated-file');
        
        if (consolidatedData) {
          const parsedData = decompressJSON(consolidatedData) as any;
          
          if (parsedData.songs && Array.isArray(parsedData.songs)) {
            for (const songData of parsedData.songs) {
              const song: Song = {
                ...songData,
                createdAt: new Date(songData.createdAt),
                updatedAt: new Date(songData.updatedAt),
                progressions: songData.progressions.map((p: any) => ({
                  ...p,
                  createdAt: new Date(p.createdAt),
                  updatedAt: new Date(p.updatedAt)
                }))
              };
              songs.push(song);
            }
            
            logger.debug(`Loaded ${songs.length} songs from consolidated web storage`);
            return songs; // Return early if consolidated load successful
          }
        }
      } catch (error) {
        logger.error('Error loading from consolidated web storage, trying individual files:', error);
      }
      
      // Fallback to individual localStorage files
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
