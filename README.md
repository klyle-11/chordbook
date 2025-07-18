# Guitar Chord Progression App

An Electron-based guitar chord progression application built with React, TypeScript, and Vite. This app provides an interactive way to create, manage, and play chord progressions with visual fretboard representations and audio playback.

## Features

- **Interactive Chord Visualization**: 24-fret guitar fretboard with accurate progressive spacing
- **Audio Playback**: Click any note to hear it played - Web Audio API generates tones
- **Drag & Drop**: Reorder chords in progressions with smooth animations
- **Auto-Save**: Progressions automatically save with timestamps
- **Volume Control**: Floating volume slider with transparency effects
- **Music Theory Integration**: Powered by @tonaljs/tonal for accurate chord calculations
- **Modern UI**: Light theme built with Tailwind CSS v4
- **Cross-Platform**: Runs as a desktop application on macOS, Windows, and Linux

## Audio Features

- **Note Playback**: Click any fret marker to play the corresponding note
- **Smooth Audio**: Fade-in/fade-out effects for pleasant listening
- **Volume Control**: Floating volume slider that follows scroll
- **Transparency**: Volume control is semi-transparent when not in use

## Visual Features

- **24-Fret Fretboard**: Extended range with mathematically accurate fret spacing
- **Smart Markers**: Show fret numbers by default, note names on hover
- **Color Coding**: Green for open strings, orange for fretted notes
- **Progressive Spacing**: Realistic fret spacing that gets narrower up the neck

## Development

### Prerequisites

- Node.js (v20.12.0 or higher)
- npm

### Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Run the Electron app in development mode:
   ```bash
   npm run electron-dev
   ```

### Available Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build
- `npm run electron` - Run the Electron app
- `npm run electron-dev` - Run Electron in development mode with hot reload
- `npm run electron-build` - Build the Electron app for distribution
- `npm run lint` - Run ESLint

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **Desktop App**: Electron
- **Build Tool**: Vite
- **Music Theory**: @tonaljs/tonal
- **Drag & Drop**: @dnd-kit (React 19 compatible)
- **Audio**: Web Audio API
- **Linting**: ESLint

## Building for Distribution

To build the application for distribution:

```bash
npm run electron-build
```

This will create distributables in the `dist-electron` directory for your current platform.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request
