# Advanced Features Demo

This note demonstrates all the Phase 3 Advanced Features of the Obsidian Strudel Plugin.

## 1. Basic Syntax Highlighting

The editor now uses Strudel's CodeMirror integration for professional syntax highlighting:

```strudel
note("c d e f g a b c5").slow(2)
```

**Features to Notice:**
- Syntax highlighting for JavaScript and mini notation
- Professional code editor interface
- Line numbers and code formatting

## 2. Visual Highlighting During Playback

Watch the code highlight in real-time as the pattern plays:

```strudel
"c3 d3 e3 f3 g3 a3 b3 c4".note().slow(1)
```

**Features to Notice:**
- Active pattern elements highlight during playback
- Colors sync with audio timing
- Smooth highlighting animations

## 3. Live Editing (Hot Reload)

Start this pattern playing, then modify the code while it's running:

```strudel
note(sequence("c", "d", "e", "f")).slow(2)
```

**Try These Live Edits:**
1. Change the notes: `sequence("g", "a", "b", "c5")`
2. Change the timing: `.slow(1)` or `.slow(4)`
3. Add effects: `.lpf(sine.range(200, 2000).slow(8))`

**Features to Notice:**
- 400ms debounce delay prevents excessive updates
- Pattern updates automatically during playback
- Seamless transitions between pattern versions

## 4. Complex Pattern Highlighting

Multi-layered patterns show independent highlighting:

```strudel
stack(
  note("c d e f").slow(2),
  note("g a b c5").slow(3).delay(0.25),
  s("bd hh").fast(2)
)
```

**Features to Notice:**
- Each layer highlights independently
- Nested patterns work correctly
- Visual separation of concurrent elements

## 5. Mobile-Optimized Controls

The interface is optimized for touch devices:

**Features to Notice:**
- Play/Stop buttons are minimum 44px (48px on touch devices)
- Touch-friendly spacing and layout
- Responsive design for different screen sizes
- Enhanced touch feedback

## 6. Advanced Live Coding Patterns

Try live editing these more complex patterns:

```strudel
const scale = "c d e f g a b c5".split(" ");
note(choose(scale)).slow(0.5).lpf(rand.range(200, 2000))
```

```strudel
const rhythm = "x . x . x . . x";
s("bd").mask(rhythm).bank("RolandTR808")
```

**Live Editing Ideas:**
- Change the scale array
- Modify the rhythm pattern
- Adjust effect parameters
- Add new layers

## 7. Error Handling During Live Edit

Try introducing syntax errors while playing:

```strudel
note("c d e f").slow(2)
```

**Test Error Scenarios:**
1. Remove a closing parenthesis: `note("c d e f".slow(2)`
2. Use undefined function: `notee("c d e f").slow(2)`
3. Invalid mini notation: `note("c d e z").slow(2)`

**Features to Notice:**
- Graceful error display
- Pattern continues with last valid version
- Error clears when fixed

## Performance Considerations

For optimal live editing performance:

- Debouncing prevents excessive re-compilation
- Visual feedback shows live editing status
- Complex patterns may need longer debounce times
- Mobile devices automatically get optimized touch targets

## Keyboard Shortcuts

With the CodeMirror editor:
- `Ctrl+Enter` / `Cmd+Enter`: Evaluate pattern
- `Ctrl+.` / `Cmd+.`: Stop pattern
- Standard code editing shortcuts work

## Responsive Design

The interface adapts to different screen sizes:
- Desktop: Full feature set with optimal spacing
- Tablet: Adjusted spacing for touch interaction
- Mobile: Larger touch targets and simplified layout

This completes the Phase 3 Advanced Features implementation, providing a professional live coding experience within Obsidian.