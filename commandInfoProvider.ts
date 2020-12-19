import { CommandInfoProvider } from '#type/CommandInfoProvider';
import { Localization } from '#root/Localization';
import { LocalizationCache } from '#root/LocalizationCache';
import { TemplateArguments } from '#type/TemplateArguments';

/**
 * CommandInfoProvider function that can provide localized command info
 * for the given command in the given language if it exists
 */
export const commandInfoProvider: CommandInfoProvider =
	(language, command, prefix) =>
	{
		const path: [string, string, string] = [language, 'command', command];
		const args: TemplateArguments = { prefix };

		let desc!: string;
		let help!: string;
		let usage!: string;

		if (LocalizationCache.has(path, 'desc'))
			desc = Localization.resource(path, 'desc', args);

		if (LocalizationCache.has(path, 'help'))
			help = Localization.resource(path, 'help', args);

		if (LocalizationCache.has(path, 'usage'))
			usage = Localization.resource(path, 'usage', args);

		return { desc, help, usage };
	};
