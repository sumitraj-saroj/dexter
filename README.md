# Dexter 📱🔴

A modern, offline-first React Native & Expo Pokédex featuring dynamic Material-You-style per-type theming, evolution chains, audio cries playback, team builder, type matchup matrix, silhouette quiz mode, and Pokémon of the Day.

> [!IMPORTANT]
> **Disclaimer:**
> This is an unofficial, non-commercial fan project built for personal/educational purposes. It is not affiliated with, endorsed by, or sponsored by Nintendo, Game Freak, or The Pokémon Company. Pokémon and Pokémon character names are trademarks of Nintendo. All Pokémon data and imagery are sourced from [PokeAPI](https://pokeapi.co).

---

## 📸 Screenshots

*(Add your screenshots here)*

| Dexter Home | Detail View | Type Matchups | Team Builder |
| :---: | :---: | :---: | :---: |
| *[Screenshot 1]* | *[Screenshot 2]* | *[Screenshot 3]* | *[Screenshot 4]* |

---

## 🛠️ Tech Stack

- **Framework**: [Expo](https://expo.dev) (React Native) with [Expo Router](https://docs.expo.dev/router/introduction/) (File-based Routing)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) (Offline local SQLite database)
- **UI & Animations**: Custom Material Design 3 token engine powered by [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- **Audio & Haptics**: [expo-av](https://docs.expo.dev/versions/latest/sdk/av/) (Audio cry playback) & [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/)
- **Data Source**: [PokeAPI](https://pokeapi.co/) REST API v2

---

## ✨ Features

- 🔍 **Search & Filter**: Fast real-time search by name/ID, generation filter (Gen 1-9), primary/secondary type filter, and sorting.
- 🎨 **Dynamic Material-You-Style Theming**: Color palette adapts seamlessly based on the primary and secondary Pokémon types with smooth animated transitions.
- 🧬 **Evolution Chains**: Interactive visual evolution tree showing evolution conditions (level up, items, trade, happiness).
- ✨ **Shiny Toggle**: Switch between default and shiny artwork / sprites instantly.
- ⚔️ **Type Matchup Matrix**: Comprehensive defensive vulnerability calculator highlighting 0x, 0.25x, 0.5x, 2x, and 4x type multipliers.
- 🔊 **Audio Cries Playback**: Native high-definition audio playback for official Pokémon cries.
- 🛡️ **Team Builder**: Assemble, edit, and analyze 6-Pokémon rosters with full team coverage feedback.
- ⚖️ **Pokémon Comparison**: Side-by-side stat breakdown and visual comparison.
- ❓ **Silhouette Quiz Mode**: Fun interactive guessing game with streak tracking, high score records, and dynamic hints.
- 🌟 **Pokémon of the Day**: Featured daily Pokémon with deterministic local caching.
- ⚡ **Offline-First Sync**: Local SQLite sync layer for instant loading and full offline capability.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or `yarn` / `pnpm`
- [Expo Go](https://expo.dev/go) app on your mobile device, or iOS Simulator / Android Emulator

### Installation & Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/dexter.git
   cd dexter
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npx expo start
   ```

4. **Run on target environment:**
   - Scan the QR code with **Expo Go** (Android) or **Camera app** (iOS).
   - Press `a` for Android Emulator or `i` for iOS Simulator.

---

## 📄 License & Asset Notice

This project is open-source and available under the [MIT License](LICENSE).

> **Note on Pokémon Assets:**
> The MIT License applies **exclusively to the original code** written for this project. All Pokémon names, images, sprites, audio cries, and related data remain the property and trademarks of **Nintendo, Game Freak, and The Pokémon Company**.

---

## 🙏 Attribution

Data and media assets are provided by [PokeAPI](https://pokeapi.co). Huge thanks to the PokeAPI team and contributors for maintaining a fantastic open REST API for the Pokémon community!
