import { Plugin, MarkdownRenderChild, TFile } from "obsidian";
import { repl, evalScope } from "@strudel/core";
import {
	getAudioContext,
	webaudioOutput,
	initAudioOnFirstClick,
	registerSynthSounds,
} from "@strudel/webaudio";
import { transpiler } from "@strudel/transpiler";
import { StrudelMirror } from "@strudel/codemirror";
import {
	updateMiniLocations,
	highlightMiniLocations,
} from "@strudel/codemirror";

// Define our own pattern interface since Pattern from @strudel/core is not a type
interface StrudelPatternObject {
	start?: () => void;
	stop?: () => void;
	[key: string]: any;
}

// Performance monitoring class for production optimization
class PerformanceMonitor {
	private patternCount: number = 0;
	private audioMemoryUsage: number = 0;
	private lastCleanupTime: number = Date.now();
	private cleanupInterval: number = 30000; // 30 seconds

	incrementPatternCount(): void {
		this.patternCount++;
		this.logPerformanceMetrics();
	}

	decrementPatternCount(): void {
		this.patternCount = Math.max(0, this.patternCount - 1);
		this.logPerformanceMetrics();
	}

	updateAudioMemoryUsage(usage: number): void {
		this.audioMemoryUsage = usage;
	}

	shouldPerformCleanup(): boolean {
		return Date.now() - this.lastCleanupTime > this.cleanupInterval;
	}

	markCleanupPerformed(): void {
		this.lastCleanupTime = Date.now();
	}

	getMetrics(): { patterns: number; memory: number; uptime: number } {
		return {
			patterns: this.patternCount,
			memory: this.audioMemoryUsage,
			uptime: Date.now() - this.lastCleanupTime,
		};
	}

	private logPerformanceMetrics(): void {
		if (this.patternCount > 10) {
			console.warn(
				`Strudel Plugin: High pattern count detected (${this.patternCount}). Consider cleanup.`
			);
		}
	}
}

interface StrudelPattern {
	id: string;
	element: HTMLElement;
	code: string;
	isPlaying: boolean;
	pattern?: StrudelPatternObject;
	notebook: StrudelNotebook;
	error?: string;
	editor?: StrudelMirror;
	liveEditTimeout?: number;
}

interface NotebookError {
	message: string;
	line?: number;
	column?: number;
	stack?: string;
}

// Per-note context management class
class StrudelNotebook {
	private evaluator: Function;
	private patterns: Map<string, StrudelPatternObject> = new Map();
	private audioContext: AudioContext;
	public readonly notePath: string; // Made public for cleanup operations
	private sharedContext: any = {};
	private isDestroyed: boolean = false;

	constructor(
		notePath: string,
		audioContext: AudioContext,
		strudelRepl: any
	) {
		this.notePath = notePath;
		this.audioContext = audioContext;
		this.evaluator = strudelRepl.evaluate.bind(strudelRepl);

		// Initialize shared context with basic Strudel functions
		this.sharedContext = {
			// Variables and functions defined in code blocks will be stored here
			// This creates a shared namespace for the note
		};
	}

	async evaluateBlock(
		code: string,
		blockId: string
	): Promise<{ pattern?: StrudelPatternObject; error?: NotebookError }> {
		if (this.isDestroyed) {
			throw new Error("Notebook has been destroyed");
		}

		try {
			// Wrap code to capture variables in shared context
			const wrappedCode = this.wrapCodeForSharedContext(code);

			// Evaluate the pattern with shared context
			const result = await this.evaluator(
				wrappedCode,
				this.sharedContext
			);

			// If result is a pattern, store it
			if (result && typeof result.start === "function") {
				this.patterns.set(blockId, result);
				return { pattern: result };
			}

			return { pattern: undefined };
		} catch (error) {
			return {
				error: this.formatError(error),
			};
		}
	}

