import { CommandInfoProvider } from '@/types/CommandInfoProvider';
import { Localization } from '@/Localization';
import { LocalizationCache } from '@/LocalizationCache';
import { TemplateArguments } from '@/types/TemplateArguments';

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
