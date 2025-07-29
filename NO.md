# Obsidian Strudel Plugin - Project Requirements Plan (PRP)

## Overview
Implement an Obsidian plugin that transforms `strudel` code blocks into interactive, Jupyter-style music live-coding notebooks with play controls, shared execution context, and real-time pattern updates.

## Research Summary

### Codebase Analysis
- Current structure: Standard Obsidian sample plugin template
- Build system: esbuild with TypeScript
- Key files to modify:
  - `main.ts`: Core plugin implementation
  - `manifest.json`: Plugin metadata
  - `package.json`: Dependencies
  - `styles.css`: UI styling



### Key Technologies
1. **Obsidian API**
   - `registerMarkdownCodeBlockProcessor`: Process strudel code blocks
   - `Plugin` class for lifecycle management
   - `MarkdownPostProcessorContext` for block context
   - `TFile` for note identification

2. **Strudel Integration** 
   - `@strudel/web`: Core browser library without UI
   - `initStrudel()`: Initialize audio engine
   - Pattern evaluation and execution
   - Mini notation parsing with visual feedback
   - Pattern system: Translates time spans into event sets
   - REPL model: Read + Evaluate + Play + Loop

3. **Reference Implementations**
   - Execute Code Plugin: Jupyter-style execution model
   - Strudel REPL: CodeMirror integration patterns
   - ABC Music Plugin: Code block processing patterns
   - Loophole Letters Strudel: Live web implementation example


## Implementation Blueprint

### Phase 1: Core Infrastructure
```typescript
// main.ts structure
import { Plugin, MarkdownPostProcessorContext, TFile } from 'obsidian';
import { initStrudel, evaluate, hush } from '@strudel/web';

interface StrudelPluginSettings {
  defaultTempo: number;
  visualFeedback: boolean;
  autoPlay: boolean;
}

class StrudelNotebook {
  private context: Map<string, any> = new Map();
  private patterns: Map<string, any> = new Map();
  private globalCode: string = '';
  private blockCodes: Map<string, string> = new Map();
  
  async evaluateBlock(code: string, blockId: string): Promise<any> {
    // Store individual block code for re-evaluation
    this.blockCodes.set(blockId, code);
    
    // Build full context from all blocks in order
    this.rebuildGlobalCode();
    
    // Evaluate with full context using Strudel's pattern system
    const pattern = await evaluate(this.globalCode);
    this.patterns.set(blockId, pattern);
    return pattern;
  }
  
  private rebuildGlobalCode() {
    // Rebuild code maintaining block order
    this.globalCode = Array.from(this.blockCodes.values()).join('\n');
  }
  
  stopBlock(blockId: string) {
    const pattern = this.patterns.get(blockId);
    if (pattern) {
      pattern.stop();
      this.patterns.delete(blockId);
    }
  }
  
  removeBlock(blockId: string) {
    this.blockCodes.delete(blockId);
    this.stopBlock(blockId);
    this.rebuildGlobalCode();
  }
  
  cleanup() {
    hush(); // Stop all patterns
    this.patterns.clear();
    this.context.clear();
    this.blockCodes.clear();
  }
}

export default class StrudelPlugin extends Plugin {
  settings: StrudelPluginSettings;
  notebooks: Map<string, StrudelNotebook> = new Map();
  
  async onload() {
    // Initialize Strudel audio engine
    await initStrudel();
    
    // Register code block processor
    this.registerMarkdownCodeBlockProcessor('strudel', 
      this.processStrudelBlock.bind(this)
    );
    
    // Clean up notebooks when files close
    this.registerEvent(
      this.app.workspace.on('file-close', (file: TFile) => {
        const notebook = this.notebooks.get(file.path);
        if (notebook) {
          notebook.cleanup();
          this.notebooks.delete(file.path);
        }
      })
    );
  }
}
```

