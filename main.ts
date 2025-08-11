import { App, Plugin, PluginSettingTab, Setting, MarkdownPostProcessorContext } from 'obsidian';
import { StrudelMirror } from '@strudel/codemirror';
import { evalScope } from '@strudel/core';
import { transpiler } from '@strudel/transpiler';
import {
	getAudioContext,
	webaudioOutput,
	initAudioOnFirstClick,
	registerSynthSounds,
	samples,
} from '@strudel/webaudio';
import { registerSoundfonts } from '@strudel/soundfonts';

interface StrudelPluginSettings {
	fontSize: number;
	fontFamily: string;
	theme: string;
	isLineWrappingEnabled: boolean;
	isLineNumbersDisplayed: boolean;
	isBracketMatchingEnabled: boolean;
	isBracketClosingEnabled: boolean;
	isAutoCompletionEnabled: boolean;
	isFlashEnabled: boolean;
	isTooltipEnabled: boolean;
	defaultCps: number;
}

const DEFAULT_SETTINGS: StrudelPluginSettings = {
	fontSize: 14,
	fontFamily: 'monospace',
	theme: 'strudelTheme',
	isLineWrappingEnabled: true,
	isLineNumbersDisplayed: true,
	isBracketMatchingEnabled: true,
	isBracketClosingEnabled: true,
	isAutoCompletionEnabled: true,
	isFlashEnabled: true,
	isTooltipEnabled: true,
	defaultCps: 0.6,
};

class StrudelEditor {
	private editor: StrudelMirror | null = null;
	private container: HTMLElement;
	private settings: StrudelPluginSettings;
	private isPlaying = false;

	constructor(container: HTMLElement, code: string, settings: StrudelPluginSettings) {
		this.container = container;
		this.settings = settings;
		this.initialize(code);
	}

	private async initialize(code: string) {
		try {
			// Ensure audio is ready
			initAudioOnFirstClick();

			// Create editor container
			const editorContainer = this.container.createDiv('strudel-editor-container');
			
			// Create controls container
			const controlsContainer = this.container.createDiv('strudel-controls');
			
			// Create play/stop button
			const playButton = controlsContainer.createEl('button', {
				text: 'Play',
				cls: 'strudel-play-button'
			});

			playButton.addEventListener('click', () => {
				this.togglePlayback();
			});

			// Initialize StrudelMirror
			this.editor = new StrudelMirror({
				defaultOutput: webaudioOutput,
				getTime: () => getAudioContext().currentTime,
				transpiler,
				root: editorContainer,
				initialCode: code,
				onError: (error: any) => {
					console.error('Strudel error:', error);
				},
				prebake: async () => {
					try {
						const loadModules = evalScope(
							import('@strudel/core'),
							import('@strudel/mini'),
							import('@strudel/tonal'),
							import('@strudel/webaudio')
						);

						const ds = 'https://raw.githubusercontent.com/felixroos/dough-samples/main/';

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
					} catch (error) {
						console.error('Failed to initialize Strudel modules:', error);
						throw error;
					}
				},
			});

			// Apply settings
			this.updateEditorSettings();

			// Set initial CPS
			if (this.editor.repl?.setCps) {
				this.editor.repl.setCps(this.settings.defaultCps);
			}

		} catch (error) {
			console.error('Failed to initialize Strudel editor:', error);
			this.container.createEl('div', {
				text: `Failed to initialize Strudel editor: ${error.message}`,
				cls: 'strudel-error'
			});
		}
	}

	private updateEditorSettings() {
		if (!this.editor) return;

		const config = {
			fontSize: this.settings.fontSize,
			fontFamily: this.settings.fontFamily,
			theme: this.settings.theme,
			isBracketMatchingEnabled: this.settings.isBracketMatchingEnabled,
			isBracketClosingEnabled: this.settings.isBracketClosingEnabled,
			isLineNumbersDisplayed: this.settings.isLineNumbersDisplayed,
			isActiveLineHighlighted: true,
			isAutoCompletionEnabled: this.settings.isAutoCompletionEnabled,
			isPatternHighlightingEnabled: true,
			isFlashEnabled: this.settings.isFlashEnabled,
			isTooltipEnabled: this.settings.isTooltipEnabled,
			isLineWrappingEnabled: this.settings.isLineWrappingEnabled,
			isTabIndentationEnabled: true,
			isMultiCursorEnabled: true,
		};

		this.editor.updateSettings(config);
	}

	private async togglePlayback() {
		if (!this.editor) return;

		try {
			if (this.isPlaying) {
				this.editor.stop();
				this.isPlaying = false;
				this.updatePlayButton('Play');
			} else {
				await this.editor.evaluate();
				this.isPlaying = true;
				this.updatePlayButton('Stop');
			}
		} catch (error) {
			console.error('Playback error:', error);
			this.isPlaying = false;
			this.updatePlayButton('Play');
		}
	}

	private updatePlayButton(text: string) {
		const button = this.container.querySelector('.strudel-play-button') as HTMLButtonElement;
		if (button) {
			button.textContent = text;
		}
	}

	updateSettings(newSettings: StrudelPluginSettings) {
		this.settings = newSettings;
		this.updateEditorSettings();
		
		if (this.editor?.repl?.setCps) {
			this.editor.repl.setCps(this.settings.defaultCps);
		}
	}

	destroy() {
		if (this.editor) {
			this.editor.stop();
			this.editor.destroy();
			this.editor = null;
		}
	}
}

