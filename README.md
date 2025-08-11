# Strudel Obsidian Plugin

An Obsidian plugin that embeds the [Strudel](https://strudel.cc/) live coding environment directly in your notes. Transform your markdown code blocks into interactive music programming environments!

## Features

- **Interactive Code Blocks**: Transform ````strudel` code blocks into live coding environments
- **Play/Stop Controls**: Simple toggle button for each Strudel block
- **Comprehensive Settings**: Customize font size, family, theme, line wrapping, autocompletion, and more
- **Multiple Themes**: Choose from various editor themes including Dracula, Monokai, Nord, and Material Dark
- **Audio Integration**: Built-in audio synthesis with drum machines, piano sounds, and more sample libraries

## Usage

Simply create a code block with the `strudel` language identifier:

````markdown
```strudel
// Basic drum pattern
stack(
  s("bd ~ bd ~"),     // kick on 1 and 3
  s("~ sd ~ sd"),     // snare on 2 and 4  
  s("hh*8").gain(0.3) // constant hi-hats
)
```
````

The code block will be automatically transformed into an interactive Strudel editor with a play/stop button.

### More Examples

**Simple Melody:**
````markdown
```strudel
note("c4 d4 e4 f4")
  .s("triangle")
  .slow(2)
```
````

**Complex Pattern:**
````markdown
```strudel
// Melody with drum accompaniment
stack(
  // Simple melody
  note("c4 d4 e4 f4").s("triangle").slow(2),
  
  // Basic drum pattern
  s("bd sd").fast(2),
  
  // Hi-hats for rhythm
  s("hh*4").gain(0.3)
).cps(0.8)
```
````

## Settings

Access plugin settings through Obsidian's Settings > Community Plugins > Strudel. Available settings include:

- **Font Size**: Adjust editor font size (10-24px)
- **Font Family**: Choose from various monospace fonts
- **Editor Theme**: Select from 20+ color themes
- **Default Tempo (CPS)**: Set default cycles per second for new blocks
- **Line Wrapping**: Enable/disable line wrapping
- **Line Numbers**: Show/hide line numbers
- **Bracket Matching**: Highlight matching brackets
- **Auto Bracket Closing**: Automatically close brackets
- **Autocompletion**: Enable code completion
- **Flash Effects**: Visual feedback when patterns play
- **Tooltips**: Show helpful tooltips

## Installation

### From Community Plugins (when available)
1. Open Obsidian Settings
2. Go to Community Plugins
3. Search for "Strudel"
4. Install and enable the plugin

### Manual Installation
1. Download the latest release from GitHub
2. Extract the files to `VaultFolder/.obsidian/plugins/strudel-obsidian/`
3. Enable the plugin in Obsidian Settings

### Development Installation
1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the plugin
4. Copy `main.js`, `manifest.json`, and `styles.css` to your vault's plugin folder

## About Strudel

[Strudel](https://strudel.cc/) is a JavaScript library for live coding patterns, inspired by TidalCycles. It allows you to create complex musical patterns using simple, expressive code.

Learn more about Strudel patterns and syntax at [strudel.cc](https://strudel.cc/).

## Development

This plugin is built with TypeScript and uses the following key dependencies:

- `@strudel/codemirror` - CodeMirror integration
- `@strudel/core` - Core pattern evaluation
- `@strudel/webaudio` - Web Audio API integration
- `@strudel/mini` - Mini notation support
- `@strudel/tonal` - Music theory utilities

### Building

```bash
npm install
npm run build
```

### Development Mode

```bash
npm run dev
```

## License

MIT License - see LICENSE file for details.
