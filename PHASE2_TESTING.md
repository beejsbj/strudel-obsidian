# Phase 2 Testing Guide

This document provides test cases to validate the Phase 2 Core Functionality implementation of the Obsidian Strudel Plugin.

## Overview of Implemented Features

### 1. StrudelNotebook Class
- **Per-note context management**: Each note gets its own isolated context
- **Shared variable scope**: Variables persist between blocks within the same note
- **Pattern compilation and execution**: Handles Strudel pattern compilation with error handling
- **Automatic cleanup**: Resources are cleaned up when notes are closed

### 2. Enhanced Transport Controls
- **Robust state management**: Play/stop buttons with proper state tracking
- **Visual feedback**: Status indicators show compilation, playing, error states
- **Pattern lifecycle**: Create, play, stop, cleanup phases properly managed
- **Multiple pattern coordination**: Handle multiple patterns in same note

### 3. Error Handling System
- **Compilation error display**: User-friendly error messages with line numbers
- **Runtime error catching**: Graceful handling of pattern execution errors
- **Error state management**: Visual error indicators and recovery mechanisms
- **Non-intrusive display**: Errors don't break the UI flow

## Test Cases

### Test 1: Basic Pattern Playback
Create a note with a simple Strudel pattern:

```strudel
sound("bd sd").n(0)
```

**Expected Behavior:**
- Play button appears with "▶ Play" text
- Status shows "Ready"
- Clicking play shows "Compiling..." then "Playing"
- Stop button appears, play button hides
- Audio plays basic beat pattern

### Test 2: Shared Context Between Blocks
Create a note with multiple blocks to test variable persistence:

Block 1:
```strudel
let myPattern = sound("bd sd")
myPattern
```

Block 2:
```strudel
myPattern.slow(2)
```

**Expected Behavior:**
- Block 1 plays successfully
- Block 2 can access `myPattern` variable from Block 1
- Both patterns can play independently
- Variables defined in Block 1 persist in Block 2's context

### Test 3: Context Isolation Between Notes
Create two different notes with conflicting variable names:

Note A:
```strudel
let tempo = 120
sound("bd").fast(tempo/60)
```

Note B:
```strudel
let tempo = 140
sound("hh").fast(tempo/60)
```

**Expected Behavior:**
- Each note maintains its own `tempo` variable
- No variable conflicts between notes
- Switching between notes stops all patterns
- Each note's context remains isolated

### Test 4: Error Handling
Create a block with intentional syntax error:

```strudel
sound("bd").invalidMethod()
```

**Expected Behavior:**
- Status shows "Compiling..." then "Error"
- Error display appears below controls
- Error message explains the issue
- Play button remains available for retry
- Error display disappears when fixed and retried

### Test 5: Multiple Patterns in Same Note
Create a note with multiple patterns:

Block 1:
```strudel
sound("bd sd").n(0)
```

Block 2:
```strudel
sound("hh").fast(2)
```

Block 3:
```strudel
sound("cp").slow(4)
```

**Expected Behavior:**
- All patterns can play simultaneously
- Each has independent play/stop controls
- Status indicators work independently
- Shared variables work across all blocks

### Test 6: Pattern Lifecycle Management
Test the complete lifecycle:

1. Create pattern
2. Play pattern
3. Stop pattern
4. Modify code
5. Play again

**Expected Behavior:**
- Clean transitions between states
- No memory leaks or hanging patterns
- Proper cleanup when stopping
- Modified code recompiles correctly

### Test 7: Note Switching Behavior
1. Open Note A with playing patterns
2. Switch to Note B
3. Return to Note A

**Expected Behavior:**
- Patterns stop when switching away from Note A
- UI updates to reflect stopped state
- Note B context is isolated
- Returning to Note A allows patterns to be replayed

## UI Elements to Verify

### Transport Controls
- ▶ Play button (shows when stopped)
- ⏹ Stop button (shows when playing)
- Status indicator with appropriate colors and states

### Status States
- "Ready" - Initial state
- "Compiling..." - During pattern compilation (with pulse animation)
- "Playing" - When pattern is active (green background)
- "Stopped" - After stopping (gray background)
- "Error" - When compilation/runtime error occurs (red background)

### Error Display
- Error header with "Compilation Error" title
- Clear error message in monospace font
- Line/column information when available
- Clean error clearing when resolved

## Performance Considerations

### Memory Management
- Patterns are properly cleaned up when stopped
- Notebooks are cleaned up when plugin unloads
- No memory leaks from hanging audio contexts
- Proper disposal of widgets and event listeners

### Audio Context Management
- Audio context resumes properly when needed
- Multiple patterns coordinate without conflicts
- Clean audio shutdown when plugin unloads

## Known Limitations

1. **Shared Context Implementation**: The current shared context implementation uses `eval` for variable capture, which may have security implications in production
2. **Error Location**: Line numbers in errors may not perfectly match due to code wrapping
3. **Pattern Coordination**: Multiple patterns playing simultaneously may cause timing conflicts

## Next Steps (Phase 3)

After validating Phase 2, the next phase should focus on:
1. Enhanced code editing with syntax highlighting
2. Live code editing while patterns are playing
3. Pattern synchronization and timing coordination
4. Visual feedback for pattern activity
5. Performance optimizations for large notebooks