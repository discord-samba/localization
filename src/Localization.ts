import { TemplateArguments } from './types/TemplateArguments';
import { LocalizationStringBuilder } from './LocalizationStringBuilder';
import { LocalizationCache } from './LocalizationCache';
import { LocalizationResourceProxy } from './types/LocalizationResourceProxy';

export class Localization
{
	/**
	 * Fetches a Localization string resource for the given language
	 * with the given key. The string will be built using the given arguments
	 */
	public static resource(language: string, key: string, args: TemplateArguments): string
	{
		if (!LocalizationCache.hasLanguage(language))
			throw new Error(`No language '${language}' as been loaded`);

		let builder: LocalizationStringBuilder = LocalizationCache.get(language, key)!;
		return builder.build(args, Localization.createResourceProxy(language));
	}

	/**
	 * Creates a `LocalizationResourceProxy`. See {@link LocalizationResourceProxy}
	 * Uses a cached resource proxy if one already exists for the given language
	 */
	public static createResourceProxy<T = {}>(language: string): LocalizationResourceProxy<T>
	{
		if (LocalizationCache.hasProxy(language))
			return LocalizationCache.getProxy(language) as LocalizationResourceProxy<T>;
	
		const proxy: LocalizationResourceProxy<T> = new Proxy({}, {
			get: (_, key) => {
				return (args: TemplateArguments) => Localization.resource(language, key as string, args);
			}
		}) as LocalizationResourceProxy<T>;

		LocalizationCache.setProxy(language, proxy);

		return proxy;
	}
}
