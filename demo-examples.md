# Strudel Plugin Demo

This note demonstrates the Strudel Obsidian plugin functionality.

## Basic Drum Pattern

```strudel
s("bd hh sd hh")
```

## Simple Melody

```strudel
note("c4 d4 e4 f4").s("triangle").slow(2)
```

## Complex Pattern with Effects

```strudel
stack(
  // Kick and snare
  s("bd ~ bd ~"),
  s("~ sd ~ sd"),

  // Hi-hats
  s("hh*8").gain(0.3),

  // Bass line
  note("c2 ~ f2 g2").s("sawtooth").lpf(400).gain(0.6)
).slow(0.8)
```

## Melodic Pattern with Moving Filter

```strudel
note("c4 eb4 f4 g4 ab4 g4 f4 eb4")
  .s("sawtooth")
  .lpf(sine.range(200, 2000).slow(4))
  .delay(0.25)
  .gain(0.7)
  .slow(1.5)
```

## Polyrhythmic Example

```strudel
stack(
  // 3 notes per cycle
  note("c4*3").s("triangle"),

  // 4 notes per cycle
  note("g3*4").s("sine").gain(0.5),

  // 2 kicks per cycle
  s("bd*2"),

  // Snare on 2 and 4
  s("sd").struct("~ x ~ x")
)
```

## Interactive with Sliders

```strudel
note("c4 d4 e4 f4")
  .s("triangle")
  .gain(0.7)
  .lpf(1000)
  .delay(0.2)
  .slow(2)
```

Each code block above should render as an interactive Strudel editor with:

-   Play/Stop button
-   Tempo slider
-   Full code editing capabilities
-   Real-time audio playback

Try editing the patterns and clicking play to hear the results!
