import { evalScope } from "@strudel/core";
import { registerSynthSounds, samples } from "@strudel/webaudio";
import { registerSoundfonts } from "@strudel/soundfonts";
import { DATA_SOURCES_BASE, SAMPLE_JSON_FILES } from "./constants";

// Shared module initialisation reused in main + prebake
export async function loadStrudelModules() {
	const loadModules = evalScope(
		import("@strudel/core"),
		import("@strudel/mini"),
		import("@strudel/tonal"),
		import("@strudel/webaudio")
	);
	const promises: Promise<any>[] = [
		loadModules,
		registerSynthSounds(),
		registerSoundfonts(),
	];
	for (const file of SAMPLE_JSON_FILES) {
		promises.push(samples(`${DATA_SOURCES_BASE}/${file}`));
	}
	await Promise.all(promises);
}
