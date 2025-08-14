export interface StrudelPluginSettings {
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

export const DEFAULT_SETTINGS: StrudelPluginSettings = {
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
