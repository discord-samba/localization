import { LocalizationCache } from './LocalizationCache';
import { LocalizationStringBuilder } from './LocalizationStringBuilder';
import { LocalizationResourceProxy } from './types/LocalizationResourceProxy';
import { TemplateArguments } from './types/TemplateArguments';

export class Localization
{
	/**
	 * Fetches a Localization string resource for the given language
	 * with the given key. The string will be built using the given arguments
	 */
	public static resource(language: string, key: string, args: TemplateArguments = {}): string
	{
		if (!LocalizationCache.hasLanguage(language))
			throw new Error(`No language '${language}' as been loaded`);

		// TODO: Return something if the resource doesn't exist. Used to do
		//       `lang::key` in YAMDBF. Maybe something else

		const builder: LocalizationStringBuilder = LocalizationCache.get(language, key)!;
		return builder.build(args, Localization.createResourceProxy(language));
	}

	/**
	 * Returns whether or not a localization resource exists for the
	 * given language and given key
	 */
	public static resourceExists(language: string, key: string): boolean
	{
		return LocalizationCache.has(language, key);
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