	private wrapCodeForSharedContext(code: string): string {
		// This wrapper allows variables to persist in the shared context
		// while still returning the main pattern
		return `
			(function() {
				// Make shared context variables available
				for (let key in this.sharedContext) {
					if (this.sharedContext.hasOwnProperty(key)) {
						eval('var ' + key + ' = this.sharedContext["' + key + '"];');
					}
				}
				
				// Execute user code
				var result = (function() {
					${code}
				})();
				
				// Capture any new variables created
				for (let key in this) {
					if (this.hasOwnProperty(key) && key !== 'sharedContext') {
						this.sharedContext[key] = this[key];
					}
				}
				
				return result;
			}).call(this.sharedContext);
		`;
	}

	private formatError(error: any): NotebookError {
		const formattedError: NotebookError = {
			message: error.message || "Unknown error occurred",
		};

		if (error.lineNumber) formattedError.line = error.lineNumber;
		if (error.columnNumber) formattedError.column = error.columnNumber;
		if (error.stack) formattedError.stack = error.stack;

		return formattedError;
	}

	getPattern(blockId: string): StrudelPatternObject | undefined {
		return this.patterns.get(blockId);
	}

	stopPattern(blockId: string): void {
		const pattern = this.patterns.get(blockId);
		if (pattern && typeof pattern.stop === "function") {
			pattern.stop();
		}
	}

	stopAll(): void {
		for (const pattern of this.patterns.values()) {
			if (typeof pattern.stop === "function") {
				pattern.stop();
			}
		}
	}

	cleanup(): void {
		this.isDestroyed = true;
		this.stopAll();

		// Enhanced cleanup with error recovery
		try {
			// Clear all patterns with individual error handling
			for (const [id, pattern] of this.patterns.entries()) {
				try {
					if (pattern && typeof pattern.stop === "function") {
						pattern.stop();
					}
					if (pattern && typeof pattern.destroy === "function") {
						pattern.destroy();
					}
				} catch (error) {
					console.warn(`Error cleaning up pattern ${id}:`, error);
				}
			}
			this.patterns.clear();

			// Clear shared context safely
			this.sharedContext = {};

			console.log(`Notebook cleaned up: ${this.notePath}`);
		} catch (error) {
			console.error(
				`Error during notebook cleanup for ${this.notePath}:`,
				error
			);
		}
	}

	// Add memory usage estimation
	getMemoryUsage(): number {
		return (
			this.patterns.size * 1024 + // Estimate 1KB per pattern
			Object.keys(this.sharedContext).length * 512
		); // Estimate 512B per context variable
	}

	getSharedContext(): any {
		return { ...this.sharedContext };
	}
}

// Enhanced code block widget with improved error handling and state management
class StrudelBlockWidget extends MarkdownRenderChild {
	private plugin: StrudelPlugin;
	private pattern: StrudelPattern;
	private controls: HTMLElement;
	private errorDisplay: HTMLElement;
	private editorContainer: HTMLElement;
	private liveEditDebounceMs: number = 400;

	constructor(
		containerEl: HTMLElement,
		plugin: StrudelPlugin,
		pattern: StrudelPattern
	) {
		super(containerEl);
		this.plugin = plugin;
		this.pattern = pattern;
	}

	onload() {
		this.createTransportControls();
		this.createEditorContainer();
		this.createStrudelMirrorEditor();
		this.setupEventHandlers();
		this.updateUI();
	}

	private createEditorContainer() {
		// Create container for StrudelMirror editor
		this.editorContainer = this.containerEl.createEl("div");
		this.editorContainer.addClass("strudel-editor-container");
	}

