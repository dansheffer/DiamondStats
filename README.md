# Diamond Stats

A modern Expo React Native app for MLB player analytics and value projections.

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Xcode) or Android Emulator

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npm start
```

### Run on Device

```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

Or press `i` for iOS, `a` for Android, or `w` for web after running `npm start`.

## Project Structure

```
DiamondStats/
├── app/                    # Expo Router file-based routing
│   ├── index.tsx          # Home screen
│   └── src/
│       ├── components/    # React components
│       └── theme/         # Design system
├── assets/                # Images and static files
└── docs/                  # Documentation
```

## Features

- 📊 Player WAR statistics and value cards
- 🔮 Season projection system
- 🎨 Mets-themed design system
- 📸 Live MLB headshot integration
- 📱 Cross-platform (iOS, Android, Web)

## Documentation

See [docs/DIAMOND_STATS_SPEC.md](docs/DIAMOND_STATS_SPEC.md) for complete documentation.

## Next Steps

After installation:
1. Add a placeholder image at `assets/player-placeholder.png`
2. Update `app/index.tsx` to use the ValueCard component
3. See `app/EXAMPLE_USAGE.tsx` for usage examples

## Tech Stack

- **Framework**: Expo SDK 51
- **Language**: TypeScript
- **Navigation**: Expo Router
- **UI**: React Native

## License

MIT
