// TypeScript declarations for Strudel modules
declare module '@strudel/core' {
  export function repl(options: any): { evaluate: (code: string) => Promise<any> };
  export function evalScope(...modules: any[]): Promise<void>;
  export const Pattern: any;
}

declare module '@strudel/webaudio' {
  export function getAudioContext(): AudioContext;
  export const webaudioOutput: any;
  export function initAudioOnFirstClick(): void;
  export function registerSynthSounds(): void;
}

declare module '@strudel/transpiler' {
  export const transpiler: any;
}

declare module '@strudel/mini' {
  export const mini: any;
}

declare module '@strudel/tonal' {
  export const tonal: any;
}

declare module '@strudel/codemirror' {
  export class StrudelMirror {
    editor: any;
    code: string;
    constructor(options: {
      root: HTMLElement;
      initialCode?: string;
      defaultOutput?: any;
      getTime?: () => number;
      transpiler?: any;
      solo?: boolean;
      prebake?: () => Promise<void>;
      onToggle?: (started: boolean) => void;
      afterEval?: (options: any) => void;
      onError?: (error: any) => void;
    });
    evaluate(): Promise<void>;
    stop(): Promise<void>;
    clear(): void;
  }
  
  export function updateMiniLocations(editor: any, locations: any[]): void;
  export function highlightMiniLocations(editor: any, atTime: number, haps: any[]): void;
}