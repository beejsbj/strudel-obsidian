# Obsidian Strudel Plugin - Product Requirements & Implementation Plan (PRP)

## Executive Summary

Create an Obsidian plugin that transforms standard `strudel` code blocks into interactive Jupyter-style music live coding environments. Users can write Strudel patterns that become executable with play/pause controls, shared execution context per note, and real-time visual feedback including mini notation highlighting.

create 5 agents, that implement each of the phases and the last one to check everyones work at the end. run agents serially.

## Core Requirements

### 1. Interactive Code Blocks

Transform markdown code blocks with `strudel` language into interactive editors with:

-   Play/Stop transport controls
-   Real-time pattern execution using Strudel's WebAudio engine
-   Live editing with hot-reload (patterns update on next cycle)
-   Visual playback indicators during execution
-   Error handling with user-friendly display

### 2. Shared Execution Context

Implement Jupyter-style notebook behavior:

-   Variables/patterns defined in one block persist in subsequent blocks within the same note
-   Shared audio context across all patterns in a note
-   Context isolation between different notes
-   Automatic context cleanup when note is closed/reopened

### 3. Visual Feedback System

Integrate Strudel's visual feedback capabilities:

-   Mini notation highlighting when patterns are playing
-   Real-time highlighting of active pattern elements using CSS styles
-   Support for Strudel's visual functions (`_punchcard`, `_pianoroll`, etc.)
-   Color-coded pattern highlighting based on Strudel's markcss system

### 4. Mobile Compatibility

Ensure full functionality on Obsidian mobile apps:

-   Touch-friendly transport controls
-   Responsive UI that adapts to mobile screens
-   Audio engine compatibility with mobile browsers
-   Performance optimization for mobile devices

## Technical Architecture

### Core Dependencies Analysis

Based on the existing `package.json`, all necessary Strudel dependencies are already included:

```json
{
	"@strudel/codemirror": "latest", // CodeMirror integration with highlighting
	"@strudel/core": "latest", // Core pattern engine
	"@strudel/draw": "latest", // Visual feedback functions
	"@strudel/mini": "latest", // Mini notation parser
	"@strudel/soundfonts": "latest", // Sound library
	"@strudel/tonal": "latest", // Musical scales and harmony
	"@strudel/transpiler": "latest", // Code transpilation
	"@strudel/webaudio": "latest" // WebAudio output engine
}
```

### Implementation Strategy

Following proven patterns from Strudel's own implementations and similar Obsidian plugins:

#### 1. **Strudel Integration Pattern** (From `/Users/burooj/Projects/strudel/examples/`)

**Minimal REPL Pattern** (from `minimal-repl/main.js`):

```typescript
import { repl, evalScope } from "@strudel/core";
import {
	getAudioContext,
	webaudioOutput,
	initAudioOnFirstClick,
	registerSynthSounds,
} from "@strudel/webaudio";
import { transpiler } from "@strudel/transpiler";

const ctx = getAudioContext();
evalScope(
	import("@strudel/core"),
	import("@strudel/mini"),
	import("@strudel/webaudio"),
	import("@strudel/tonal")
);

const { evaluate } = repl({
	defaultOutput: webaudioOutput,
	getTime: () => ctx.currentTime,
	transpiler,
});
```

**Advanced CodeMirror Pattern** (from `codemirror-repl/main.js`):

```typescript
import { StrudelMirror } from "@strudel/codemirror";

const editor = new StrudelMirror({
	defaultOutput: webaudioOutput,
	getTime: () => getAudioContext().currentTime,
	transpiler,
	root: containerElement,
	initialCode: patternCode,
	onDraw: (haps, time) => drawPianoroll({ haps, time, ctx: drawContext }),
	prebake: async () => {
		initAudioOnFirstClick();
		const loadModules = evalScope(
			import("@strudel/core"),
			import("@strudel/mini"),
			import("@strudel/tonal"),
			import("@strudel/webaudio")
		);
		await Promise.all([loadModules, registerSynthSounds()]);
	},
});
```

#### 2. **Obsidian Plugin Pattern** (From research on successful plugins)

**Code Block Processor Pattern** (Inspired by Execute Code Plugin):

```typescript
export default class StrudelPlugin extends Plugin {
	notebooks: Map<string, StrudelNotebook> = new Map();

	async onload() {
		// Initialize Strudel environment
		await this.initializeStrudel();

		// Register code block processor
		this.registerMarkdownCodeBlockProcessor(
			"strudel",
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
		const widget = new StrudelBlockWidget(el, source, notebook, ctx);
		ctx.addChild(widget);
	}
}
```

#### 3. **Visual Highlighting Integration** (From Strudel's CodeMirror package)

Using Strudel's proven highlighting system from `packages/codemirror/highlight.mjs`:

```typescript
import {
	updateMiniLocations,
	highlightMiniLocations,
} from "@strudel/codemirror";

// Update highlighting during pattern execution
const updateHighlighting = (editor, locations, atTime, haps) => {
	updateMiniLocations(editor, locations);
	highlightMiniLocations(editor, atTime, haps);
};
```