	private async createStrudelMirrorEditor() {
		try {
			this.pattern.editor = new StrudelMirror({
				root: this.editorContainer,
				initialCode: this.pattern.code,
				defaultOutput: webaudioOutput,
				getTime: () => this.plugin.getAudioContext().currentTime,
				transpiler,
				solo: false, // Allow multiple patterns to play in notebook context
				prebake: async () => {
					initAudioOnFirstClick();
					const loadModules = evalScope(
						import("@strudel/core"),
						import("@strudel/mini"),
						import("@strudel/tonal"),
						import("@strudel/webaudio")
					);
					await Promise.all([loadModules, registerSynthSounds()]);
				},
				onToggle: (started: boolean) => {
					this.pattern.isPlaying = started;
					this.updateUI();
					if (started) {
						this.setStatus("Playing", "playing");
					} else {
						this.setStatus("Stopped", "stopped");
					}
				},
				afterEval: (options: any) => {
					// Visual highlighting integration
					if (options.meta?.miniLocations && this.pattern.editor) {
						updateMiniLocations(
							this.pattern.editor.editor,
							options.meta.miniLocations
						);
					}
					this.clearError();
					this.setStatus("Ready", "ready");
				},
				onError: (error: any) => {
					this.displayError({
						message: error.message || "Pattern evaluation error",
						stack: error.stack,
					});
					this.setStatus("Error", "error");
				},
			});

			// Set up live editing with debouncing
			this.setupLiveEditing();
		} catch (error) {
			console.error("Failed to create StrudelMirror editor:", error);
			// Fallback to basic code display
			this.createFallbackCodeDisplay();
		}
	}

	private createFallbackCodeDisplay() {
		const codeEl = this.editorContainer.createEl("pre");
		codeEl.addClass("strudel-code");
		codeEl.textContent = this.pattern.code;
	}

	private setupLiveEditing() {
		if (!this.pattern.editor) return;

		// Setup live editing with debouncing
		const originalOnChange = this.pattern.editor.editor.state.config.doc;

		// Listen for code changes in the editor
		this.pattern.editor.editor.dom.addEventListener("input", () => {
			if (this.pattern.liveEditTimeout) {
				clearTimeout(this.pattern.liveEditTimeout);
			}

			this.pattern.liveEditTimeout = window.setTimeout(() => {
				this.handleLiveEdit();
			}, this.liveEditDebounceMs);
		});
	}

	private async handleLiveEdit() {
		if (!this.pattern.editor || !this.pattern.isPlaying) return;

		try {
			// Get current code from editor
			const currentCode = this.pattern.editor.code;
			this.pattern.code = currentCode;

			// Re-evaluate pattern with new code
			await this.pattern.editor.evaluate();
		} catch (error) {
			console.error("Live edit error:", error);
			// Don't stop playback on live edit errors
		}
	}

