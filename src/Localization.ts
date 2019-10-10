import { LocalizationCache } from './LocalizationCache';
import { LocalizationFileLoader } from './loader/LocalizationFileLoader';
import { LocalizationResourceProxy } from './types/LocalizationResourceProxy';
import { LocalizationResrouceMetaData } from './types/LocalizationResourceMetaData';
import { LocalizationStringBuilder } from './LocalizationStringBuilder';
import { TemplateArguments } from './types/TemplateArguments';

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
	 */
	public static resource(language: string, key: string, args: TemplateArguments): string;
	public static resource(
		language: string,
		key: string,
		args: TemplateArguments = {},
		_meta: LocalizationResrouceMetaData = {}
	): string
	{
		if (!LocalizationCache.hasLanguage(language))
			throw new Error(`No language '${language}' as been loaded`);

		const proxy: LocalizationResourceProxy = Localization.getResourceProxy(language);

		// TODO: Return something if the resource doesn't exist. Used to do
		//       `lang::key` in YAMDBF. Maybe something else?

		// If we don't have call location information, capture it
		if (typeof _meta._cl === 'undefined')
		{
			const trace: any = {};
			Error.captureStackTrace(trace);
			_meta._cl = trace.stack.split('\n')[_meta._ip! ? 3 : 2];
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

		const builder: LocalizationStringBuilder = LocalizationCache.get(language, key)!;
		return builder.build(args, _meta);
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
			get: (_, key: string) =>
				(args: TemplateArguments, _meta: LocalizationResrouceMetaData = {}): string =>
				{
					_meta._ip = true;
					return (Localization.resource as any)(language, key, args, _meta);
				}
		}) as LocalizationResourceProxy<T>;

		LocalizationCache.setProxy(language, proxy);

		return proxy;
	}
}
