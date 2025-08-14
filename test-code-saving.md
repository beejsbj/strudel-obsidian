# Test Code Block Saving

This file tests the code block saving functionality. When you edit the code in the Strudel editor below, the changes should be automatically saved back to this markdown file.

```strudel
sound("bd hh")
```

## Instructions

1. Open this file in Obsidian
2. Edit the code in the Strudel editor
3. Wait for 1 second after stopping typing
4. Switch to source mode or close/reopen the note
5. Verify that your changes have been saved

## Expected Behavior

-   Changes made in the Strudel editor should automatically update the markdown source
-   Updates are debounced (delayed by 1 second) to avoid excessive saving
-   Only the specific code block being edited should be updated
-   Multiple Strudel code blocks in the same file should work independently

```strudel
"c3 e3 g3".chord()
```
