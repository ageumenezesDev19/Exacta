# Exacta

Exacta is a **cross-platform desktop application** built with **Tauri**, React, TypeScript, and SCSS. Given a target price, it searches the stock you have for a combination of products that adds up to that exact total.

## ✨ Features

- **Combination Search**: Enter a price and get a set of products from your stock that hits it exactly.
- **Inventory Management**: Add, remove, and import your products from a list.
- **Withdrawn History**: Track what has been taken out, with daily and monthly summaries.
- **Blacklist**: Terms that are kept out of every combination.
- **Ranking**: Products you withdraw rise in the ranking and products you skip fall, and the search uses that to prefer what gets picked.
- **Portuguese and English**: The whole interface, prices included (`R$ 24,90` / `R$ 24.90`).
- **🌙 Dark Mode**: Light and dark themes.
- **Data Persistence**: Your data and preferences are saved locally (`localStorage`). Nothing is sent anywhere.
- **Multiple Profiles**: Separate stocks per profile, with backup and restoration.
- **Desktop Ready**: Powered by Tauri, providing a lightweight native desktop experience.

## 🚀 Technologies

- **Tauri**: Framework for building small, fast binaries for all major desktop platforms.
- **React**: Core UI library.
- **TypeScript**: Static typing for better safety and productivity.
- **Vite**: Build tool and dev server.
- **SCSS**: Style preprocessor with an architecture based on CSS Custom Properties for dynamic theming.
- **i18next**: Interface translation.

## 🛠️ Getting Started

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (required for Tauri)
- Node.js & npm

### Installation

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Run in development (Desktop mode)**:
    ```bash
    npm run tauri dev
    ```

3.  **Build production version**:
    ```bash
    npm run tauri build
    ```

4.  **Run the tests**:
    ```bash
    npm test
    ```

## 🎨 Theme Infrastructure

The application uses a **CSS Custom Properties** (CSS Variables) system defined in `src/styles/_variables.scss`. The theme is controlled via the `data-theme` attribute on the application's root div.

### How to toggle themes
Click the **Dark Mode / Light Mode** button in the application header. Your choice is automatically persisted in the browser/app.

---
*Made by Ageu M. Costa*
