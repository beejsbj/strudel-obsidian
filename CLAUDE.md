# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Obsidian plugin project that aims to integrate Strudel (a live-coding music environment) into Obsidian notes. The plugin enables users to write and execute Strudel patterns in a Jupyter-style notebook experience within Obsidian.

## Key Objectives (from INITIAL.md)

- Transform standard code blocks with language `strudel` into interactive music pattern editors
- Provide play/pause controls for each pattern block
- Maintain shared execution context per note (like Jupyter notebooks)
- Enable live pattern editing with real-time updates while playing
- Integrate Strudel's WebAudio engine (Superdough) for sound generation

## Development Commands

```bash
# Install dependencies (Note: Project uses npm, but Bun is preferred per user preferences)
bun install

# Development mode with file watching
bun run dev

# Production build with TypeScript checks and minification
bun run build

# Update version in manifest.json and versions.json
bun run version
```

## Architecture Overview

### Current Structure (Sample Plugin)
- `main.ts` - Main plugin entry point extending Obsidian's Plugin class
- `manifest.json` - Plugin metadata
- `styles.css` - Plugin styles
- `esbuild.config.mjs` - Build configuration

### Target Architecture for Strudel Integration

1. **Pattern Management**
   - Track all Strudel code blocks in a note
   - Maintain execution context shared across blocks
   - Handle pattern lifecycle (create, play, stop, destroy)

2. **UI Components**
   - Transform code blocks into interactive editors
   - Add play/pause button overlays
   - Visual feedback for playing patterns
   - Error handling and display

3. **Strudel Integration**
   - Load Strudel library and dependencies
   - Initialize WebAudio context (Superdough)
   - Compile and execute Strudel patterns
   - Handle live code updates while playing

4. **State Management**
   - Per-note pattern registry
   - Shared variable context
   - Audio engine lifecycle
   - Clean up on note close

## Implementation Priorities

1. Replace sample plugin functionality with Strudel pattern detection
2. Integrate Strudel library and initialize audio engine
3. Create interactive code block UI components
4. Implement pattern compilation and execution
5. Add live-coding capabilities with hot reload
6. Handle multi-pattern coordination and shared context

## Testing Approach

Currently no test framework is configured. For testing during development:
- Manual testing in Obsidian's developer vault
- Use console logging for debugging pattern execution
- Test audio output with various Strudel patterns
- Verify memory cleanup when notes are closed