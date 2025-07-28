# Obsidian Strudel Plugin

## Overview

Create an Obsidian plugin that enables Jupyter-style music live coding notebooks using Strudel (TidalCycles for JavaScript). Users write Strudel patterns in `strudel` code blocks that become interactive with play controls and shared execution context per note.

Conduct Extensive reseach on the best play to implement this.

## Core Features

### 1. Interactive Code Blocks

````markdown
```strudel
drums = s("bd sd bd sd")
```
````

````
- Each `strudel` block gets play/stop transport controls
- Live editing - patterns update as you type, wait until next cycle.
- Visual playback indicators
- how the play button could look ui-appearance.png



### 2. Shared Context Per Note
- Variables/patterns defined in one block available in subsequent blocks
- Persistent execution environment (like Jupyter notebooks)
- Context cleared when note is closed/reopened

### 3. Audio Engine
- Uses Strudel's WebAudio engine (Superdough)
- Single audio context shared across all patterns
- Proper cleanup on note close

## Technical Implementation

### Plugin Structure
```typescript
import { Plugin, MarkdownPostProcessorContext, TFile } from 'obsidian';
import { initStrudel, evaluate, hush } from '@strudel/web';

export default class StrudelPlugin extends Plugin {
  notebooks: Map<string, StrudelNotebook> = new Map();

  async onload() {
    await initStrudel();

    this.registerMarkdownCodeBlockProcessor('strudel',
      this.processStrudelBlock.bind(this)
    );
  }

  async processStrudelBlock(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ) {
    const file = this.app.workspace.getActiveFile();
    if (!file) return;

    const notebook = this.getNotebook(file);
    const blockId = this.generateBlockId(source);

    // Create UI
    const container = el.createDiv({ cls: 'strudel-block' });
    const controls = this.createTransportControls(container);
    const codeEl = this.createCodeDisplay(container, source);

    // Handle execution
    controls.playBtn.onclick = async () => {
      const pattern = await notebook.evaluateBlock(source, blockId);
      pattern.play();
    };
  }

  getNotebook(file: TFile): StrudelNotebook {
    if (!this.notebooks.has(file.path)) {
      this.notebooks.set(file.path, new StrudelNotebook());
    }
    return this.notebooks.get(file.path)!;
  }
}

class StrudelNotebook {
  private context: string = '';

  async evaluateBlock(code: string, blockId: string): Promise<any> {
    // Append to context for future blocks
    this.context += '\n' + code;

    // Evaluate full context
    return evaluate(this.context);
  }
}
````

### 2. Visual feedback

-   Very important to implement
-   https://strudel.cc/learn/visual-feedback/
-   mainly the Mini Notation Highlighting
-   image refrence mininotation-highlighting.png

### 3. usable offline in obsidian

-   https://strudel.cc/learn/pwa/

### Key Dependencies

```json
{
	"@strudel/web": "^1.2.x",
	"@strudel/core": "^1.2.x"
}
```

#### Other strudel packages that might be useful (research, consider and think hard)

-   https://codeberg.org/uzu/strudel/src/branch/main/packages/repl
    -   Strudel's repl package
-   https://codeberg.org/uzu/strudel/src/branch/main/packages/draw
    -   for drawing the punchcard
-   http://codeberg.org/uzu/strudel/src/branch/main/packages/mini (mini notation i think)
-   https://codeberg.org/uzu/strudel/src/branch/main/packages/codemirror
    -   this could potentially have examples of how studel repl implemented its editor
-   https://codeberg.org/uzu/strudel/src/branch/main/packages other packages you could use for ref.

## Example Usage

````markdown
# Live Coding Session

Set the tempo:

```strudel
setcps(0.5)
```
````

Create drum pattern:

```strudel
drums = s("bd [~ bd] sd cp")
  .gain(0.8)
```

Add bassline:

```strudel
bass = note("<c2 eb2 g2 bb2>")
  .s("bass")
  .lpf(800)
```

Combine everything:

```strudel
stack(
  drums,
  bass,
  note("c4 eb4 g4 c5".fast(2))
    .s("piano")
    .room(0.3)
).slow(2)
```

```

## Reference Documentation

### Obsidian Plugin Development
- **Plugin API**: https://docs.obsidian.md/
- https://docs.obsidian.md/Plugins
- **Code Block Processor**: https://docs.obsidian.md/Reference/TypeScript+API/Plugin/registerMarkdownCodeBlockProcessor


### Strudel Documentation
- **Technical Manual**: https://strudel.cc/technical-manual/project-start/
- **Package Docs**: https://strudel.cc/technical-manual/packages/
- **@strudel/web**: https://codeberg.org/uzu/strudel/src/branch/main/packages/web
- **Repo**: https://codeberg.org/uzu/strudel


### Reference Implementations
- **Execute Code Plugin** (Jupyter-style notebooks): https://github.com/twibiral/obsidian-execute-code
- **ABC Music Plugin** (code block processing): https://github.com/abcjs-music/obsidian-plugin-abcjs
- **Code Emitter Plugin** (interactive execution): https://github.com/mokeyish/obsidian-code-emitter


#### how Strudel implemented their own REPL
https://strudel.cc/technical-manual/repl/

## Development Steps

1. **Setup**: Clone Obsidian sample plugin, add Strudel dependencies
2. **Basic Playback**: Register processor, add play button, test single block
3. **Shared Context**: Implement notebook class, test pattern references
4. **Live Editing**: Add CodeMirror extensions for live updates
5. **Polish**: Error handling, cleanup, mobile optimization

## Success Criteria
- Patterns play immediately on button click
- Variables persist between blocks in same note
- Live editing updates sound without manual re-run
- Works on mobile Obsidian apps
- No audio glitches or memory leaks
- THIS HAS TO ALSO BE COMPATIPBLE WITH MOBILE OBSIDIAN.

## Known Challenges
- Managing audio context lifecycle
- Debouncing live edits effectively
- Handling syntax errors gracefully
- Mobile touch interactions

## MVP Scope
Focus on core functionality: play/stop, shared context between block, visual highlighter when playing, basic error display. Advanced features (MIDI, visualizations, export) come later.
```
