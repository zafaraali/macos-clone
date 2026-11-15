# Golden Gate Desktop

A macOS-inspired desktop experience built with React, TypeScript, and Vite. It runs in your browser with a menu bar, Dock, movable app windows, and desktop personalization.

## Features

- Finder, Notes, Safari, Calendar, TextEdit, Terminal, and System Settings apps.
- TextEdit with browser autosave, multiple documents, text imports, and downloads. Drop text files onto the desktop to open them (2 MB maximum per file).
- Interactive Wi-Fi and battery status panels, including a shared simulated Wi-Fi toggle and a Low Power Mode control that dims the desktop.
- Window controls for minimizing, maximizing, and closing apps.
- Spotlight app launcher and Control Center.
- Appearance, wallpaper, accent color, and Dock preferences.
- Notes and desktop session state saved locally in your browser.
- Shared browser filesystem: create files and folders in Finder or Terminal, edit files in TextEdit, and restore deleted items from Trash. Emptying Trash asks for confirmation before permanent deletion.
- Live desktop icons show the shared Desktop folder. Drag icons to arrange them, drop items onto folders to move them, or drop them onto the Dock's Trash. Icon positions are saved locally.
- Mission Control shows previews of visible windows and includes minimized apps. Open it from the menu bar, Window menu, F3, or Ctrl + Up Arrow.
- Quick Look previews text files and folder contents from Finder or the desktop. Select an item and press Space, or use Finder's Quick Look button. Escape closes the preview; its Open button opens the item in the appropriate app.
- Finder supports file and folder renaming, moving through a destination picker or dragging onto folders/sidebar locations, and sorting by name or file type in ascending or descending order. Folder renames and moves preserve their contents; protected system folders cannot be renamed or moved.
- Spotlight searches apps, file names, paths, and text contents, with an inline preview. Enter opens files in TextEdit and folders in Finder. Items in Trash are excluded.
- Undo the last 30 file renames, moves, moves to Trash, or restores using the on-screen Undo button or Edit menu. Undo preserves subsequent document edits and refuses conflicting paths. History lasts for the current session; reloading or permanently emptying Trash clears it.
- Window snapping: drag a title bar to the left or right edge to tile a window, or to the top edge to maximize. A preview shows the target layout. Drag away or use the green restore button to return to a floating window. Tiling and restore controls are also available in the Window menu; layouts persist across reloads.

The desktop and Terminal are browser simulations. Terminal commands operate on a simulated filesystem.

## Shared files

Finder's main location represents `/Users/zafar`. TextEdit saves new documents to `Documents` and imported text files to `Downloads`. Existing TextEdit documents are copied into the shared filesystem on first use.

Try these commands in the desktop's Terminal:

```sh
write Documents/Hello.txt "Hello from Terminal"
open Documents/Hello.txt
cat Documents/Hello.txt
mkdir Documents/Projects/Demo
rm Documents/Hello.txt
open Trash
```

`rm` moves items to Trash. Restore returns them to their original location; conflicting names must be resolved first. Files stay in this browser's local storage, with no access to your computer's real filesystem.

Create a file in Finder's Desktop folder (or run `write Desktop/Hello.txt "Hello desktop"` in Terminal) to see it on the wallpaper. Double-click a desktop file to edit it, or a folder to browse it. Focus an icon and press Enter to open it; Delete or Backspace moves a file or folder to Trash. Macintosh HD and Shared remain protected shortcuts. Dropping a folder moves its contents too; duplicate names and moving a folder into itself are rejected.

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
- **F3 / Ctrl + Up Arrow** — toggle Mission Control; use arrow keys and Enter to switch apps.
- **Command/Ctrl + S** in TextEdit — download the current document.
- **Space** on a Finder or desktop item — Quick Look.
- **F2** on a Finder item — rename it.
- **Command/Ctrl + Z** outside text fields — undo the last file operation. Text fields retain their normal text undo behavior.
