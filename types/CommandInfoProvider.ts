/**
 * Represents a function that can provide information about the given command
 * in the given language. Accepts a prefix to pass to the localization resources
 * that will be loaded
 */
export type CommandInfoProvider =
	(language: string, command: string, prefix: string) => {
		desc?: string;
		usage?: string;
		help?: string;
	};
