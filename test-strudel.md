# Strudel Plugin Test

This is a test of the Strudel plugin for Obsidian.

## Basic Drum Pattern

```strudel
// Basic drum pattern
stack(
  s("bd ~ bd ~"),     // kick on 1 and 3
  s("~ sd ~ sd"),     // snare on 2 and 4  
  s("hh*8").gain(0.3) // constant hi-hats
)
```

## Simple Melody

```strudel
// Basic melody pattern
note("c4 d4 e4 f4")
  .s("triangle")
  .slow(2)
```

## More Complex Pattern

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