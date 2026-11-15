# Golden Gate Desktop

A macOS-inspired desktop experience built with React, TypeScript, and Vite. It runs in your browser with a menu bar, Dock, movable app windows, and desktop personalization.

## Features

- Finder, Notes, Safari, Calendar, Terminal, and System Settings apps.
- Window controls for minimizing, maximizing, and closing apps.
- Spotlight app launcher and Control Center.
- Appearance, wallpaper, accent color, and Dock preferences.
- Notes and desktop session state saved locally in your browser.

The desktop and Terminal are browser simulations. Terminal commands operate on a simulated filesystem.

## Getting started

Install a current Node.js LTS release and npm, then run:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite.

## Production build

```sh
npm run build
npm run preview
```

The build checks TypeScript and writes the production site to `dist/`. The preview command serves that build locally.

## Project structure

- [src/](./src/) — React apps, desktop behavior, and styles.
- [public/](./public/) — app icons, wallpapers, and other static assets.
- [package.json](./package.json) — dependencies and development commands.
- [vite.config.ts](./vite.config.ts) — Vite configuration.

## Shortcuts

- **Command/Ctrl + Space** — toggle Spotlight.
- **Command/Ctrl + Option/Alt + D** — toggle Dock auto-hide.
- **Escape** — dismiss open menus and overlays.
