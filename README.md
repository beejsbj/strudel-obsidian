# Strudel for Obsidian

Live-code music patterns directly in your Obsidian notes using [Strudel](https://strudel.cc/) - a web-based environment for algorithmic music.

## Features

- **Live Code Blocks**: Write Strudel patterns in fenced code blocks with `strudel` language identifier
- **Interactive Editor**: Full-featured CodeMirror editor with syntax highlighting, autocompletion, and more
- **Real-time Playback**: Play/stop patterns with a single button
- **Persistent Editing**: Code changes are automatically saved back to your markdown files
- **Comprehensive Settings**: Customize editor appearance, behavior, and features
- **Audio Engine**: Built-in Web Audio support with samples and synthesizers

## Usage

Create a Strudel code block in any markdown file:

````markdown
```strudel
note("c4 d4 e4 f4")
  .s("triangle")
  .slow(2)
```
````

The code block will render as an interactive Strudel editor with a play/stop button. You can:

1. **Edit Code**: Click in the editor to modify the pattern
2. **Play/Stop**: Use the button below the editor to start/stop playback
3. **Auto-Save**: Changes are automatically saved to your markdown file

## Example Patterns

### Basic Drum Pattern
```strudel
stack(
  s("bd ~ bd ~"),     // kick on 1 and 3
  s("~ sd ~ sd"),     // snare on 2 and 4  
  s("hh*8").gain(0.3) // constant hi-hats
)
```

### Melody with Effects
```strudel
note("c4 eb4 f4 g4")
  .s("sawtooth")
  .lpf(sine.range(200, 2000).slow(4)) // moving filter
  .delay(0.25)                        // echo
  .gain(0.7)
```

### Interactive Controls
```strudel
note("c4 d4 e4 f4")
  .s("triangle")
  .gain(slider(0.7, 0, 1))        // Volume slider
  .lpf(slider(1000, 200, 2000))   // Filter slider
  .slow(slider(2, 0.5, 4))        // Speed slider
```

## Settings

Access plugin settings through Obsidian's Settings → Community Plugins → Strudel.

### Editor Settings
- **Font Size**: Adjust editor text size (10-24px)
- **Font Family**: Choose from monospace fonts
- **Theme**: Select from 30+ syntax highlighting themes
- **Line Numbers**: Show/hide line numbers
- **Line Wrapping**: Enable/disable line wrapping
- **Bracket Matching**: Highlight matching brackets
- **Auto Bracket Closing**: Automatically close brackets
- **Autocompletion**: Enable code completion
- **Active Line Highlighting**: Highlight current line

### Strudel Features
- **Pattern Highlighting**: Syntax highlighting for Strudel patterns
- **Flash Effects**: Visual feedback during pattern evaluation
- **Tooltips**: Helpful tooltips for functions and methods
- **Tab Indentation**: Use tabs for indentation
- **Multi-cursor**: Enable multi-cursor editing

## Available Themes

The plugin includes 30+ themes organized by category:

- **Strudel Themes**: strudelTheme (default), algoboy, CutiePi, sonicPink
- **Retro/Terminal**: blackscreen, bluescreen, whitescreen, teletext, greenText, redText
- **Popular**: dracula, monokai, nord, sublime, darcula, atomone
- **Material & Tokyo**: materialDark/Light, tokyoNight/Day/Storm
- **GitHub & VS Code**: githubDark/Light, vscodeDark/Light
- **Solarized & Others**: solarizedDark/Light, gruvboxDark/Light, duotoneDark, aura
- **IDE Themes**: androidstudio, eclipse, xcodeLight, bbedit

## Installation

### Manual Installation

1. Download the latest release
2. Extract to `<vault>/.obsidian/plugins/strudel-obsidian/`
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

### Development

1. Clone this repository to `<vault>/.obsidian/plugins/strudel-obsidian/`
2. Run `npm install` or `bun install`
3. Run `npm run build` or `bun run build`
4. Reload Obsidian

## Audio Requirements

- Modern web browser with Web Audio API support
- User interaction required before audio playback (browser security requirement)
- Internet connection for sample loading (cached after first load)

## Strudel Documentation

Learn more about Strudel patterns and functions:
- [Strudel Website](https://strudel.cc/)
- [Pattern Notation](https://strudel.cc/learn/patterns)
- [Functions Reference](https://strudel.cc/learn/functions)
- [Examples](https://strudel.cc/learn/getting-started)

## Troubleshooting

### Audio Not Playing
- Ensure you've interacted with the page (click play button)
- Check browser console for audio context errors
- Verify internet connection for sample loading

### Performance Issues
- Disable flash effects if experiencing lag
- Use simpler patterns for better performance
- Close unused Strudel editors when not needed

### Code Not Saving
- Ensure the markdown file is not read-only
- Check Obsidian file permissions
- Try manually saving the file (Ctrl/Cmd+S)

## Contributing

Contributions welcome! Please read the contributing guidelines and submit pull requests.

## License

MIT License - see LICENSE file for details.

## Credits

- [Strudel](https://strudel.cc/) by Felix Roos and contributors
- Built with [CodeMirror 6](https://codemirror.net/)
- Audio samples from various sources