### Component Architecture

#### 1. **StrudelNotebook Class**

Manages shared execution context per note:

```typescript
class StrudelNotebook {
	private evaluator: Function;
	private patterns: Map<string, any> = new Map();
	private audioContext: AudioContext;

	constructor() {
		this.audioContext = getAudioContext();
		this.evaluator = this.createEvaluator();
	}

	async evaluateBlock(code: string, blockId: string): Promise<any> {
		// Compile and execute pattern in shared context
		// Return pattern object for playback control
	}

	stopAll() {
		// Stop all patterns in this notebook
	}

	cleanup() {
		// Clean up audio resources
	}
}
```

#### 2. **StrudelBlockWidget Class**

Individual interactive code block:

```typescript
class StrudelBlockWidget extends MarkdownRenderChild {
	private editor: StrudelMirror;
	private controls: HTMLElement;
	private isPlaying: boolean = false;

	onload() {
		this.createTransportControls();
		this.createStrudelEditor();
		this.setupEventHandlers();
	}

	private createTransportControls() {
		// Create play/stop buttons with icons
	}

	private createStrudelEditor() {
		// Initialize StrudelMirror with highlighting
	}

	private async playPattern() {
		// Execute pattern and start playback
	}

	private stopPattern() {
		// Stop pattern playback
	}
}
```

## Critical Implementation Details

### 1. **Audio Context Management**

**Challenge**: Managing WebAudio context lifecycle across multiple patterns and mobile compatibility.

**Solution**: Use Strudel's proven patterns from examples:

```typescript
// From minimal-repl example
initAudioOnFirstClick(); // Required for mobile browsers
const ctx = getAudioContext(); // Strudel's managed context

// Ensure context resumption on user interaction
button.addEventListener("click", () => {
	ctx.resume();
	evaluate(code);
});
```

### 2. **Pattern Compilation & Execution**

**Challenge**: Maintaining shared context while enabling individual pattern control.

**Solution**: Based on Strudel's REPL implementation:

```typescript
// Initialize shared scope once per notebook
evalScope(
	import("@strudel/core"),
	import("@strudel/mini"),
	import("@strudel/webaudio"),
	import("@strudel/tonal")
);

// Each block evaluation builds on previous context
const { evaluate } = repl({
	defaultOutput: webaudioOutput,
	getTime: () => ctx.currentTime,
	transpiler,
});
```

### 3. **Visual Highlighting Integration**

**Challenge**: Integrating Strudel's CodeMirror highlighting within Obsidian's rendering system.

**Solution**: Use Strudel's proven highlighting extensions:

```typescript
import {
	highlightExtension,
	updateMiniLocations,
	highlightMiniLocations,
} from "@strudel/codemirror";

// During pattern execution
editor.dispatch({
	effects: showMiniLocations.of({ atTime, haps }),
});
```

### 4. **Mobile Optimization**

**Key Requirements**:

-   Touch-friendly controls (minimum 44px touch targets)
-   Audio context initialization on first touch
-   Performance optimization for limited mobile resources
-   Responsive UI scaling

**Implementation**:

```typescript
// Mobile-optimized transport controls
const playButton = container.createEl("button", {
	cls: "strudel-play-btn",
	attr: {
		"aria-label": "Play pattern",
		style: "min-height: 44px; min-width: 44px;", // Touch-friendly size
	},
});
```

## Reference Documentation & Examples

### Strudel Technical Resources

-   **REPL Implementation**: https://strudel.cc/technical-manual/repl/
-   **Visual Feedback**: https://strudel.cc/learn/visual-feedback/
-   **Package Documentation**: https://strudel.cc/technical-manual/packages/
-   **Local Examples**: `/Users/burooj/Projects/strudel/examples/`
    -   `minimal-repl/`: Basic REPL implementation
    -   `codemirror-repl/`: Full-featured editor with highlighting
    -   `buildless/minimal-repl.html`: Browser-only implementation

### Obsidian Plugin Patterns

-   **Execute Code Plugin**: https://github.com/twibiral/obsidian-execute-code
    -   Mature example of code execution with persistent context
    -   Transport controls and output management
-   **Code Emitter Plugin**: https://github.com/mokeyish/obsidian-code-emitter
    -   Jupyter-style execution environment
    -   Multiple language support patterns

### Architecture References

-   **Technical Blog Post**: https://loophole-letters.vercel.app/strudel
    -   Creator's implementation insights
    -   Mini REPL architecture details
-   **Strudel Packages**: https://codeberg.org/uzu/strudel/src/branch/main/packages
    -   Source code for all Strudel modules
    -   Reference implementations

## Implementation Plan

### Phase 1: Foundation (Core Plugin Structure)

1. **Setup Base Plugin**

    - Replace sample plugin functionality
    - Update manifest.json with proper metadata
    - Configure build system for Strudel dependencies

2. **Basic Code Block Processing**

    - Implement `registerMarkdownCodeBlockProcessor('strudel')`
    - Create basic UI structure with transport controls
    - Test code block detection and UI rendering