	private createTransportControls() {
		// Create minimal controls with single play/pause toggle button
		this.controls = this.containerEl.createEl("div");
		this.controls.addClass("strudel-controls");

		// Single play/pause toggle button with embedded SVG icons
		const toggleButton = this.controls.createEl("button");
		toggleButton.addClass("strudel-toggle-btn");
		toggleButton.setAttribute("data-pattern-id", this.pattern.id);
		toggleButton.setAttribute("aria-label", "Play/Pause pattern");

		// Lucide Play Icon SVG (will toggle to pause when playing)
		const playIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5,3 19,12 5,21"></polygon></svg>`;

		// Lucide Pause Icon SVG
		const pauseIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="12"></rect><rect x="14" y="4" width="12" height="12"></rect></svg>`;

		// Set initial play icon
		toggleButton.innerHTML = playIcon;
		toggleButton.setAttribute("data-state", "stopped");

		// Store icons for toggling
		toggleButton.setAttribute("data-play-icon", playIcon);
		toggleButton.setAttribute("data-pause-icon", pauseIcon);

		// Create error display area
		this.errorDisplay = this.containerEl.createEl("div");
		this.errorDisplay.addClass("strudel-error");
		this.errorDisplay.style.display = "none";
	}

	private setupEventHandlers() {
		const toggleBtn = this.controls.querySelector(
			".strudel-toggle-btn"
		) as HTMLElement;

		if (toggleBtn) {
			toggleBtn.addEventListener("click", () => this.togglePattern());
			// Enhanced touch handling for mobile
			toggleBtn.addEventListener("touchstart", (e) => {
				e.preventDefault();
				this.togglePattern();
			});
		}
	}

	private togglePattern() {
		if (this.pattern.isPlaying) {
			this.stopPattern();
		} else {
			this.playPattern();
		}
	}

	private async playPattern() {
		if (this.pattern.isPlaying) return;

		try {
			this.setStatus("Compiling...", "loading");
			this.clearError();
			this.setLoadingState(true);

			// Enhanced audio context management
			const audioContext = this.plugin.getAudioContext();
			if (audioContext.state === "suspended") {
				this.setStatus("Resuming Audio...", "loading");
				await audioContext.resume();
				this.plugin.markAudioContextResumed();
			}

			// Performance monitoring
			this.plugin.getPerformanceMonitor().incrementPatternCount();

			// Use StrudelMirror editor if available, otherwise fallback to notebook
			if (this.pattern.editor) {
				// Update code from editor
				this.pattern.code = this.pattern.editor.code;
				// Use StrudelMirror's evaluate method
				await this.pattern.editor.evaluate();
			} else {
				// Fallback to notebook evaluation
				const result = await this.pattern.notebook.evaluateBlock(
					this.pattern.code,
					this.pattern.id
				);

				if (result.error) {
					this.displayError(result.error);
					this.setStatus("Error", "error");
					this.setLoadingState(false);
					this.plugin.getPerformanceMonitor().decrementPatternCount();
					return;
				}

				if (result.pattern) {
					this.pattern.pattern = result.pattern;
					if (typeof result.pattern.start === "function") {
						result.pattern.start();
					}
				}

				this.pattern.isPlaying = true;
				this.setStatus("Playing", "playing");
				this.updateUI();
			}

			this.setLoadingState(false);
		} catch (error) {
			this.plugin.getPerformanceMonitor().decrementPatternCount();
			this.setLoadingState(false);

			// Enhanced error handling with recovery suggestions
			const formattedError = {
				message: this.getErrorMessage(error),
				stack: error.stack,
			};
			this.displayError(formattedError);
			this.setStatus("Error", "error");
		}
	}

	private getErrorMessage(error: any): string {
		if (!error) return "Unknown error occurred";

		// Provide helpful error messages for common issues
		if (error.message?.includes("AudioContext")) {
			return "Audio context error. Try refreshing the page or checking your browser's audio settings.";
		}
		if (error.message?.includes("not defined")) {
			return `${error.message}. Make sure all variables are defined in previous code blocks.`;
		}
		if (error.message?.includes("syntax")) {
			return `Syntax error: ${error.message}. Check your code for missing brackets or quotes.`;
		}

		return error.message || "Pattern compilation failed";
	}

	private setLoadingState(loading: boolean): void {
		const playBtn = this.controls.querySelector(
			".strudel-play-btn"
		) as HTMLElement;
		const stopBtn = this.controls.querySelector(
			".strudel-stop-btn"
		) as HTMLElement;

		if (loading) {
			playBtn?.classList.add("loading");
			playBtn?.setAttribute("disabled", "true");
			stopBtn?.setAttribute("disabled", "true");
		} else {
			playBtn?.classList.remove("loading");
			playBtn?.removeAttribute("disabled");
			stopBtn?.removeAttribute("disabled");
		}
	}

	private stopPattern() {
		if (!this.pattern.isPlaying) return;

		try {
			this.setLoadingState(true);

			// Use StrudelMirror editor if available, otherwise fallback to notebook
			if (this.pattern.editor) {
				this.pattern.editor.stop();
			} else {
				if (
					this.pattern.pattern &&
					typeof this.pattern.pattern.stop === "function"
				) {
					this.pattern.pattern.stop();
				}
				this.pattern.notebook.stopPattern(this.pattern.id);
			}

			this.pattern.isPlaying = false;
			this.plugin.getPerformanceMonitor().decrementPatternCount();
			this.setStatus("Stopped", "stopped");
			this.updateUI();
			this.setLoadingState(false);
		} catch (error) {
			console.error("Error stopping pattern:", error);
			this.setStatus("Stop Error", "error");
			this.setLoadingState(false);

			// Force pattern state reset even if stop failed
			this.pattern.isPlaying = false;
			this.updateUI();
		}
	}

	private updateUI() {
		const toggleBtn = this.controls.querySelector(
			".strudel-toggle-btn"
		) as HTMLElement;

		if (toggleBtn) {
			const playIcon = toggleBtn.getAttribute("data-play-icon");
			const pauseIcon = toggleBtn.getAttribute("data-pause-icon");

			if (this.pattern.isPlaying) {
				// Show pause icon when playing
				toggleBtn.innerHTML = pauseIcon || "";
				toggleBtn.setAttribute("data-state", "playing");
				toggleBtn.setAttribute("aria-label", "Pause pattern");
			} else {
				// Show play icon when stopped
				toggleBtn.innerHTML = playIcon || "";
				toggleBtn.setAttribute("data-state", "stopped");
				toggleBtn.setAttribute("aria-label", "Play pattern");
			}
		}
	}

	private setStatus(text: string, type: string) {
		// Status removed for minimal UI
	}

	private displayError(error: NotebookError) {
		this.errorDisplay.style.display = "block";
		this.errorDisplay.innerHTML = "";

		const errorHeader = this.errorDisplay.createEl("div");
		errorHeader.addClass("strudel-error-header");
		errorHeader.textContent = "Compilation Error";

		const errorMessage = this.errorDisplay.createEl("div");
		errorMessage.addClass("strudel-error-message");
		errorMessage.textContent = error.message;

		if (error.line) {
			const errorLocation = this.errorDisplay.createEl("div");
			errorLocation.addClass("strudel-error-location");
			errorLocation.textContent = `Line ${error.line}${
				error.column ? `, Column ${error.column}` : ""
			}`;
		}
	}

	private clearError() {
		this.errorDisplay.style.display = "none";
		this.errorDisplay.innerHTML = "";
	}

	onunload() {
		try {
			// Enhanced cleanup with error recovery
			this.stopPattern();

			// Clean up live edit timeout
			if (this.pattern.liveEditTimeout) {
				clearTimeout(this.pattern.liveEditTimeout);
			}

			// Clean up StrudelMirror editor with error handling
			if (this.pattern.editor) {
				try {
					this.pattern.editor.clear();
				} catch (error) {
					console.warn("Error clearing StrudelMirror editor:", error);
				}
			}

			// Remove event listeners to prevent memory leaks
			this.removeEventListeners();

			console.log(`Widget unloaded: ${this.pattern.id}`);
		} catch (error) {
			console.error("Error during widget unload:", error);
		}
	}

	private removeEventListeners(): void {
		try {
			const playBtn = this.controls?.querySelector(
				".strudel-play-btn"
			) as HTMLElement;
			const stopBtn = this.controls?.querySelector(
				".strudel-stop-btn"
			) as HTMLElement;

			if (playBtn) {
				playBtn.replaceWith(playBtn.cloneNode(true));
			}
			if (stopBtn) {
				stopBtn.replaceWith(stopBtn.cloneNode(true));
			}
		} catch (error) {
			console.warn("Error removing event listeners:", error);
		}
	}
}

export default class StrudelPlugin extends Plugin {
	private strudelRepl: any;
	private audioContext: AudioContext;
	private patterns: Map<string, StrudelPattern> = new Map();
	private notebooks: Map<string, StrudelNotebook> = new Map(); // Per-note notebooks
	private widgets: Map<string, StrudelBlockWidget> = new Map(); // Track widgets for cleanup
	private currentNotePath: string | null = null; // Track active note for cleanup
	private audioContextResumed: boolean = false; // Track audio context state
	private performanceMonitor: PerformanceMonitor = new PerformanceMonitor();

	async onload() {
		console.log("Loading Strudel Plugin");

		// Initialize Strudel environment
		await this.initializeStrudel();

		// Register markdown code block processor for 'strudel' language
		this.registerMarkdownCodeBlockProcessor(
			"strudel",
			(source, el, ctx) => {
				this.createStrudelCodeBlock(source, el, ctx);
			}
		);

		// Register event handlers for note management
		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				if (file) {
					this.handleNoteOpen(file);
				}
			})
		);

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.handleActiveLeafChange();
			})
		);
	}

	private async initializeStrudel() {
		try {
			// Get audio context
			this.audioContext = getAudioContext();

			// Initialize audio on first click
			initAudioOnFirstClick();

			// Register synth sounds
			registerSynthSounds();

			// Set up eval scope with Strudel modules
			await evalScope(
				import("@strudel/core"),
				import("@strudel/mini"),
				import("@strudel/webaudio"),
				import("@strudel/tonal")
			);

			// Create repl instance
			this.strudelRepl = repl({
				defaultOutput: webaudioOutput,
				getTime: () => this.audioContext.currentTime,
				transpiler,
			});

			console.log("Strudel environment initialized");
		} catch (error) {
			console.error("Failed to initialize Strudel:", error);
		}
	}

	private createStrudelCodeBlock(source: string, el: HTMLElement, ctx: any) {
		// Create unique ID for this pattern
		const patternId = `strudel-${Date.now()}-${Math.random()
			.toString(36)
			.substr(2, 9)}`;

		// Get note path for context isolation
		const notePath = this.getNotePath(ctx);
		if (!notePath) {
			console.warn("Could not determine note path for Strudel block");
			return;
		}

		// Get or create notebook for this note
		const notebook = this.getOrCreateNotebook(notePath);

		// Create container with responsive design
		el.addClass("strudel-code-block");
		el.addClass("strudel-responsive");

		// Store pattern info
		const pattern: StrudelPattern = {
			id: patternId,
			element: el,
			code: source,
			isPlaying: false,
			notebook: notebook,
		};
		this.patterns.set(patternId, pattern);

		// Create and register widget
		const widget = new StrudelBlockWidget(el, this, pattern);
		this.widgets.set(patternId, widget);
		widget.load();
	}

	// Note management methods
	private getNotePath(ctx: any): string | null {
		// Try to get note path from context
		if (ctx && ctx.sourcePath) {
			return ctx.sourcePath;
		}

		// Fallback to active file
		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile) {
			return activeFile.path;
		}

		return null;
	}

	private getOrCreateNotebook(notePath: string): StrudelNotebook {
		if (!this.notebooks.has(notePath)) {
			const notebook = new StrudelNotebook(
				notePath,
				this.audioContext,
				this.strudelRepl
			);
			this.notebooks.set(notePath, notebook);
			console.log(`Created new notebook for: ${notePath}`);
		}
		return this.notebooks.get(notePath)!;
	}

	private handleNoteOpen(file: TFile) {
		// Note opened - notebook will be created when first strudel block is encountered
		console.log(`Note opened: ${file.path}`);
	}

	private handleActiveLeafChange() {
		const previousNote = this.currentNotePath;
		const activeFile = this.app.workspace.getActiveFile();
		this.currentNotePath = activeFile?.path || null;

		// If switching to a different note, stop patterns from previous note
		if (previousNote && previousNote !== this.currentNotePath) {
			this.cleanupPreviousNote(previousNote);
		}

		// Performance monitoring - check if cleanup is needed
		if (this.performanceMonitor.shouldPerformCleanup()) {
			this.performPerformanceCleanup();
		}
	}

	private cleanupPreviousNote(notePath: string): void {
		try {
			console.log(`Cleaning up previous note: ${notePath}`);

			const notebook = this.notebooks.get(notePath);
			if (notebook) {
				notebook.stopAll();
			}

			// Update UI states for patterns from the previous note
			for (const pattern of this.patterns.values()) {
				if (pattern.notebook.notePath === notePath) {
					pattern.isPlaying = false;
					const widget = this.widgets.get(pattern.id);
					if (widget) {
						(widget as any).updateUI?.();
					}
				}
			}
		} catch (error) {
			console.error("Error cleaning up previous note:", error);
		}
	}

	private performPerformanceCleanup(): void {
		try {
			let totalMemory = 0;

			// Calculate total memory usage
			for (const notebook of this.notebooks.values()) {
				totalMemory += notebook.getMemoryUsage();
			}

			this.performanceMonitor.updateAudioMemoryUsage(totalMemory);
			this.performanceMonitor.markCleanupPerformed();

			const metrics = this.performanceMonitor.getMetrics();
			console.log("Performance metrics:", metrics);

			// If memory usage is high, suggest cleanup
			if (totalMemory > 50000) {
				// 50KB threshold
				console.warn(
					"High memory usage detected. Consider closing unused notes."
				);
			}
		} catch (error) {
			console.error("Error during performance cleanup:", error);
		}
	}

	private cleanupPattern(patternId: string) {
		const pattern = this.patterns.get(patternId);
		if (pattern) {
			// Stop pattern if playing
			pattern.notebook.stopPattern(patternId);

			// Clean up widget
			const widget = this.widgets.get(patternId);
			if (widget) {
				widget.unload();
				this.widgets.delete(patternId);
			}

			// Remove pattern
			this.patterns.delete(patternId);
		}
	}

	// Public methods for widget access
	getAudioContext(): AudioContext {
		return this.audioContext;
	}

	markAudioContextResumed(): void {
		this.audioContextResumed = true;
	}

	getPerformanceMonitor(): PerformanceMonitor {
		return this.performanceMonitor;
	}

	stopAllPatternsInNote(notePath: string) {
		const notebook = this.notebooks.get(notePath);
		if (notebook) {
			notebook.stopAll();
		}
	}

	getNotebookContext(notePath: string): any {
		const notebook = this.notebooks.get(notePath);
		return notebook ? notebook.getSharedContext() : {};
	}

	// Enhanced cleanup for specific notes (useful for memory management)
	cleanupNote(notePath: string): void {
		try {
			const notebook = this.notebooks.get(notePath);
			if (notebook) {
				notebook.cleanup();
				this.notebooks.delete(notePath);
			}

			// Clean up patterns associated with this note
			const patternsToCleanup = Array.from(this.patterns.entries())
				.filter(
					([_, pattern]) => pattern.notebook.notePath === notePath
				)
				.map(([id, _]) => id);

			for (const patternId of patternsToCleanup) {
				this.cleanupPattern(patternId);
			}

			console.log(`Note completely cleaned up: ${notePath}`);
		} catch (error) {
			console.error(`Error cleaning up note ${notePath}:`, error);
		}
	}

	onunload() {
		console.log("Unloading Strudel Plugin");

		try {
			// Enhanced cleanup with error recovery
			const cleanupPromises: Promise<void>[] = [];

			// Clean up all widgets with error handling
			for (const [id, widget] of this.widgets.entries()) {
				cleanupPromises.push(
					Promise.resolve().then(() => {
						try {
							widget.unload();
						} catch (error) {
							console.warn(
								`Error unloading widget ${id}:`,
								error
							);
						}
					})
				);
			}
			this.widgets.clear();

			// Clean up all notebooks with error handling
			for (const [path, notebook] of this.notebooks.entries()) {
				cleanupPromises.push(
					Promise.resolve().then(() => {
						try {
							notebook.cleanup();
						} catch (error) {
							console.warn(
								`Error cleaning up notebook ${path}:`,
								error
							);
						}
					})
				);
			}
			this.notebooks.clear();

			// Clean up patterns
			this.patterns.clear();

			// Clean up audio context with proper error handling
			if (this.audioContext) {
				cleanupPromises.push(
					Promise.resolve().then(async () => {
						try {
							if (this.audioContext.state !== "closed") {
								// Stop all audio nodes before closing
								if (this.audioContext.destination) {
									this.audioContext.destination.disconnect();
								}
								await this.audioContext.close();
							}
						} catch (error) {
							console.warn("Error closing audio context:", error);
						}
					})
				);
			}

			// Log performance metrics on shutdown
			const finalMetrics = this.performanceMonitor.getMetrics();
			console.log("Final performance metrics:", finalMetrics);

			// Wait for all cleanup to complete (with timeout)
			Promise.allSettled(cleanupPromises)
				.then(() => {
					console.log("Strudel Plugin cleanup completed");
				})
				.catch((error) => {
					console.error("Error during plugin cleanup:", error);
				});
		} catch (error) {
			console.error("Critical error during plugin unload:", error);
		}
	}
}
