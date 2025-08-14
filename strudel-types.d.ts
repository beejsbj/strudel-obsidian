declare module "@strudel/codemirror" {
	export class StrudelMirror {
		constructor(config: any);
		updateSettings(settings: any): void;
		setCode(code: string): void;
		evaluate(): Promise<void>;
		stop(): void;
		toggle(): void;
		code: string; // Current editor content
		solo?: boolean;
		repl?: {
			setCps(cps: number): void;
			scheduler?: {
				started: boolean;
			};
			state?: any;
		};
		view?: {
			dom?: HTMLElement;
		};
	}
	export function toggleComment(): void;
}

declare module "@strudel/core" {
	export function evalScope(...modules: any[]): Promise<any>;
}

declare module "@strudel/transpiler" {
	export const transpiler: any;
}

declare module "@strudel/webaudio" {
	export function getAudioContext(): AudioContext;
	export const webaudioOutput: any;
	export function initAudioOnFirstClick(): void;
	export function registerSynthSounds(): Promise<void>;
	export function samples(url: string): Promise<void>;
	export const soundMap: any;
}

declare module "@strudel/soundfonts" {
	export function registerSoundfonts(): Promise<void>;
}

declare module "@strudel/mini" {
	// Mini module exports
}

declare module "@strudel/tonal" {
	// Tonal module exports
}
