import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	MarkdownPostProcessorContext,
	MarkdownRenderChild,
	TFile,
	MarkdownView,
} from "obsidian";

import { StrudelMirror } from "@strudel/codemirror";
import { evalScope } from "@strudel/core";
import { transpiler } from "@strudel/transpiler";
import {
	getAudioContext,
	webaudioOutput,
	initAudioOnFirstClick,
} from "@strudel/webaudio";
import { registerSoundfonts } from "@strudel/soundfonts"; // (kept for backward compatibility if used elsewhere)
import { DEFAULT_SETTINGS, StrudelPluginSettings } from "./src/types";
import { AVAILABLE_THEMES, FONT_FAMILIES } from "./src/constants"; // re-exported lists (may still be used externally)
import { debounce } from "./src/utils";
import { loadStrudelModules } from "./src/strudelLoader";
import { StrudelSettingTab } from "./src/StrudelSettingTab";

// (lists, defaults, utils, and loader extracted to src/* to slim this file)

export default class StrudelPlugin extends Plugin {
	settings: StrudelPluginSettings;
	private editorInstances: Map<Element, StrudelMirror> = new Map();
	private editorStates: Map<
		Element,
		{ isPlaying: boolean; isSolo: boolean; editor: StrudelMirror }
	> = new Map();
	private isInitialized = false;

	async onload() {
		await this.loadSettings();

		// Initialize audio on first click
		initAudioOnFirstClick();

		// Register the code block processor
		this.registerMarkdownCodeBlockProcessor(
			"strudel",
			this.strudelCodeBlockProcessor.bind(this)
		);

		// Add settings tab
		this.addSettingTab(new StrudelSettingTab(this.app, this));

		// Initialize Strudel modules
		await this.initializeStrudelModules();
	}

	onunload() {
		// Clean up all editor instances
		this.editorInstances.forEach((editor) => {
			try {
				editor.stop();
			} catch (error) {
				console.error("Error stopping Strudel editor:", error);
			}
		});
		this.editorInstances.clear();
		this.editorStates.clear();
	}