### Phase 2: Interactive UI Components
```typescript
private createBlockUI(container: HTMLElement, source: string, blockId: string): BlockUI {
  // Main container
  const blockEl = container.createDiv({ cls: 'strudel-block' });
  
  // Controls bar
  const controls = blockEl.createDiv({ cls: 'strudel-controls' });
  const playBtn = controls.createEl('button', { 
    cls: 'strudel-play-btn',
    text: '▶' 
  });
  
  // Code display with syntax highlighting
  const codeWrapper = blockEl.createDiv({ cls: 'strudel-code-wrapper' });
  const codeEl = codeWrapper.createEl('pre');
  const code = codeEl.createEl('code', { 
    cls: 'language-strudel',
    text: source 
  });
  
  // Error display
  const errorEl = blockEl.createDiv({ cls: 'strudel-error hidden' });
  
  // Status indicator
  const statusEl = controls.createDiv({ cls: 'strudel-status' });
  
  return { blockEl, playBtn, codeEl, errorEl, statusEl };
}
```

### Phase 3: Pattern Execution & Live Updates
```typescript
private async handlePlayToggle(
  notebook: StrudelNotebook, 
  blockId: string, 
  source: string,
  ui: BlockUI
) {
  try {
    if (ui.isPlaying) {
      // Stop pattern
      notebook.stopBlock(blockId);
      ui.playBtn.setText('▶');
      ui.statusEl.removeClass('playing');
    } else {
      // Evaluate and play pattern
      const pattern = await notebook.evaluateBlock(source, blockId);
      
      // Use Strudel's pattern system for playback
      pattern.play();
      
      // Update UI
      ui.playBtn.setText('■');
      ui.statusEl.addClass('playing');
      
      // Enable visual feedback if configured
      if (this.settings.visualFeedback) {
        this.enableMiniNotationHighlighting(ui.codeEl, pattern);
      }
      
      // Set up pattern event listeners for live updates
      this.setupPatternEventHandlers(pattern, ui);
    }
    ui.isPlaying = !ui.isPlaying;
  } catch (error) {
    ui.errorEl.setText(error.message);
    ui.errorEl.removeClass('hidden');
  }
}

// Handle pattern events using Strudel's event system
private setupPatternEventHandlers(pattern: any, ui: BlockUI) {
  // Query pattern events for visualization
  const updateInterval = setInterval(() => {
    if (!ui.isPlaying) {
      clearInterval(updateInterval);
      return;
    }
    
    // Get current time span events
    const now = performance.now() / 1000;
    const events = pattern.querySpan(now, now + 0.1);
    
    // Update visual feedback based on events
    this.updateVisualFeedback(events, ui);
  }, 50); // Update at 20fps
}
```

### Phase 4: Visual Feedback Integration
```typescript
private enableMiniNotationHighlighting(codeEl: HTMLElement, pattern: any) {
  // Parse mini notation positions
  const miniNotationRanges = this.parseMiniNotation(codeEl.textContent);
  
  // Create highlight spans
  miniNotationRanges.forEach(range => {
    const span = document.createElement('span');
    span.className = 'strudel-highlight';
    // Wrap mini notation parts
  });
  
  // Update highlights based on pattern events
  pattern.onTrigger((event: any) => {
    // Highlight active notes
    this.updateHighlights(codeEl, event);
  });
}
```

### Phase 5: CSS Styling
```css
/* styles.css */
.strudel-block {
  position: relative;
  margin: 1em 0;
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  overflow: hidden;
}

.strudel-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--background-secondary);
  border-bottom: 1px solid var(--background-modifier-border);
}

.strudel-play-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--interactive-accent);
  color: var(--text-on-accent);
  border: none;
  cursor: pointer;
}

.strudel-status.playing::before {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  background: #4caf50;
  border-radius: 50%;
  animation: pulse 1s infinite;
}

.strudel-highlight {
  background: rgba(var(--interactive-accent-rgb), 0.3);
  transition: background 0.1s;
}

.strudel-highlight.active {
  background: rgba(var(--interactive-accent-rgb), 0.6);
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
```

## Critical Implementation Details

### 1. Dependencies
```json
{
  "dependencies": {
    "@strudel/web": "^1.2.0",
    "@strudel/mini": "^1.2.0",
    "@strudel/core": "^1.2.0"
  }
}
```

### 2. Audio Context Management
- Initialize once in plugin onload
- Share across all patterns
- Proper cleanup on unload
- Handle tab switching/backgrounding

### 3. Shared Context Implementation
- Accumulate code from all executed blocks
- Re-evaluate full context on each run
- Clear context when note closes
- Handle variable references between blocks

