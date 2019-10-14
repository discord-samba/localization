import { LocalizationCache } from './LocalizationCache';
import { LocalizationFileLoader } from './loader/LocalizationFileLoader';
import { LocalizationResourceProxy } from './types/LocalizationResourceProxy';
import { LocalizationResrouceMetaData } from './types/LocalizationResourceMetaData';
import { LocalizationStringBuilder } from './LocalizationStringBuilder';
import { TemplateArguments } from './types/TemplateArguments';

/**
 * This is the main class of the Localization module. This class contains all
 * the static methods that will be used for leveraging localization within
 * your project
 */
export class Localization
{
	/**
	 * Loads and parses all .lang files in the given directory (and subdirectories
	 * therein) and caches them under the given language
	 */
	public static loadFromDirectory(language: string, dir: string): void
	{
		LocalizationFileLoader.loadFromDirectory(language, dir);
	}

	/**
	 * Loads and parses the given .lang file, caching it under the given language
	 */
	public static loadLangFile(language: string, file: string): void
	{
		LocalizationFileLoader.loadLangFile(language, file);
	}

	/**
	 * Sets the fallback language to use if a resource doesn't exist for the
	 * language given to `Localization.resource()`
	 */
	public static setFallbackLanguage(language: string): void
	{
		LocalizationCache.fallbackLanguage = language;
	}

	/**
	 * Fetches a Localization string resource for the given path. The string
	 * will be built using the given arguments.
	 *
	 * Accepts a language string, or accepts a string tuple matching
	 * any of the following patterns:
	 *
	 *     [language, category, subcategory] // Self-explanatory
	 *     [language, category]              // Defaults to 'default'' subcategory
	 *     [language]                        // Defaults to 'default' category, 'default' subcategory
	 */
	public static resource(
		path: string | [string] | [string, string] | [string, string, string],
		key: string,
		args?: TemplateArguments
	): string;

	// Cast to `any` for passing _meta as TS will reject it otherwise. Only the first
	// overload is counted in the public method signature, which is desired as _meta
	// is a mechanic handled internally
	public static resource(
		path: string | [string] | [string, string] | [string, string, string],
		key: string,
		args: TemplateArguments = {},
		_meta: LocalizationResrouceMetaData = {}
	): string
	{
		let language: string;
		let category: string;
		let subcategory: string;

		if (typeof path === 'string')
			[language, category, subcategory] = [path, 'default', 'default'];
		else
			[language, category = 'default', subcategory = 'default'] = path;

		if (!LocalizationCache.hasLanguage(language))
			throw new Error(`No language '${language}' as been loaded`);

		const proxy: LocalizationResourceProxy = Localization.getResourceProxy(path);

		// TODO: Return something if the resource doesn't exist. Used to do
		//       `lang::key` in YAMDBF. Maybe something else?

		// If we don't have call location information, capture it
		if (typeof _meta._cl === 'undefined')
		{
			const trace: { stack: string } = { stack: '' };
			Error.captureStackTrace(trace);
			_meta._cl = trace.stack.split('\n').slice(_meta._ip! ? 3 : 2)!.join('\n');
		}

		// Create a proxy that will forward _meta to preserve call location
		// in nested resource calls within template scripts, as well as forward
		// args so they don't need to be passed manually.
		//
		// This completely goes against the entire reasoning behind having
		// a proxy cache but forwarding the metadata is important if we want
		// to preserve the call location of the resource string for debugging
		if (typeof _meta._mp === 'undefined')
		{
			_meta._mp = new Proxy({}, {
				get: (_, _key: string) =>
					(_args: TemplateArguments = args): string =>
						(proxy as any)[_key](_args, _meta)
			}) as LocalizationResourceProxy;
		}

		let builder: LocalizationStringBuilder =
			LocalizationCache.get([language, category, subcategory], key)!;

		if (typeof builder === 'undefined')
			builder = LocalizationCache.get([LocalizationCache.fallbackLanguage, category, subcategory], key)!;

		if (typeof builder === 'undefined')
			return `${language}::${category}::${subcategory}::${key}`;

		return builder.build(args, _meta);
	}

	/**
	 * Returns whether or not a Localization resource exists for the
	 * given path.
	 *
	 * Accepts a language string, or accepts a string tuple matching
	 * any of the following patterns:
	 *
	 *     [language, category, subcategory] // Self-explanatory
	 *     [language, category]              // Defaults to 'default'' subcategory
	 *     [language]                        // Defaults to 'default' category, 'default' subcategory
	 *
	 * >**NOTE:** Does not check the fallback language
	 */
	public static resourceExists(
		path: string | [string] | [string, string] | [string, string, string],
		key: string
	): boolean
	{
		let language: string;
		let category: string;
		let subcategory: string;

		if (typeof path === 'string')
			[language, category, subcategory] = [path, 'default', 'default'];
		else
			[language, category = 'default', subcategory = 'default'] = path;

		return LocalizationCache.has([language, category, subcategory], key);
	}

	/**
	 * Gets a `LocalizationResourceProxy` for the given path. See {@link LocalizationResourceProxy}
	 * Uses a cached resource proxy if one already exists for the given language
	 *
	 * Accepts a language string, or accepts a string tuple matching
	 * any of the following patterns:
	 *
	 *     [language, category, subcategory] // Self-explanatory
	 *     [language, category]              // Defaults to 'default'' subcategory
	 *     [language]                        // Defaults to 'default' category, 'default' subcategory
	 */
	public static getResourceProxy<T = {}>(
		path: string | [string] | [string, string] | [string, string, string]
	): LocalizationResourceProxy<T>
	{
		let language: string;
		let category: string;
		let subcategory: string;

		if (typeof path === 'string')
			[language, category, subcategory] = [path, 'default', 'default'];
		else
			[language, category = 'default', subcategory = 'default'] = path;

		if (LocalizationCache.hasProxy([language, category, subcategory]))
			return LocalizationCache.getProxy([language, category, subcategory]) as LocalizationResourceProxy<T>;

		const proxy: LocalizationResourceProxy<T> = new Proxy({}, {
			get: (_, key: string) =>
				(args?: TemplateArguments, _meta: LocalizationResrouceMetaData = {}): string =>
				{
					_meta._ip = true;
					return (Localization.resource as any)([language, category, subcategory], key, args, _meta);
				}
		}) as LocalizationResourceProxy<T>;

		// Cache the new proxy for future use
		LocalizationCache.setProxy([language, category, subcategory], proxy);

		return proxy;
	}
}
