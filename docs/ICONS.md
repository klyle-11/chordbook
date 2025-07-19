# App Icons Documentation

This document describes the app icons used in Chordbook.

## Icon Files

### Primary Icons
- `icon.svg` - Main app icon (512x512 equivalent, scalable)
- `favicon.svg` - Browser favicon (32x32 equivalent)
- `icon-192.svg` - Medium resolution icon for PWA (192x192)
- `icon-48.svg` - Small icon for various uses (48x48)

### PWA Manifest
- `manifest.json` - Progressive Web App manifest with icon definitions

## Icon Design

The Chordbook icon features:
- **Guitar neck and strings**: Representing the chord aspect
- **Musical note**: Representing the musical nature
- **Book pages**: Representing the songbook functionality
- **Blue color scheme**: Consistent with the app's design (#2563eb)
- **Circular background**: Modern app icon style

## Icon Usage

### Browser Tab (Favicon)
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

### App Icon (General)
```html
<link rel="icon" type="image/svg+xml" href="/icon.svg" sizes="any" />
```

### Apple Touch Icon
```html
<link rel="apple-touch-icon" href="/icon.svg" />
```

### PWA Manifest
The `manifest.json` file defines icons for Progressive Web App installation:
- Supports various sizes (16x16 to 512x512)
- Includes maskable icons for Android adaptive icons
- Defines shortcuts for quick actions

## Generating PNG Icons

If you need PNG versions of the icons, you can:

1. Open `icon-generator.html` in a web browser
2. Click the buttons to download PNG versions in various sizes
3. Or use online SVG to PNG converters

## Browser Support

- **Modern browsers**: Use SVG icons natively
- **Older browsers**: Will fall back to default favicon behavior
- **PWA installation**: Uses manifest.json icon definitions
- **iOS Safari**: Uses apple-touch-icon for home screen

## Color Scheme

- Primary: `#2563eb` (Blue 600)
- Guitar wood: `#8B4513` (Saddle Brown) and `#D2691E` (Peru)
- Accent: `#f0f9ff` to `#dbeafe` (Blue 50 to Blue 100 gradient)
- Text/Details: `#444`, `#6c757d` (Gray tones)

The icons are designed to be recognizable at any size and work well on both light and dark backgrounds.
