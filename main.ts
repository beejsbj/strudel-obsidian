import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	MarkdownPostProcessorContext,
	MarkdownRenderChild,
	TFile,
} from "obsidian";

import { StrudelMirror } from "@strudel/codemirror";
import { evalScope } from "@strudel/core";
import { transpiler } from "@strudel/transpiler";
import {
	getAudioContext,
	webaudioOutput,
	initAudioOnFirstClick,
	registerSynthSounds,
	samples,
} from "@strudel/webaudio";
import { registerSoundfonts } from "@strudel/soundfonts";

/**
 * Simple trailing debounce helper for auto-evaluating after typing
 */
function debounce(fn: Function, wait = 500) {
	let timeout: NodeJS.Timeout;
	const debounced = (...args: any[]) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => fn(...args), wait);
	};
	debounced.cancel = () => {
		clearTimeout(timeout);
	};
	return debounced;
}

interface StrudelPluginSettings {
	fontSize: number;
	fontFamily: string;
	theme: string;
	isLineWrappingEnabled: boolean;
	isLineNumbersDisplayed: boolean;
	isBracketMatchingEnabled: boolean;
	isBracketClosingEnabled: boolean;
	isAutoCompletionEnabled: boolean;
	isPatternHighlightingEnabled: boolean;
	isFlashEnabled: boolean;
	isTooltipEnabled: boolean;
	isTabIndentationEnabled: boolean;
	isMultiCursorEnabled: boolean;
	autoEvaluate: boolean;
	autoEvaluateDelay: number;
	cps: number;
}

const DEFAULT_SETTINGS: StrudelPluginSettings = {
	fontSize: 14,
	fontFamily: "Courier New",
	theme: "strudelTheme",
	isLineWrappingEnabled: true,
	isLineNumbersDisplayed: true,
	isBracketMatchingEnabled: true,
	isBracketClosingEnabled: true,
	isAutoCompletionEnabled: false,
	isPatternHighlightingEnabled: true,
	isFlashEnabled: true,
	isTooltipEnabled: true,
	isTabIndentationEnabled: true,
	isMultiCursorEnabled: true,
	autoEvaluate: true,
	autoEvaluateDelay: 500,
	cps: 0.5,
};

const AVAILABLE_THEMES = [
	{ value: "strudelTheme", label: "Strudel (Default)" },
	{ value: "algoboy", label: "Algoboy" },
	{ value: "CutiePi", label: "CutiePi" },
	{ value: "sonicPink", label: "Sonic Pink" },
	{ value: "blackscreen", label: "Black Screen" },
	{ value: "bluescreen", label: "Blue Screen" },
	{ value: "whitescreen", label: "White Screen" },
	{ value: "teletext", label: "Teletext" },
	{ value: "greenText", label: "Green Text" },
	{ value: "redText", label: "Red Text" },
	{ value: "dracula", label: "Dracula" },
	{ value: "monokai", label: "Monokai" },
	{ value: "nord", label: "Nord" },
	{ value: "sublime", label: "Sublime" },
	{ value: "darcula", label: "Darcula" },
	{ value: "atomone", label: "Atom One" },
	{ value: "materialDark", label: "Material Dark" },
	{ value: "materialLight", label: "Material Light" },
	{ value: "tokyoNight", label: "Tokyo Night" },
	{ value: "githubDark", label: "GitHub Dark" },
	{ value: "githubLight", label: "GitHub Light" },
	{ value: "vscodeDark", label: "VS Code Dark" },
	{ value: "vscodeLight", label: "VS Code Light" },
	{ value: "solarizedDark", label: "Solarized Dark" },
	{ value: "solarizedLight", label: "Solarized Light" },
	{ value: "gruvboxDark", label: "Gruvbox Dark" },
	{ value: "gruvboxLight", label: "Gruvbox Light" },
];

