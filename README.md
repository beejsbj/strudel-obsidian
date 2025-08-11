# Strudel REPL

Render Strudel code blocks in Obsidian as an interactive playground.

Creating a fenced code block with the language `strudel` turns the block
into a [Strudel](https://strudel.cc) editor with a Play/Stop toggle:

````
```strudel
note("c4 d4 e4 f4").s("triangle")
```
````

The editor uses your plugin settings for font size, wrapping, theme, line
numbers, bracket matching, bracket closing and autocompletion.

## Development

* `npm install`
* `npm run dev` – build in watch mode
* `npm run build` – build once and type‑check

