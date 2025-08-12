# Strudel Obsidian Plugin

An Obsidian plugin that integrates [Strudel](https://strudel.cc) live coding for creating interactive music patterns directly in your notes.

## Features

-   **Interactive Code Blocks**: Write Strudel patterns in `strudel` code blocks that render as interactive editors
-   **Live Audio**: Play and stop patterns with a simple toggle button
-   **Tempo Control**: Adjust the tempo (CPS - cycles per second) with a slider
-   **Rich Settings**: Customize editor appearance, behavior, and audio settings
-   **Auto-Save**: Edits in the editor automatically update the markdown source
-   **Multiple Themes**: Choose from 25+ editor themes including Strudel-specific themes

## Usage

### Basic Example

Create a code block with the language set to `strudel`:

```strudel
s("bd hh sd hh")
```

This will render as an interactive Strudel editor with play controls.

### More Examples

**Simple melody:**

```strudel
note("c4 d4 e4 f4").s("triangle").slow(2)
```

**Drum pattern:**

```strudel
stack(
  s("bd ~ bd ~"),     // kick on 1 and 3
  s("~ sd ~ sd"),     // snare on 2 and 4
  s("hh*8").gain(0.3) // constant hi-hats
)
```

**With effects:**

```strudel
note("c4 eb4 f4 g4")
  .s("sawtooth")
  .lpf(sine.range(200, 2000).slow(4))
  .delay(0.25)
  .gain(0.7)
```

## Controls

Each Strudel code block includes:

-   **Play/Stop Button**: Toggle pattern playback
-   **Tempo Slider**: Adjust playback speed (0.1 - 4.0 CPS)

## Plugin Settings

Access settings via _Settings → Community Plugins → Strudel_:

### Editor Settings

-   **Font Size**: 10-24px slider
-   **Font Family**: Dropdown with monospace fonts
-   **Theme**: 25+ themes including:
    -   Strudel themes (Default, Algoboy, CutiePi, Sonic Pink)
    -   Terminal themes (Black Screen, Green Text, etc.)
    -   Popular themes (Dracula, Monokai, Nord, etc.)
    -   IDE themes (VS Code, GitHub, Material, etc.)

### Editor Features

-   **Line Wrapping**: Enable/disable line wrapping
-   **Line Numbers**: Show/hide line numbers
-   **Bracket Matching**: Highlight matching brackets
-   **Auto Bracket Closing**: Automatically close brackets
-   **Autocompletion**: Enable code completion
-   **Flash Effects**: Visual flash during evaluation
-   **Tooltips**: Show helpful tooltips

### Audio Settings

-   **Default Tempo**: Set default CPS for new editors (0.1 - 4.0)

## Installation

### Manual Installation

1. Download the plugin files (`main.js`, `manifest.json`, `styles.css`)
2. Create folder: `{vault}/.obsidian/plugins/strudel-obsidian/`
3. Copy files to the folder
4. Enable the plugin in Obsidian settings

### Development Setup

```bash
# Clone the repository
git clone <repo-url>
cd strudel-obsidian

# Install dependencies
bun install

# Build the plugin
bun run build

# For development with auto-rebuild
bun run dev
```

## About Strudel

[Strudel](https://strudel.cc) is a JavaScript live coding environment for algorithmic music. It's inspired by Tidal Cycles and allows you to create complex rhythms and melodies using pattern notation.

### Key Concepts

-   **Patterns**: `s("bd hh sd hh")` - sound patterns
-   **Notes**: `note("c4 d4 e4")` - melodic patterns
-   **Effects**: `.delay()`, `.lpf()`, `.gain()` - audio effects
-   **Time**: `.slow()`, `.fast()` - time manipulation
-   **Stacking**: `stack()` - combine multiple patterns

## License

MIT

## Contributing

Contributions welcome! Please feel free to submit issues and pull requests.