3. **Strudel Integration**
    - Initialize Strudel environment (`evalScope`, `registerSynthSounds`)
    - Create basic pattern evaluation system
    - Test simple pattern playback

### Phase 2: Core Functionality

4. **Shared Context Implementation**

    - Implement `StrudelNotebook` class for per-note context
    - Add pattern compilation and execution system
    - Test variable persistence between blocks

5. **Transport Controls**

    - Add play/stop button functionality
    - Implement pattern lifecycle management
    - Add visual playback indicators

6. **Error Handling**
    - Implement compilation error display
    - Add runtime error catching
    - Create user-friendly error messages

### Phase 3: Advanced Features

7. **Visual Highlighting**

    - Integrate Strudel's CodeMirror highlighting system
    - Implement mini notation highlighting during playback
    - Add real-time pattern element highlighting

8. **Live Editing**

    - Implement hot-reload functionality
    - Add debounced pattern updates
    - Handle live code changes during playback

9. **Mobile Optimization**
    - Optimize touch interactions
    - Ensure audio context works on mobile
    - Test performance on mobile devices

### Phase 4: Polish & Production

10. **Audio Context Management**

    -   Implement proper cleanup on note close
    -   Handle multiple pattern coordination
    -   Optimize audio performance

11. **UI Polish**

    -   Style transport controls to match Obsidian theme
    -   Add loading states and feedback
    -   Implement responsive design

12. **Testing & Validation**
    -   Test with complex Strudel patterns
    -   Validate mobile compatibility
    -   Performance testing with multiple patterns

## Validation Gates

### Functional Testing

```bash
# Plugin Installation
bun install
bun run build
# Copy plugin to test vault and verify loading

# Basic Functionality
# 1. Create note with strudel code block
# 2. Verify play button appears
# 3. Test pattern playback
# 4. Test pattern stopping

# Context Persistence
# 1. Define variable in first block
# 2. Reference variable in second block
# 3. Verify execution works

# Visual Feedback
# 1. Play pattern with mini notation
# 2. Verify highlighting appears during playback
# 3. Test highlighting updates with live edits
```

### Code Quality

```bash
# TypeScript compilation
bun run build

# Code style (if configured)
npm run lint # or tsc --noEmit
```

### Mobile Testing

```bash
# Test in Obsidian mobile app
# 1. Install plugin in mobile vault
# 2. Test touch interactions
# 3. Verify audio playback works
# 4. Test performance with multiple patterns
```

## Success Criteria

### Must-Have Features

-   [x] Strudel code blocks render with play/stop controls
-   [x] Patterns play immediately on button click with audio output
-   [x] Variables persist between blocks within same note
-   [x] Basic error handling for syntax errors
-   [x] Mobile compatibility (touch controls and audio)

### Should-Have Features

-   [x] Mini notation highlighting during pattern playback
-   [x] Live editing with hot-reload
-   [x] Visual feedback for active pattern elements
-   [x] Multiple patterns can play simultaneously
-   [x] Proper cleanup when note is closed

### Nice-to-Have Features

-   [ ] Export patterns to audio files
-   [ ] MIDI output support
-   [ ] Advanced visual feedback (punchcard, pianoroll)
-   [ ] Pattern synchronization controls
-   [ ] Custom sample loading

## Known Challenges & Mitigations

### 1. **Audio Context Lifecycle**

**Challenge**: Managing WebAudio context across multiple patterns and browser restrictions.
**Mitigation**: Use Strudel's proven `initAudioOnFirstClick()` pattern and follow WebAudio best practices.

### 2. **Live Editing Performance**

**Challenge**: Debouncing code changes without breaking user experience.
**Mitigation**: Use Strudel's built-in live editing patterns from CodeMirror examples.

### 3. **Mobile Audio Compatibility**

**Challenge**: WebAudio restrictions on mobile browsers.
**Mitigation**: Follow Strudel's mobile compatibility patterns and ensure proper user gesture handling.

### 4. **Pattern Coordination**

**Challenge**: Managing multiple simultaneous patterns without conflicts.
**Mitigation**: Use Strudel's proven pattern management from REPL examples.

## Quality Assessment

**Confidence Score: 9/10**

This PRP provides comprehensive context for one-pass implementation based on:

✅ **Complete Architecture Understanding**: Deep analysis of Strudel's proven implementation patterns
✅ **Reference Implementations**: Multiple working examples from Strudel codebase and similar Obsidian plugins  
✅ **Technical Specifications**: Detailed API usage and integration patterns
✅ **Mobile Considerations**: Specific patterns for mobile compatibility
✅ **Validation Strategy**: Executable testing approach
✅ **Risk Mitigation**: Known challenges with proven solutions

The implementation can follow established patterns from:

-   Strudel's own CodeMirror and minimal REPL examples
-   Proven Obsidian plugin architectures (Execute Code, Code Emitter)
-   Mobile-tested WebAudio patterns from Strudel's codebase

This combination of proven patterns, comprehensive technical context, and clear implementation steps provides extremely high confidence for successful one-pass implementation.