const FONT_FAMILIES = [
	"Courier New",
	"Monaco",
	"Menlo",
	"Consolas",
	"SF Mono",
	"monospace",
];

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
				console.error("Error stoping Strudel editor:", error);
			}
		});
		this.editorInstances.clear();
		this.editorStates.clear();
	}

	// Helper methods for solo management
	private stopAllOtherEditors(currentElement: Element) {
		this.editorStates.forEach((state, element) => {
			if (element !== currentElement && state.isPlaying) {
				try {
					state.editor.stop();
					state.isPlaying = false;

					// Update UI for stopped editors
					const container = element as HTMLElement;
					const playButton = container.querySelector(
						".strudel-play-button"
					) as HTMLButtonElement;
					const statusDot = container.querySelector(
						".strudel-status-dot"
					) as HTMLElement;
					const statusIndicator = container.querySelector(
						".strudel-status"
					) as HTMLElement;

					if (playButton) {
						playButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
							<path d="M8 5v14l11-7z"/>
						</svg>`;
						playButton.setAttribute("aria-label", "Play");
					}

					if (statusDot) {
						statusDot.className = "strudel-status-dot ready";
					}

					if (statusIndicator) {
						statusIndicator.classList.remove(
							"playing",
							"loading",
							"error"
						);
					}
				} catch (error) {
					console.error("Error stopping editor:", error);
				}
			}
		});
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
		this.editorStates.forEach((state, element) => {
			if (element !== currentElement && state.isPlaying) {
				try {
					state.editor.stop();
					state.isPlaying = false;

					// Update UI for stopped editors
					const container = element as HTMLElement;
					const playButton = container.querySelector(
						".strudel-play-button"
					) as HTMLButtonElement;
					const statusDot = container.querySelector(
						".strudel-status-dot"
					) as HTMLElement;
					const statusIndicator = container.querySelector(
						".strudel-status"
					) as HTMLElement;

					if (playButton) {
						playButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
							<path d="M8 5v14l11-7z"/>
						</svg>`;
						playButton.setAttribute("aria-label", "Play");
					}

					if (statusDot) {
						statusDot.className = "strudel-status-dot ready";
					}

					if (statusIndicator) {
						statusIndicator.classList.remove(
							"playing",
							"loading",
							"error"
						);
					}
				} catch (error) {
					console.error("Error stopping editor:", error);
				}
			}
		});
	}

	private async initializeStrudelModules() {
		if (this.isInitialized) return;

		try {
			const loadModules = evalScope(
				import("@strudel/core"),
				import("@strudel/mini"),
				import("@strudel/tonal"),
				import("@strudel/webaudio")
			);

			const ds =
				"https://raw.githubusercontent.com/felixroos/dough-samples/main/";

			await Promise.all([
				loadModules,
				samples(`${ds}/tidal-drum-machines.json`),
				samples(`${ds}/piano.json`),
				samples(`${ds}/Dirt-Samples.json`),
				samples(`${ds}/EmuSP12.json`),
				samples(`${ds}/vcsl.json`),
				samples(`${ds}/mridangam.json`),
				registerSynthSounds(),
				registerSoundfonts(),
			]);

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
		// console.log("blockprocer", el, ctx);
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

		// Initialize StrudelMirror with enhanced configuration
		const editor = new StrudelMirror({
			defaultOutput: webaudioOutput,
			getTime: () => getAudioContext().currentTime,
			transpiler,
			root: editorContainer,
			initialCode: source.trim(),
			solo: false, // Disable solo mode to allow multiple patterns simultaneously
			onCode: (code: string) => {
				console.log(code);
				if (suppressInitialOnCode) {
					suppressInitialOnCode = false;
					return;
				}

				// Update the source in the markdown
				this.updateCodeBlock(ctx, code);

				// Auto-evaluate if enabled
				if (this.settings.autoEvaluate && debouncedEvaluate) {
					console.debug(
						"[Strudel] onCode change, scheduling evaluate"
					);
					debouncedEvaluate();
				}
			},
			onError: (error: any) => {
				console.error("Strudel error:", error);
				statusDot.className = "strudel-status-dot error";
				statusIndicator.removeClass("playing", "loading");
				statusIndicator.addClass("error");
			},
			prebake: async () => {
				try {
					statusDot.className = "strudel-status-dot loading";
					statusIndicator.addClass("loading");

					const loadModules = evalScope(
						import("@strudel/core"),
						import("@strudel/mini"),
						import("@strudel/tonal"),
						import("@strudel/webaudio")
					);

					const ds =
						"https://raw.githubusercontent.com/felixroos/dough-samples/main/";

					await Promise.all([
						loadModules,
						samples(`${ds}/tidal-drum-machines.json`),
						samples(`${ds}/piano.json`),
						samples(`${ds}/Dirt-Samples.json`),
						samples(`${ds}/EmuSP12.json`),
						samples(`${ds}/vcsl.json`),
						samples(`${ds}/mridangam.json`),
						registerSynthSounds(),
						registerSoundfonts(),
					]);

					statusDot.className = "strudel-status-dot ready";
					statusIndicator.removeClass("loading");
				} catch (error: any) {
					console.error(
						"Failed to initialize Strudel modules:",
						error
					);
					statusDot.className = "strudel-status-dot error";
					statusIndicator.removeClass("loading");
					statusIndicator.addClass("error");
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
				console.debug(
					"[Strudel] Skipping auto-evaluate - editor not playing"
				);
				return;
			}

			console.debug("[Strudel] debouncedEvaluate firing");
			await handleEvaluate("typing");
		}, this.settings.autoEvaluateDelay);

		// Set initial CPS
		if (editor.repl?.setCps) {
			editor.repl.setCps(this.settings.cps);

			// editor.solo = false;
		}

		// Add manual input event listener as fallback (like in demo.vue)
		if (editorContainer && this.settings.autoEvaluate) {
			editorContainer.addEventListener("input", () => {
				if (debouncedEvaluate) {
					console.debug(
						"[Strudel] Manual input event, scheduling evaluate"
					);
					debouncedEvaluate();
				}
			});
		}

		// Store editor instance and state
		this.editorInstances.set(el, editor);
		this.editorStates.set(el, { isPlaying: false, isSolo: false, editor });

		console.log(this.editorInstances, editor);

		// Handle evaluate function
		const handleEvaluate = async (source = "manual") => {
			if (!editor) return;

			try {
				console.debug(
					`[Strudel] handleEvaluate() start (source=${source})`
				);
				statusDot.className = "strudel-status-dot loading";
				statusIndicator.removeClass("error", "playing");
				statusIndicator.addClass("loading");

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

				statusDot.className = "strudel-status-dot playing";
				statusIndicator.removeClass("loading");
				statusIndicator.addClass("playing");
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
				statusDot.className = "strudel-status-dot error";
				statusIndicator.removeClass("loading", "playing");
				statusIndicator.addClass("error");
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
					console.log(editor);
					editor.stop();
				}
				statusDot.className = "strudel-status-dot ready";
				statusIndicator.removeClass("playing", "loading", "error");
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
			if (debouncedEvaluate?.cancel) {
				debouncedEvaluate.cancel();
			}

			if (this.editorInstances.has(el)) {
				const editorInstance = this.editorInstances.get(el);
				try {
					editorInstance?.stop();
				} catch (error) {
					console.error("Error stoping editor:", error);
				}
				this.editorInstances.delete(el);
				this.editorStates.delete(el);
			}
		};
		ctx.addChild(child);
	}

	private async updateCodeBlock(
		ctx: MarkdownPostProcessorContext,
		newCode: string
	) {
		// Get the file
		const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
		if (!file || !(file instanceof TFile) || file.extension !== "md") {
			return;
		}

		try {
			// Read the current file content
			const content = await this.app.vault.read(file);

			// Simple approach: find and replace the first strudel code block
			// This could be improved to handle multiple blocks more precisely
			const strudelBlockRegex = /```strudel\n([\s\S]*?)\n```/;
			const match = content.match(strudelBlockRegex);

			if (match) {
				const newContent = content.replace(
					strudelBlockRegex,
					`\`\`\`strudel\n${newCode}\n\`\`\``
				);
				await this.app.vault.modify(file, newContent);
			}
		} catch (error) {
			console.error("Failed to update code block:", error);
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

class StrudelSettingTab extends PluginSettingTab {
	plugin: StrudelPlugin;

	constructor(app: App, plugin: StrudelPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Strudel Plugin Settings" });

		// Font Size
		new Setting(containerEl)
			.setName("Font Size")
			.setDesc("Font size for the code editor")
			.addSlider((slider) =>
				slider
					.setLimits(10, 24, 1)
					.setValue(this.plugin.settings.fontSize)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.fontSize = value;
						await this.plugin.saveSettings();
					})
			);

		// Font Family
		new Setting(containerEl)
			.setName("Font Family")
			.setDesc("Font family for the code editor")
			.addDropdown((dropdown) => {
				FONT_FAMILIES.forEach((font) => {
					dropdown.addOption(font, font);
				});
				dropdown
					.setValue(this.plugin.settings.fontFamily)
					.onChange(async (value) => {
						this.plugin.settings.fontFamily = value;
						await this.plugin.saveSettings();
					});
			});

		// Theme
		new Setting(containerEl)
			.setName("Editor Theme")
			.setDesc("Color theme for the code editor")
			.addDropdown((dropdown) => {
				AVAILABLE_THEMES.forEach((theme) => {
					dropdown.addOption(theme.value, theme.label);
				});
				dropdown
					.setValue(this.plugin.settings.theme)
					.onChange(async (value) => {
						this.plugin.settings.theme = value;
						await this.plugin.saveSettings();
					});
			});

		// Default Tempo
		new Setting(containerEl)
			.setName("Default Tempo (CPS)")
			.setDesc("Default cycles per second for new editors")
			.addSlider((slider) =>
				slider
					.setLimits(0.1, 4.0, 0.1)
					.setValue(this.plugin.settings.cps)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.cps = value;
						await this.plugin.saveSettings();
					})
			);

		// Editor Features
		containerEl.createEl("h3", { text: "Editor Features" });

		new Setting(containerEl)
			.setName("Line Wrapping")
			.setDesc("Enable line wrapping in the editor")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.isLineWrappingEnabled)
					.onChange(async (value) => {
						this.plugin.settings.isLineWrappingEnabled = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Line Numbers")
			.setDesc("Show line numbers in the editor")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.isLineNumbersDisplayed)
					.onChange(async (value) => {
						this.plugin.settings.isLineNumbersDisplayed = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Bracket Matching")
			.setDesc("Highlight matching brackets")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.isBracketMatchingEnabled)
					.onChange(async (value) => {
						this.plugin.settings.isBracketMatchingEnabled = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Auto Bracket Closing")
			.setDesc("Automatically close brackets")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.isBracketClosingEnabled)
					.onChange(async (value) => {
						this.plugin.settings.isBracketClosingEnabled = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Autocompletion")
			.setDesc("Enable code autocompletion")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.isAutoCompletionEnabled)
					.onChange(async (value) => {
						this.plugin.settings.isAutoCompletionEnabled = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Pattern Highlighting")
			.setDesc("Enable pattern syntax highlighting")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.isPatternHighlightingEnabled)
					.onChange(async (value) => {
						this.plugin.settings.isPatternHighlightingEnabled =
							value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Flash Effects")
			.setDesc("Enable visual flash effects during evaluation")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.isFlashEnabled)
					.onChange(async (value) => {
						this.plugin.settings.isFlashEnabled = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Tooltips")
			.setDesc("Show helpful tooltips in the editor")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.isTooltipEnabled)
					.onChange(async (value) => {
						this.plugin.settings.isTooltipEnabled = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Tab Indentation")
			.setDesc("Use tab for indentation instead of spaces")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.isTabIndentationEnabled)
					.onChange(async (value) => {
						this.plugin.settings.isTabIndentationEnabled = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Multi-Cursor")
			.setDesc("Enable multi-cursor editing")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.isMultiCursorEnabled)
					.onChange(async (value) => {
						this.plugin.settings.isMultiCursorEnabled = value;
						await this.plugin.saveSettings();
					})
			);

		// Auto-evaluation settings
		containerEl.createEl("h3", { text: "Auto-Evaluation" });

		new Setting(containerEl)
			.setName("Auto-Evaluate")
			.setDesc("Automatically evaluate code when typing stops")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoEvaluate)
					.onChange(async (value) => {
						this.plugin.settings.autoEvaluate = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Auto-Evaluate Delay")
			.setDesc("Delay in milliseconds before auto-evaluation")
			.addSlider((slider) =>
				slider
					.setLimits(100, 2000, 100)
					.setValue(this.plugin.settings.autoEvaluateDelay)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.autoEvaluateDelay = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
