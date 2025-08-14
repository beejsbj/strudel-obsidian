import { App, PluginSettingTab, Setting } from "obsidian";
import type StrudelPlugin from "../main"; // type-only to avoid circular runtime deps
import { AVAILABLE_THEMES, FONT_FAMILIES } from "./constants";

export class StrudelSettingTab extends PluginSettingTab {
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
				FONT_FAMILIES.forEach((font) => dropdown.addOption(font, font));
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
				AVAILABLE_THEMES.forEach((theme) =>
					dropdown.addOption(theme.value, theme.label)
				);
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

		this.toggleSetting(
			containerEl,
			"Line Wrapping",
			"Enable line wrapping in the editor",
			"isLineWrappingEnabled"
		);
		this.toggleSetting(
			containerEl,
			"Line Numbers",
			"Show line numbers in the editor",
			"isLineNumbersDisplayed"
		);
		this.toggleSetting(
			containerEl,
			"Bracket Matching",
			"Highlight matching brackets",
			"isBracketMatchingEnabled"
		);
		this.toggleSetting(
			containerEl,
			"Auto Bracket Closing",
			"Automatically close brackets",
			"isBracketClosingEnabled"
		);
		this.toggleSetting(
			containerEl,
			"Autocompletion",
			"Enable code autocompletion",
			"isAutoCompletionEnabled"
		);
		this.toggleSetting(
			containerEl,
			"Pattern Highlighting",
			"Enable pattern syntax highlighting",
			"isPatternHighlightingEnabled"
		);
		this.toggleSetting(
			containerEl,
			"Flash Effects",
			"Enable visual flash effects during evaluation",
			"isFlashEnabled"
		);
		this.toggleSetting(
			containerEl,
			"Tooltips",
			"Show helpful tooltips in the editor",
			"isTooltipEnabled"
		);
		this.toggleSetting(
			containerEl,
			"Tab Indentation",
			"Use tab for indentation instead of spaces",
			"isTabIndentationEnabled"
		);
		this.toggleSetting(
			containerEl,
			"Multi-Cursor",
			"Enable multi-cursor editing",
			"isMultiCursorEnabled"
		);

		// Auto-evaluation settings
		containerEl.createEl("h3", { text: "Auto-Evaluation" });

		this.toggleSetting(
			containerEl,
			"Auto-Evaluate",
			"Automatically evaluate code when typing stops",
			"autoEvaluate"
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

	private toggleSetting(
		container: HTMLElement,
		name: string,
		desc: string,
		key: keyof StrudelPlugin["settings"]
	) {
		new Setting(container)
			.setName(name)
			.setDesc(desc)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings[key] as boolean)
					.onChange(async (value) => {
						(this.plugin.settings[key] as boolean) = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
