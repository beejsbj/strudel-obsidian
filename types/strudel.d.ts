// Type declarations for Strudel modules

declare module '@strudel/codemirror' {
	export class StrudelMirror {
		constructor(config: {
			defaultOutput?: any;
			getTime?: () => number;
			transpiler?: any;
			root: HTMLElement;
			initialCode?: string;
			onError?: (error: any) => void;
			onCode?: (code: string) => void;
			prebake?: () => Promise<void>;
		});
		
		evaluate(): Promise<void>;
		stop(): void;
		toggle(): void;
		setCode(code: string): void;
		updateSettings(settings: any): void;
		setFontSize(size: number): void;
		setFontFamily(family: string): void;
		setLineWrappingEnabled(enabled: boolean): void;
		setLineNumbersDisplayed(enabled: boolean): void;
		setBracketMatchingEnabled(enabled: boolean): void;
		setBracketClosingEnabled(enabled: boolean): void;
		setAutocompletionEnabled(enabled: boolean): void;
		setTheme(theme: string): void;
		destroy(): void;
		
		repl?: {
			scheduler?: {
				started: boolean;
			};
			setCps?: (cps: number) => void;
			state?: any;
		};
		
		view?: {
			dom: HTMLElement;
		};
	}
	
	export function toggleComment(): void;
	export const themes: { [key: string]: any };
}

declare module '@strudel/core' {
	export function evalScope(...modules: any[]): Promise<any>;
}

declare module '@strudel/transpiler' {
	export const transpiler: any;
}

declare module '@strudel/webaudio' {
	export function getAudioContext(): AudioContext;
	export const webaudioOutput: any;
	export function initAudioOnFirstClick(): void;
	export function registerSynthSounds(): Promise<void>;
	export function samples(url: string): Promise<void>;
	export const soundMap: any;
}

declare module '@strudel/soundfonts' {
	export function registerSoundfonts(): Promise<void>;
}

declare module '@strudel/mini' {
	// Mini module exports
}

declare module '@strudel/tonal' {
	// Tonal module exports
}