export default class StrudelPlugin extends Plugin {
	settings: StrudelPluginSettings;
	private strudelEditors: StrudelEditor[] = [];

	async onload() {
		await this.loadSettings();

		// Register code block processor for strudel blocks
		this.registerMarkdownCodeBlockProcessor('strudel', this.processStrudelBlock.bind(this));

		// Add settings tab
		this.addSettingTab(new StrudelSettingTab(this.app, this));
	}

	private processStrudelBlock(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
		// Clear the default content
		el.empty();
		
		// Create Strudel editor
		const editor = new StrudelEditor(el, source, this.settings);
		this.strudelEditors.push(editor);

		// Clean up when element is removed
		this.register(() => {
			const index = this.strudelEditors.indexOf(editor);
			if (index > -1) {
				this.strudelEditors.splice(index, 1);
				editor.destroy();
			}
		});
	}

	onunload() {
		// Clean up all editors
		this.strudelEditors.forEach(editor => editor.destroy());
		this.strudelEditors = [];
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Update all existing editors with new settings
		this.strudelEditors.forEach(editor => editor.updateSettings(this.settings));
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

		containerEl.createEl('h2', { text: 'Strudel Settings' });

		// Font Size
		new Setting(containerEl)
			.setName('Font Size')
			.setDesc('Editor font size in pixels')
			.addSlider(slider => slider
				.setLimits(10, 24, 1)
				.setValue(this.plugin.settings.fontSize)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.fontSize = value;
					await this.plugin.saveSettings();
				}));

		// Font Family
		new Setting(containerEl)
			.setName('Font Family')
			.setDesc('Editor font family')
			.addDropdown(dropdown => dropdown
				.addOption('monospace', 'Monospace')
				.addOption('Courier New', 'Courier New')
				.addOption('Monaco', 'Monaco')
				.addOption('Menlo', 'Menlo')
				.addOption('Consolas', 'Consolas')
				.setValue(this.plugin.settings.fontFamily)
				.onChange(async (value) => {
					this.plugin.settings.fontFamily = value;
					await this.plugin.saveSettings();
				}));

		// Theme
		new Setting(containerEl)
			.setName('Editor Theme')
			.setDesc('Color theme for the editor')
			.addDropdown(dropdown => dropdown
				.addOption('strudelTheme', 'Strudel (Default)')
				.addOption('dracula', 'Dracula')
				.addOption('monokai', 'Monokai')
				.addOption('nord', 'Nord')
				.addOption('materialDark', 'Material Dark')
				.addOption('githubDark', 'GitHub Dark')
				.addOption('solarizedDark', 'Solarized Dark')
				.setValue(this.plugin.settings.theme)
				.onChange(async (value) => {
					this.plugin.settings.theme = value;
					await this.plugin.saveSettings();
				}));

		// Default CPS (Tempo)
		new Setting(containerEl)
			.setName('Default Tempo (CPS)')
			.setDesc('Default cycles per second (tempo) for new Strudel blocks')
			.addSlider(slider => slider
				.setLimits(0.1, 4.0, 0.1)
				.setValue(this.plugin.settings.defaultCps)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.defaultCps = value;
					await this.plugin.saveSettings();
				}));

		// Line Wrapping
		new Setting(containerEl)
			.setName('Line Wrapping')
			.setDesc('Enable line wrapping in the editor')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.isLineWrappingEnabled)
				.onChange(async (value) => {
					this.plugin.settings.isLineWrappingEnabled = value;
					await this.plugin.saveSettings();
				}));

		// Line Numbers
		new Setting(containerEl)
			.setName('Line Numbers')
			.setDesc('Show line numbers in the editor')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.isLineNumbersDisplayed)
				.onChange(async (value) => {
					this.plugin.settings.isLineNumbersDisplayed = value;
					await this.plugin.saveSettings();
				}));

		// Bracket Matching
		new Setting(containerEl)
			.setName('Bracket Matching')
			.setDesc('Highlight matching brackets')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.isBracketMatchingEnabled)
				.onChange(async (value) => {
					this.plugin.settings.isBracketMatchingEnabled = value;
					await this.plugin.saveSettings();
				}));

		// Auto Bracket Closing
		new Setting(containerEl)
			.setName('Auto Bracket Closing')
			.setDesc('Automatically close brackets')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.isBracketClosingEnabled)
				.onChange(async (value) => {
					this.plugin.settings.isBracketClosingEnabled = value;
					await this.plugin.saveSettings();
				}));

		// Autocompletion
		new Setting(containerEl)
			.setName('Autocompletion')
			.setDesc('Enable autocompletion')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.isAutoCompletionEnabled)
				.onChange(async (value) => {
					this.plugin.settings.isAutoCompletionEnabled = value;
					await this.plugin.saveSettings();
				}));

		// Flash Effects
		new Setting(containerEl)
			.setName('Flash Effects')
			.setDesc('Enable visual flash effects when patterns play')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.isFlashEnabled)
				.onChange(async (value) => {
					this.plugin.settings.isFlashEnabled = value;
					await this.plugin.saveSettings();
				}));

		// Tooltips
		new Setting(containerEl)
			.setName('Tooltips')
			.setDesc('Show helpful tooltips in the editor')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.isTooltipEnabled)
				.onChange(async (value) => {
					this.plugin.settings.isTooltipEnabled = value;
					await this.plugin.saveSettings();
				}));
	}
}