### 4. Error Handling
- Syntax errors in patterns
- Audio context failures
- Missing dependencies
- Runtime pattern errors

### 5. Mobile Compatibility
- Touch-friendly play buttons
- Responsive layout
- Handle audio context restrictions
- Optimize for performance

### 6. Live Editing Support
- Monitor code changes in blocks
- Debounce evaluation (wait for pause in typing)
- Hot-reload patterns without stopping playback
- Maintain pattern state during updates
- Use Strudel's pattern modification methods

## Implementation Tasks

1. **Setup & Dependencies**
   - Update package.json with Strudel dependencies
   - Configure esbuild for Strudel modules
   - Update manifest.json metadata

2. **Core Plugin Structure**
   - Replace sample plugin code
   - Implement StrudelNotebook class
   - Add code block processor
   - Initialize Strudel engine

3. **UI Components**
   - Create block container structure
   - Add play/stop controls
   - Implement code display
   - Add error handling UI

4. **Pattern Execution**
   - Implement evaluate/play logic
   - Add shared context management
   - Handle pattern lifecycle
   - Add stop/cleanup logic

5. **Visual Feedback**
   - Parse mini notation ranges
   - Add highlight spans
   - Integrate with pattern events
   - Style active highlights

6. **Polish & Testing**
   - Add settings tab
   - Test with various patterns
   - Optimize performance
   - Handle edge cases

## Validation Gates

```bash
# Build and type checking
bun run build

# Manual testing checklist
# 1. Create note with multiple strudel blocks
# 2. Verify shared context (variables work across blocks)
# 3. Test play/stop functionality
# 4. Verify visual feedback
# 5. Test error handling
# 6. Check memory cleanup on note close
# 7. Test on mobile Obsidian

# Performance check
# - Monitor memory usage with multiple patterns
# - Verify no audio glitches
# - Check CPU usage during playback



```
- add a copy command so it copies to obisidian on build.
	"build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production && bun run copy",
	"copy": "mkdir -p /Users/burooj/Obsidian/strudel-test/.obsidian/plugins/strudel-obsidian && cp main.js manifest.json styles.css /Users/burooj/Obsidian/strudel-test/.obsidian/plugins/strudel-obsidian/",
	
## External Resources

### Documentation
- Obsidian Plugin API: https://docs.obsidian.md/
- Strudel Technical Manual: https://strudel.cc/technical-manual/
- Strudel Web Package: https://strudel.cc/technical-manual/packages/
- Strudel REPL Implementation: https://strudel.cc/technical-manual/repl/
- Loophole Letters Strudel Guide: https://loophole-letters.vercel.app/strudel

### Reference Code
- Strudel packages: https://codeberg.org/uzu/strudel/src/branch/main/packages
- Execute Code Plugin: https://github.com/twibiral/obsidian-execute-code
- Strudel CodeMirror integration: https://codeberg.org/uzu/strudel/src/branch/main/packages/codemirror

### Examples
- Strudel embed examples: https://strudel.cc/technical-manual/project-start/
- Visual feedback: https://strudel.cc/learn/visual-feedback/
- Mini notation: https://strudel.cc/learn/mini-notation/
- Pattern composition examples: https://loophole-letters.vercel.app/strudel

## Common Pitfalls & Solutions

1. **Audio Context Issues**
   - Solution: Initialize only once, handle browser restrictions
   - Use user interaction to start audio context

2. **Memory Leaks**
   - Solution: Proper cleanup in notebook.cleanup()
   - Remove event listeners and stop all patterns

3. **Context Pollution**
   - Solution: Isolate notebooks per file
   - Clear context on file close

4. **Mobile Audio Restrictions**
   - Solution: Require user interaction for first play
   - Show clear UI indication

## Success Criteria
- ✅ Patterns play immediately on button click
- ✅ Variables persist between blocks in same note
- ✅ Live editing updates sound without re-run
- ✅ Visual feedback shows active notes
- ✅ Works on mobile Obsidian
- ✅ No memory leaks or audio glitches
- ✅ Graceful error handling

## Confidence Score: 8/10

The implementation path is clear with good documentation and reference examples. The main complexity lies in managing the audio context lifecycle and implementing the shared execution context properly. With the research done on Strudel's architecture and Obsidian's plugin system, this should be achievable in a single implementation pass.