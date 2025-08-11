import {
  App,
  MarkdownPostProcessorContext,
  MarkdownRenderChild,
  Plugin,
  PluginSettingTab,
  Setting,
} from "obsidian";

interface StrudelPluginSettings {
  fontSize: number;
  fontFamily: string;
  lineWrapping: boolean;
  lineNumbers: boolean;
  bracketMatching: boolean;
  bracketClosing: boolean;
  autoCompletion: boolean;
  theme: string;
}

const DEFAULT_SETTINGS: StrudelPluginSettings = {
  fontSize: 18,
  fontFamily: "monospace",
  lineWrapping: true,
  lineNumbers: true,
  bracketMatching: true,
  bracketClosing: true,
  autoCompletion: true,
  theme: "strudelTheme",
};

export default class StrudelPlugin extends Plugin {
  settings: StrudelPluginSettings;

  async onload() {
    await this.loadSettings();
    this.registerMarkdownCodeBlockProcessor(
      "strudel",
      (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
        this.renderStrudel(source, el, ctx);
      }
    );
    this.addSettingTab(new StrudelSettingTab(this.app, this));
  }

  async renderStrudel(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ) {
    const root = el.createDiv({ cls: "strudel-playground" });
    const editorRoot = root.createDiv({ cls: "strudel-editor" });
    const button = root.createEl("button", { text: "Play", cls: "strudel-toggle" });

    const [{ StrudelMirror }, { evalScope }, { transpiler }, webaudio, { registerSoundfonts }] =
      await Promise.all([
        import("@strudel/codemirror"),
        import("@strudel/core"),
        import("@strudel/transpiler"),
        import("@strudel/webaudio"),
        import("@strudel/soundfonts"),
      ]);

    const { getAudioContext, webaudioOutput, initAudioOnFirstClick, registerSynthSounds, samples } = webaudio;

    initAudioOnFirstClick();

    const editor = new StrudelMirror({
      defaultOutput: webaudioOutput,
      getTime: () => getAudioContext().currentTime,
      root: editorRoot,
      initialCode: source,
      transpiler,
      onError: (e: unknown) => console.error(e),
      prebake: async () => {
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
      },
    });

    editor.updateSettings({
      fontSize: this.settings.fontSize,
      fontFamily: this.settings.fontFamily,
      theme: this.settings.theme,
      isLineWrappingEnabled: this.settings.lineWrapping,
      isLineNumbersDisplayed: this.settings.lineNumbers,
      isBracketMatchingEnabled: this.settings.bracketMatching,
      isBracketClosingEnabled: this.settings.bracketClosing,
      isAutoCompletionEnabled: this.settings.autoCompletion,
    });

    let playing = false;
    button.onclick = async () => {
      if (playing) {
        editor.stop();
        playing = false;
        button.setText("Play");
      } else {
        await editor.evaluate();
        playing = true;
        button.setText("Stop");
      }
    };

    class Cleanup extends MarkdownRenderChild {
      editor: any;
      constructor(el: HTMLElement, editor: any) {
        super(el);
        this.editor = editor;
      }
      onunload() {
        this.editor.destroy();
      }
    }
    ctx.addChild(new Cleanup(root, editor));
  }

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
      .setName("Font size")
      .addSlider((slider) =>
        slider
          .setLimits(10, 32, 1)
          .setValue(this.plugin.settings.fontSize)
          .onChange(async (value) => {
            this.plugin.settings.fontSize = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Font family")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.fontFamily)
          .onChange(async (value) => {
            this.plugin.settings.fontFamily = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Line wrapping")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.lineWrapping)
          .onChange(async (value) => {
            this.plugin.settings.lineWrapping = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Line numbers")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.lineNumbers)
          .onChange(async (value) => {
            this.plugin.settings.lineNumbers = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Bracket matching")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.bracketMatching)
          .onChange(async (value) => {
            this.plugin.settings.bracketMatching = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Auto bracket closing")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.bracketClosing)
          .onChange(async (value) => {
            this.plugin.settings.bracketClosing = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Autocompletion")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoCompletion)
          .onChange(async (value) => {
            this.plugin.settings.autoCompletion = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Theme")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.theme)
          .onChange(async (value) => {
            this.plugin.settings.theme = value;
            await this.plugin.saveSettings();
          })
      );
  }
}

