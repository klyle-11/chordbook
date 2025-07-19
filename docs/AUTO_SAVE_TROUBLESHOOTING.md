# Auto-Save Troubleshooting Guide

## What Causes Frequent Auto-Save Failures?

### 1. **File System Operations in Browser Environment**
- **Problem**: The app tries to save files via Electron APIs even when running in a browser
- **Symptoms**: Consistent failures on every save operation
- **Solution**: ✅ Added environment detection to only attempt file saves in Electron environment

### 2. **localStorage Storage Quota Exceeded**
- **Problem**: Browser localStorage has size limits (typically 5-10MB)
- **Symptoms**: `DOMException` errors, particularly error code 22
- **Solution**: ✅ Added quota handling with automatic cleanup of old song files

### 3. **Complex Data Serialization Issues**
- **Problem**: Date objects and complex nested structures can fail serialization
- **Symptoms**: Intermittent failures when saving specific songs
- **Solution**: ✅ Enhanced `safeToISOString()` helper with better error handling

### 4. **Rate Limiting Interference**
- **Problem**: Capo rate limiter can interfere with save operations
- **Symptoms**: Save operations queued or delayed, causing apparent "failures"
- **Solution**: ✅ Better coordination between rate limiter and auto-save status

## Improvements Made

### Environment-Aware Saving
```typescript
// Only attempt file saves in Electron environment
const isElectronEnv = typeof window !== 'undefined' && window.electronAPI;
if (consecutiveFailures < MAX_CONSECUTIVE_FAILURES && isElectronEnv) {
  // File save operations
} else if (!isElectronEnv) {
  console.log('🌐 Browser environment detected - skipping file save (localStorage only)');
}
```

### Storage Quota Management
```typescript
// Automatic cleanup when storage quota exceeded
if (storageError instanceof DOMException && storageError.code === 22) {
  console.error('🔧 Storage quota exceeded - attempting cleanup');
  // Remove oldest individual song files to make space
  const oldestKeys = keys.slice(0, Math.max(1, keys.length - 10));
  // ... cleanup logic
}
```

### Better Error Messages
- Moved auto-save status from sticky overlay to Backup section
- Clearer error descriptions ("3 consecutive failures detected")
- Better recovery instructions

### Failure Counter Bounds
- Prevents counter from growing beyond MAX_CONSECUTIVE_FAILURES (3)
- Proper reset logic when auto-save is re-enabled

## User Experience Improvements

### Before
- Confusing "93/3 errors detected" message
- Sticky overlay blocking UI
- Frequent false failures in browser environment

### After
- Clear "3 consecutive failures detected" message
- Auto-save status integrated into Backup section
- Smart environment detection prevents false failures
- Automatic storage cleanup when needed

## Monitoring Auto-Save Health

The auto-save status now shows:

1. **🟢 Operational**: Auto-save working normally
2. **🟡 Queued Operations**: Capo changes being processed
3. **🔴 Disabled**: Multiple failures detected, manual reset needed

## When to Reset Auto-Save

Reset auto-save if you see:
- Persistent "Auto-save disabled" message
- Recent changes not being saved
- Storage quota exceeded errors

The reset button will:
- Clear failure counters
- Re-enable auto-save operations  
- Clear capo operation queue
- Restart monitoring

## Prevention Tips

1. **Regular Backups**: Use the backup feature regularly
2. **Storage Management**: Monitor storage usage in the backup section
3. **Environment Awareness**: Understand browser vs. Electron limitations
4. **Gradual Changes**: Avoid rapid bulk operations that might overwhelm the system
