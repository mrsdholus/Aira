# Aira Browser

**Version 0.3.0**

Aira is an experimental desktop browser with a glass-inspired interface,
built with **Electron** and powered by **Chromium**.

> **Status:** Early development. Aira is currently a working prototype
> and is not intended for everyday use yet.

## Features

-   Chromium-based web browsing
-   Multiple tabs
-   Drag-and-drop tab reordering
-   Keyboard-based tab reordering
-   Address bar with search support
-   Back, forward, and reload navigation
-   Custom New Tab page
-   Up to 10 customizable shortcuts
-   Rename and remove shortcuts
-   Glass-inspired dark interface
-   Cross-platform keyboard shortcuts

## Keyboard Shortcuts

  Shortcut                   Action
  -------------------------- -----------------------------------
  `Cmd/Ctrl + T`             Open a new tab
  `Cmd/Ctrl + W`             Close the current tab
  `Cmd/Ctrl + R`             Reload the current page
  `Cmd/Ctrl + L`             Focus the address bar
  `Cmd/Ctrl + [`             Go back
  `Cmd/Ctrl + ]`             Go forward
  `Ctrl + Tab`               Switch between tabs
  `Ctrl + 1...9`             Switch to a specific tab
  `Cmd/Ctrl + Shift + ←/→`   Move the active tab left or right

On macOS, `Cmd` is used as the primary modifier. On Windows and Linux,
`Ctrl` is used where applicable.

## Installation

Aira currently needs to be run from source.

### Requirements

-   Node.js
-   npm

Clone the repository:

``` bash
git clone https://github.com/mrsdholus/Aira.git
cd Aira
```

Install dependencies:

``` bash
npm install
```

Start Aira:

``` bash
npm start
```

## Building

To create a distributable build:

``` bash
npm run dist
```

## Current Limitations

Aira is still an early prototype. Some browser features are incomplete
or not implemented yet.

Expect bugs, unfinished UI elements, and breaking changes between
versions.

## Development

Aira started as a personal experiment to build a browser around an
interface and workflow I wanted to use myself.

The project is also part of my process of learning software development.
AI-assisted coding is used during development, while I continue learning
how the underlying code and architecture work.

Contributions, suggestions, bug reports, and constructive feedback are
welcome.

## License

Aira is licensed under the **GNU General Public License v3.0
(GPL-3.0)**.

See the `LICENSE` file for details.
