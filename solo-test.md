# Solo Mode Test

Test multiple Strudel blocks with solo functionality.

## Pattern 1 - Drums

```strudel
s("bd hh sd hh")
```

## Pattern 2 - Bass

```strudel
note("c2 f2 g2 c2").s("sawtooth").lpf(400).slow(2)
```

## Pattern 3 - Melody

```strudel
note("c4 d4 e4 f4").s("triangle").slow(2)
```

## How to test:

1. **Normal simultaneous playback**: With all solo buttons OFF (default), you should be able to play multiple patterns simultaneously.

2. **Solo mode**:

    - Turn ON solo for Pattern 1 (click the star button)
    - Start Pattern 1 - it should play normally and stop any other playing patterns
    - Start Pattern 2 or 3 (with solo OFF) - they should stop Pattern 1 and start playing themselves

3. **Solo takes control**:

    - Turn ON solo for Pattern 2
    - Start Pattern 2 - it should stop any other playing patterns
    - Any other pattern (solo or non-solo) that starts will stop Pattern 2

4. **The rule is simple**:
    - **Solo ON**: When started, stops all other patterns
    - **Solo OFF**: When started, stops any currently playing solo patterns, allows simultaneous playback with other non-solo patterns

The star button should be:

-   **Hollow/outlined** when solo is OFF
-   **Filled/solid** when solo is ON
