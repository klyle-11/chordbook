# Guitar Chord Map

An Electron-based guitar chord mapping application built with React, TypeScript, and Vite. This app provides an interactive way to explore guitar chords, chord progressions, and music theory concepts.

## Features

- **Interactive Chord Visualization**: Visual representation of guitar chords on a fretboard
- **Music Theory Integration**: Powered by @tonaljs/tonal for accurate chord calculations
- **Modern UI**: Built with Tailwind CSS for a responsive and beautiful interface
- **Cross-Platform**: Runs as a desktop application on macOS, Windows, and Linux
- **Hot Module Replacement**: Fast development with Vite's HMR

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

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Desktop App**: Electron
- **Build Tool**: Vite
- **Music Theory**: @tonaljs/tonal
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