	// --- Helper methods for solo & playback management ---
	private updateEditorUIState(
		container: Element,
		state: "ready" | "playing" | "loading" | "error"
	) {
		const root = container as HTMLElement;
		const playButton = root.querySelector(
			".strudel-play-button"
		) as HTMLButtonElement | null;
		const statusDot = root.querySelector(
			".strudel-status-dot"
		) as HTMLElement | null;
		const statusIndicator = root.querySelector(
			".strudel-status"
		) as HTMLElement | null;

		if (playButton && state !== "playing") {
			playButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
			playButton.setAttribute("aria-label", "Play");
		}
		if (playButton && state === "playing") {
			playButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>`;
			playButton.setAttribute("aria-label", "Stop");
		}

		if (statusDot) {
			statusDot.className = `strudel-status-dot ${state}`;
		}
		if (statusIndicator) {
			statusIndicator.classList.remove("playing", "loading", "error");
			if (
				state === "playing" ||
				state === "loading" ||
				state === "error"
			) {
				statusIndicator.classList.add(state);
			}
		}
	}

	private stopEditors(
		predicate: (
			element: Element,
			state: {
				isPlaying: boolean;
				isSolo: boolean;
				editor: StrudelMirror;
			}
		) => boolean,
		currentElement?: Element
	) {
		this.editorStates.forEach((state, element) => {
			if (predicate(element, state)) {
				try {
					state.editor.stop();
					state.isPlaying = false;
					this.updateEditorUIState(element, "ready");
				} catch (error) {
					console.error("Error stopping editor:", error);
				}
			}
		});
	}

	private stopAllOtherEditors(currentElement: Element) {
		this.stopEditors(
			(element, state) => element !== currentElement && state.isPlaying
		);
	}

	private hasActiveSoloEditor(excludeElement?: Element): boolean {
		for (const [element, state] of this.editorStates.entries()) {
			if (element !== excludeElement && state.isSolo && state.isPlaying) {
				return true;
			}
		}
		return false;
	}

	private stopAllOtherPlayingEditors(currentElement: Element) {
		this.stopEditors(
			(element, state) => element !== currentElement && state.isPlaying
		);
	}

	private async initializeStrudelModules() {
		if (this.isInitialized) return;

		try {
			await loadStrudelModules();
			this.isInitialized = true;
		} catch (error) {
			console.error("Failed to initialize Strudel modules:", error);
		}
	}

	private async strudelCodeBlockProcessor(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	) {
		// Wait for Strudel to be initialized
		await this.initializeStrudelModules();

		// Create container for the editor and controls
		const container = el.createDiv({ cls: "strudel-container" });

		// Create controls
		const controls = container.createDiv({ cls: "strudel-controls" });

		// Play/Stop/Update buttons with icons
		const playButton = controls.createEl("button", {
			cls: "strudel-play-button",
		});
		playButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
			<path d="M8 5v14l11-7z"/>
		</svg>`;
		playButton.setAttribute("aria-label", "Play");

		const updateButton = controls.createEl("button", {
			cls: "strudel-update-button",
		});
		updateButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
			<path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
		</svg>`;
		updateButton.setAttribute("aria-label", "Update");

		// Solo toggle button
		const soloButton = controls.createEl("button", {
			cls: "strudel-solo-button",
		});
		soloButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
			<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
		</svg>`;
		soloButton.setAttribute("aria-label", "Solo Mode: Off");
		soloButton.classList.add("solo-off");

		// Tempo controls
		const tempoContainer = controls.createDiv({ cls: "strudel-tempo" });
		tempoContainer.createEl("span", { text: "Tempo: " });
		const tempoSlider = tempoContainer.createEl("input", {
			type: "range",
			cls: "strudel-tempo-slider",
		});
		tempoSlider.min = "0.1";
		tempoSlider.max = "4.0";
		tempoSlider.step = "0.1";
		tempoSlider.value = this.settings.cps.toString();

		const tempoValue = tempoContainer.createEl("span", {
			text: this.settings.cps.toFixed(1),
			cls: "strudel-tempo-value",
		});

		// Status indicator with colored dot
		const statusIndicator = controls.createDiv({ cls: "strudel-status" });
		const statusDot = statusIndicator.createEl("span", {
			cls: "strudel-status-dot ready",
		});

		// Create editor container
		const editorContainer = container.createDiv({ cls: "strudel-editor" });

		// Track state
		let isPlaying = false;
		let isSolo = false;
		let suppressInitialOnCode = true;
		let debouncedEvaluate: any;
		let lastSavedCode = source.trim(); // Track the last saved code to avoid unnecessary updates
		let isTyping = false; // Track if user is actively typing
		let typingTimeout: NodeJS.Timeout | null = null;

		// Function to update the code block (without debouncing when typing check fails)
		const updateCodeBlockIfSafe = (code: string) => {
			// Don't update if user is actively typing or editor has focus
			if (
				isTyping ||
				document.activeElement?.closest(".strudel-editor")
			) {
				return false; // Indicate update was skipped
			}

			// Don't update if editor is currently playing (to avoid interrupting playback)
			const currentState = this.editorStates.get(el);
			if (currentState && currentState.isPlaying) {
				return false; // Indicate update was skipped
			}

			if (code !== lastSavedCode) {
				this.updateCodeBlock(ctx, code, el);
				lastSavedCode = code;
				return true; // Indicate update was successful
			}
			return true; // No update needed, but safe to proceed
		};

		// Debounced function to update the code block
		const debouncedUpdateCodeBlock = debounce((code: string) => {
			updateCodeBlockIfSafe(code);
		}, 200);

		// Initialize StrudelMirror with enhanced configuration
		const editor = new StrudelMirror({
			defaultOutput: webaudioOutput,
			getTime: () => getAudioContext().currentTime,
			transpiler,
			root: editorContainer,
			initialCode: source.trim(),
			solo: false, // Disable solo mode to allow multiple patterns simultaneously
			onCode: (code: string) => {
				if (suppressInitialOnCode) {
					suppressInitialOnCode = false;
					return;
				}

				// Update the source in the markdown (debounced to avoid too frequent updates)
				debouncedUpdateCodeBlock(code);

				// Auto-evaluate if enabled
				if (this.settings.autoEvaluate && debouncedEvaluate) {
					debouncedEvaluate();
				}
			},
			onError: (error: any) => {
				console.error("Strudel error:", error);
				this.updateEditorUIState(el, "error");
			},
			prebake: async () => {
				try {
					this.updateEditorUIState(el, "loading");

					await loadStrudelModules();

					this.updateEditorUIState(el, "ready");
				} catch (error: any) {
					console.error(
						"Failed to initialize Strudel modules:",
						error
					);
					this.updateEditorUIState(el, "error");
					throw error;
				}
			},
		});

		// Apply settings to editor
		editor.updateSettings({
			fontSize: this.settings.fontSize,
			fontFamily: this.settings.fontFamily,
			theme: this.settings.theme,
			isLineWrappingEnabled: this.settings.isLineWrappingEnabled,
			isLineNumbersDisplayed: this.settings.isLineNumbersDisplayed,
			isBracketMatchingEnabled: this.settings.isBracketMatchingEnabled,
			isBracketClosingEnabled: this.settings.isBracketClosingEnabled,
			isAutoCompletionEnabled: this.settings.isAutoCompletionEnabled,
			isPatternHighlightingEnabled:
				this.settings.isPatternHighlightingEnabled,
			isFlashEnabled: this.settings.isFlashEnabled,
			isTooltipEnabled: this.settings.isTooltipEnabled,
			isTabIndentationEnabled: this.settings.isTabIndentationEnabled,
			isMultiCursorEnabled: this.settings.isMultiCursorEnabled,
		});

		// Set up debounced evaluate function
		debouncedEvaluate = debounce(async () => {
			if (!editor || statusIndicator.hasClass("loading")) return;

			// Only auto-evaluate if the editor is currently playing
			const currentState = this.editorStates.get(el);
			if (!currentState || !currentState.isPlaying) {
				return;
			}

			await handleEvaluate("typing");
		}, this.settings.autoEvaluateDelay);

		// Set initial CPS
		if (editor.repl?.setCps) {
			editor.repl.setCps(this.settings.cps);
		}

		// Add manual input event listener as fallback (and for typing detection)
		if (editorContainer && this.settings.autoEvaluate) {
			// Add event listeners to track typing activity
			const handleTypingStart = () => {
				isTyping = true;
				if (typingTimeout) {
					clearTimeout(typingTimeout);
				}
			};

			const handleTypingEnd = () => {
				if (typingTimeout) {
					clearTimeout(typingTimeout);
				}
				typingTimeout = setTimeout(() => {
					isTyping = false;
					// Check if there are pending updates and try to update safely
					const currentCode = getEditorContent(editor);
					if (currentCode !== lastSavedCode) {
						updateCodeBlockIfSafe(currentCode);
					}
				}, 1500); // Wait 1.5 seconds after last keystroke
			};

			// Listen for input events (character insertions, deletions)
			editorContainer.addEventListener("input", (event) => {
				handleTypingStart();
				if (debouncedEvaluate) {
					debouncedEvaluate();
				}
				// Delay code block update while typing
				handleTypingEnd();
			});

			// Listen for keyup events (more reliable for text changes)
			editorContainer.addEventListener("keyup", (event) => {
				handleTypingStart();
				// Delay code block update while typing
				handleTypingEnd();
			});

			// Listen for keydown to immediately detect typing start
			editorContainer.addEventListener("keydown", (event) => {
				handleTypingStart();
			});

			// Listen for paste events
			editorContainer.addEventListener("paste", (event) => {
				handleTypingStart();
				setTimeout(() => {
					handleTypingEnd();
				}, 50); // Small delay to let paste complete
			});

			// When editor loses focus, stop typing immediately and save
			editorContainer.addEventListener("blur", () => {
				isTyping = false;
				if (typingTimeout) {
					clearTimeout(typingTimeout);
					typingTimeout = null;
				}
				// Save any pending changes immediately when focus is lost
				const currentCode = getEditorContent(editor);
				if (currentCode !== lastSavedCode) {
					this.updateCodeBlock(ctx, currentCode, el);
					lastSavedCode = currentCode;
				}
			});
		}

		// Helper function to get current editor content
		function getEditorContent(editor: StrudelMirror): string {
			try {
				// Use the editor.code property directly
				return editor.code || "";
			} catch (error) {
				return "";
			}
		}

		// Store editor instance and state
		this.editorInstances.set(el, editor);
		this.editorStates.set(el, { isPlaying: false, isSolo: false, editor });

		// Handle evaluate function
		const handleEvaluate = async (source = "manual") => {
			if (!editor) return;

			try {
				this.updateEditorUIState(el, "loading");

				const currentState = this.editorStates.get(el);

				if (currentState) {
					if (currentState.isSolo) {
						// If this editor has solo enabled, stop all other editors
						this.stopAllOtherPlayingEditors(el);
					} else {
						// If this editor doesn't have solo but there are active solo editors, stop them
						if (this.hasActiveSoloEditor(el)) {
							this.stopAllOtherPlayingEditors(el);
						}
						// If no solo editors are active, allow simultaneous playback (don't stop others)
					}
				}

				await editor.evaluate();

				this.updateEditorUIState(el, "playing");
				isPlaying = true;

				// Update state
				if (currentState) {
					currentState.isPlaying = true;
				}

				// Update play button to stop icon
				playButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
					<rect x="6" y="6" width="12" height="12"/>
				</svg>`;
				playButton.setAttribute("aria-label", "Stop");
			} catch (error: any) {
				console.error("Error during evaluation:", error);
				this.updateEditorUIState(el, "error");
				isPlaying = false;

				// Update state
				const currentState = this.editorStates.get(el);
				if (currentState) {
					currentState.isPlaying = false;
				}

				// Reset play button to play icon
				playButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
					<path d="M8 5v14l11-7z"/>
				</svg>`;
				playButton.setAttribute("aria-label", "Play");
			}
		};

		// Handle stop function
		const handleStop = () => {
			try {
				if (editor) {
					editor.stop();
				}
				this.updateEditorUIState(el, "ready");
				isPlaying = false;

				// Update state
				const currentState = this.editorStates.get(el);
				if (currentState) {
					currentState.isPlaying = false;
				}

				// Reset play button to play icon
				playButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
					<path d="M8 5v14l11-7z"/>
				</svg>`;
				playButton.setAttribute("aria-label", "Play");

				// After stopping, check if there are pending code changes to save
				const currentCode = getEditorContent(editor);
				if (currentCode !== lastSavedCode) {
					setTimeout(() => {
						// Small delay to ensure stop is fully processed
						updateCodeBlockIfSafe(currentCode);
					}, 100);
				}
			} catch (error: any) {
				console.error("Error stopping playback:", error);
			}
		};

		// Play/Stop button functionality
		playButton.addEventListener("click", async () => {
			try {
				// Check the global state instead of local isPlaying variable
				const currentState = this.editorStates.get(el);
				const isCurrentlyPlaying = currentState?.isPlaying || false;

				if (isCurrentlyPlaying) {
					handleStop();
				} else {
					await handleEvaluate("manual");
				}
			} catch (error) {
				console.error("Error toggling playback:", error);
				handleStop();
			}
		});

		// Update button functionality
		updateButton.addEventListener("click", async () => {
			await handleEvaluate("update");
		});

		// Solo button functionality
		soloButton.addEventListener("click", () => {
			const currentState = this.editorStates.get(el);
			if (!currentState) return;

			// Toggle solo state
			currentState.isSolo = !currentState.isSolo;
			isSolo = currentState.isSolo;

			if (currentState.isSolo) {
				soloButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
					<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
				</svg>`;
				soloButton.setAttribute("aria-label", "Solo Mode: On");
				soloButton.classList.remove("solo-off");
				soloButton.classList.add("solo-on");

				// If this editor is playing and solo is turned on, stop all other editors
				if (currentState.isPlaying) {
					this.stopAllOtherEditors(el);
				}
			} else {
				soloButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
				</svg>`;
				soloButton.setAttribute("aria-label", "Solo Mode: Off");
				soloButton.classList.remove("solo-on");
				soloButton.classList.add("solo-off");
			}
		});

		// Tempo slider functionality
		tempoSlider.addEventListener("input", (event) => {
			const target = event.target as HTMLInputElement;
			const newCps = parseFloat(target.value);
			tempoValue.textContent = newCps.toFixed(1);
			if (editor.repl?.setCps) {
				editor.repl.setCps(newCps);
			}
		});

		// Store reference to this for event handlers
		const plugin = this;

		// Clean up when element is removed
		const child = new MarkdownRenderChild(container);
		child.onunload = () => {
			// Save any pending changes before cleanup
			try {
				const currentCode = getEditorContent(editor);
				if (currentCode !== lastSavedCode) {
					// Force save without safety checks since we're cleaning up
					this.updateCodeBlock(ctx, currentCode, el);
				}
			} catch (error) {
				// Ignore errors during cleanup
			}

			if (debouncedEvaluate?.cancel) {
				debouncedEvaluate.cancel();
			}

			if (debouncedUpdateCodeBlock?.cancel) {
				debouncedUpdateCodeBlock.cancel();
			}

			// Clear any pending typing timeout
			if (typingTimeout) {
				clearTimeout(typingTimeout);
				typingTimeout = null;
			}

			if (this.editorInstances.has(el)) {
				const editorInstance = this.editorInstances.get(el);
				try {
					editorInstance?.stop();
				} catch (error) {
					console.error("Error stopping editor:", error);
				}
				this.editorInstances.delete(el);
				this.editorStates.delete(el);
			}
		};
		ctx.addChild(child);
	}

	private async updateCodeBlock(
		ctx: MarkdownPostProcessorContext,
		newCode: string,
		el: HTMLElement
	) {
		try {
			// Get the active markdown view
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!view || !view.editor) {
				return;
			}

			// Get section information for this code block
			const sectionInfo = ctx.getSectionInfo(el);
			if (!sectionInfo) {
				return;
			}

			const { lineStart, lineEnd } = sectionInfo;

			// Validate that we have a proper code block structure
			if (lineStart >= lineEnd - 1) {
				return;
			}

			// Get the current content to check if we need to update
			const codeStartLine = lineStart + 1;
			const codeEndLine = lineEnd - 1;

			// Get the current code content
			let currentCode = "";
			for (let i = codeStartLine; i <= codeEndLine; i++) {
				if (i > codeStartLine) currentCode += "\n";
				currentCode += view.editor.getLine(i);
			}

			// Only update if the code has actually changed
			if (currentCode === newCode) {
				return;
			}

			// Replace the content between the code block markers
			view.editor.replaceRange(
				newCode,
				{ line: codeStartLine, ch: 0 },
				{
					line: codeEndLine,
					ch: view.editor.getLine(codeEndLine).length,
				}
			);
		} catch (error) {
			console.error("[Strudel] Failed to update code block:", error);
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Update all existing editors with new settings
		this.updateAllEditors();
	}

	private updateAllEditors() {
		this.editorInstances.forEach((editor) => {
			try {
				editor.updateSettings({
					fontSize: this.settings.fontSize,
					fontFamily: this.settings.fontFamily,
					theme: this.settings.theme,
					isLineWrappingEnabled: this.settings.isLineWrappingEnabled,
					isLineNumbersDisplayed:
						this.settings.isLineNumbersDisplayed,
					isBracketMatchingEnabled:
						this.settings.isBracketMatchingEnabled,
					isBracketClosingEnabled:
						this.settings.isBracketClosingEnabled,
					isAutoCompletionEnabled:
						this.settings.isAutoCompletionEnabled,
					isPatternHighlightingEnabled:
						this.settings.isPatternHighlightingEnabled,
					isFlashEnabled: this.settings.isFlashEnabled,
					isTooltipEnabled: this.settings.isTooltipEnabled,
					isTabIndentationEnabled:
						this.settings.isTabIndentationEnabled,
					isMultiCursorEnabled: this.settings.isMultiCursorEnabled,
				});

				if (editor.repl?.setCps) {
					editor.repl.setCps(this.settings.cps);
				}
			} catch (error) {
				console.error("Error updating editor settings:", error);
			}
		});
	}
}

// Settings tab class extracted to src/StrudelSettingTab.ts
