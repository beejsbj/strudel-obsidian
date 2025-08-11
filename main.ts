import { App, MarkdownPostProcessorContext, MarkdownRenderChild, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { StrudelMirror } from '@strudel/codemirror';
import { evalScope } from '@strudel/core';
import { transpiler } from '@strudel/transpiler';
import { getAudioContext, initAudioOnFirstClick, registerSynthSounds, samples, webaudioOutput } from '@strudel/webaudio';
import { registerSoundfonts } from '@strudel/soundfonts';

interface StrudelSettings {
  fontSize: number;
  lineWrapping: boolean;
  lineNumbers: boolean;
  bracketMatching: boolean;
  bracketClosing: boolean;
  autoCompletion: boolean;
  theme: string;
}

const DEFAULT_SETTINGS: StrudelSettings = {
  fontSize: 18,
  lineWrapping: true,
  lineNumbers: true,
  bracketMatching: true,
  bracketClosing: true,
  autoCompletion: true,
  theme: 'strudelTheme'
};

export default class StrudelPlugin extends Plugin {
  settings: StrudelSettings;

  async onload() {
    await this.loadSettings();

    this.registerMarkdownCodeBlockProcessor('strudel', (source, el, ctx) => {
      this.renderStrudelBlock(source, el, ctx);
    });

    this.addSettingTab(new StrudelSettingTab(this.app, this));
  }

  async renderStrudelBlock(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    const container = el.createDiv({ cls: 'strudel-container' });
    const button = container.createEl('button', { text: 'Play', cls: 'strudel-toggle' });
    const editorEl = container.createDiv({ cls: 'strudel-editor' });

    initAudioOnFirstClick();

    let status: 'playing' | 'stopped' = 'stopped';

    const editor = new StrudelMirror({
      root: editorEl,
      initialCode: source.trim(),
      defaultOutput: webaudioOutput,
      getTime: () => getAudioContext().currentTime,
      transpiler,
      onError: (e: unknown) => console.error(e),
      prebake: async () => {
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
          registerSoundfonts()
        ]);
      }
    });

    editor.updateSettings({
      fontSize: this.settings.fontSize,
      isLineWrappingEnabled: this.settings.lineWrapping,
      isLineNumbersDisplayed: this.settings.lineNumbers,
      isBracketMatchingEnabled: this.settings.bracketMatching,
      isBracketClosingEnabled: this.settings.bracketClosing,
      isAutoCompletionEnabled: this.settings.autoCompletion,
      theme: this.settings.theme
    });

    button.onclick = async () => {
      if (status === 'playing') {
        editor.stop();
        status = 'stopped';
        button.setText('Play');
      } else {
        await editor.evaluate();
        status = 'playing';
        button.setText('Stop');
      }
    };

    const child = new MarkdownRenderChild(el);
    child.onunload = () => {
      editor.destroy();
    };
    ctx.addChild(child);
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
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

    new Setting(containerEl)
      .setName('Font size')
      .addSlider(slider => slider
        .setLimits(10, 30, 1)
        .setValue(this.plugin.settings.fontSize)
        .onChange(async (value) => {
          this.plugin.settings.fontSize = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Theme')
      .addText(text => text
        .setValue(this.plugin.settings.theme)
        .onChange(async (value) => {
          this.plugin.settings.theme = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Line wrapping')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.lineWrapping)
        .onChange(async (value) => {
          this.plugin.settings.lineWrapping = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Line numbers')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.lineNumbers)
        .onChange(async (value) => {
          this.plugin.settings.lineNumbers = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Bracket matching')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.bracketMatching)
        .onChange(async (value) => {
          this.plugin.settings.bracketMatching = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Auto close brackets')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.bracketClosing)
        .onChange(async (value) => {
          this.plugin.settings.bracketClosing = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Autocompletion')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoCompletion)
        .onChange(async (value) => {
          this.plugin.settings.autoCompletion = value;
          await this.plugin.saveSettings();
        }));
  }
}
