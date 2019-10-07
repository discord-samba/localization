import { LocalizationCache } from './LocalizationCache';
import { LocalizationStringBuilder } from './LocalizationStringBuilder';
import { LocalizationResourceProxy } from './types/LocalizationResourceProxy';
import { TemplateArguments } from './types/TemplateArguments';
import { LocalizationResrouceMetaData } from './types/LocalizationResourceMetaData';
import { LocalizationFileLoader } from './loader/LocalizationFileLoader';

export class Localization
{
	/**
	 * Load all .lang files in the given directory (and subdirectories)
	 * as the given language, parsing them and caching to the LocalizationCache
	 */
	public static loadFromDirectory(language: string, dir: string): void
	{
		LocalizationFileLoader.loadFromDirectory(language, dir);
	}

	/**
	 * Fetches a Localization string resource for the given language
	 * with the given key. The string will be built using the given arguments.
	 *
	 * Don't pass _meta. This will be handled automatically by the module
	 * and is used to track call location for localization string error reporting
	 */
	public static resource(
		language: string,
		key: string,
		args: TemplateArguments = {},
		_meta: LocalizationResrouceMetaData = {}): string
	{
		if (!LocalizationCache.hasLanguage(language))
			throw new Error(`No language '${language}' as been loaded`);

		// TODO: Return something if the resource doesn't exist. Used to do
		//       `lang::key` in YAMDBF. Maybe something else?

		// If we don't have call location information, capture it
		if (typeof _meta._cl === 'undefined')
		{
			let trace: any = {};
			Error.captureStackTrace(trace);
			_meta._cl = trace.stack.split('\n')[_meta._ip ? 3 : 2];
		}

		const builder: LocalizationStringBuilder = LocalizationCache.get(language, key)!;
		return builder.build(args, Localization.getResourceProxy(language), _meta);
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
	 * Gets a `LocalizationResourceProxy`. See {@link LocalizationResourceProxy}
	 * Uses a cached resource proxy if one already exists for the given language
	 */
	public static getResourceProxy<T = {}>(language: string): LocalizationResourceProxy<T>
	{
		if (LocalizationCache.hasProxy(language))
			return LocalizationCache.getProxy(language) as LocalizationResourceProxy<T>;

		const proxy: LocalizationResourceProxy<T> = new Proxy({}, {
			get: (_, key: string) => {
				return (args: TemplateArguments, _meta: LocalizationResrouceMetaData = {}) =>
				{
					_meta._ip = true;
					return Localization.resource(language, key, args, _meta);
				};
			}
		}) as LocalizationResourceProxy<T>;

		LocalizationCache.setProxy(language, proxy);

		return proxy;
	}
}
