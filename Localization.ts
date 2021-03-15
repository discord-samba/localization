import { LocalizationCache } from '#root/LocalizationCache';
import { LocalizationFileLoader } from '#loader/LocalizationFileLoader';
import { LocalizationPipeFunction } from '#type/LocalizationPipeFunction';
import { LocalizationResourceProxy } from '#type/LocalizationResourceProxy';
import { LocalizationResrouceMetaData } from '#type/LocalizationResourceMetaData';
import { LocalizationStringBuilder } from '#root/LocalizationStringBuilder';
import { LocalizationStringError } from '#root/LocalizationStringError';
import { LocalizationStringParentNode } from '#interface/LocalizationStringParentNode';
import { ResourcePath } from '#type/ResourcePath';
import { TemplateArguments } from '#type/TemplateArguments';

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
	 * Fetches a Localization string resource for the given path and key. The string
	 * will be built using the given arguments
	 */
	public static resource(path: ResourcePath, key: string, args?: TemplateArguments): string;

	// Cast to `any` for passing _meta as TS will reject it otherwise. Only the first
	// overload is counted in the public method signature, which is desired as _meta
	// is a mechanic handled internally
	public static resource(
		path: ResourcePath,
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
			throw new Error(`No language '${language}' has been loaded`);

		// If we don't have call location information, capture it
		if (typeof _meta._cl === 'undefined')
		{
			const trace: { stack: string } = { stack: '' };
			Error.captureStackTrace(trace);
			_meta._cl = trace
				.stack
				.split('\n')
				.slice(_meta._ip! ? 3 : 2)
				.join('\n');
		}

		// Define meta call chain if it doesn't exist
		if (typeof _meta._cc === 'undefined')
			_meta._cc = [];

		// Push key to the current call chain
		_meta._cc.push(key);

		// Push the current key
		_meta._ck = key;

		// Create proxy to forward args and _meta for use in script templates
		if (typeof _meta._mp === 'undefined')
		{
			_meta._mp = new Proxy({}, {
				get: (_, _key: string) =>
				{
					// Handle recursion protection for script templates using the
					// given resource proxy
					if (_meta._cc?.includes(_key))
					{
						const parent: LocalizationStringParentNode =
							LocalizationCache.get([language, category, subcategory], key)?.node!;

						throw new LocalizationStringError(
							'A localization resource cannot refer to any previous parent',
							parent?.container,
							parent?.line,
							parent?.column,
							_meta
						);
					}
					else
					{
						const proxy: LocalizationResourceProxy = Localization.getResourceProxy(path);
						return (_args: TemplateArguments = args): string =>
							(proxy as any)[_key](_args, _meta);
					}
				}
			}) as LocalizationResourceProxy;
		}

		let builder: LocalizationStringBuilder =
			LocalizationCache.get([language, category, subcategory], key)!;

		if (typeof builder === 'undefined' && typeof LocalizationCache.fallbackLanguage !== 'undefined')
			builder = LocalizationCache.get([LocalizationCache.fallbackLanguage, category, subcategory], key)!;

		if (typeof builder === 'undefined')
			return `${language}::${category}::${subcategory}::${key}`;

		return builder.build(args, _meta);
	}

	/**
	 * Returns whether or not a Localization resource exists for the
	 * given path.
	 *
	 * >**NOTE:** Does not check the fallback language
	 */
	public static resourceExists(path: ResourcePath, key: string): boolean
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
	 * Uses a cached resource proxy if one already exists for the given path
	 */
	public static getResourceProxy<T extends {} = {}>(path: ResourcePath): LocalizationResourceProxy<T>
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

	/**
	 * Returns an array of resource keys for the given resource path. The array
	 * will be empty if none exist.
	 */
	public static getKeys(path: ResourcePath): string[]
	{
		let language: string;
		let category: string;
		let subcategory: string;

		if (typeof path === 'string')
			[language, category, subcategory] = [path, 'default', 'default'];
		else
			[language, category = 'default', subcategory = 'default'] = path;

		return LocalizationCache.getKeys([language, category, subcategory]);
	}

	/**
	 * Returns whether or not the cache has a [[LocalizationPipeFunction]] for the given key
	 */
	public static hasPipeFunction(key: string): boolean
	{
		return LocalizationCache.hasPipeFunction(key);
	}

	/**
	 * Adds a [[LocalizationPipeFunction]] for the given key to the cache
	 */
	public static addPipeFunction(key: string, fn: LocalizationPipeFunction): void
	{
		LocalizationCache.addPipeFunction(key, fn);
	}

	/**
	 * Gets a [[LocalizationPipeFunction]] for the given key from the cache and returns it
	 */
	public static getPipeFunction(key: string): LocalizationPipeFunction | undefined
	{
		return LocalizationCache.getPipeFunction(key);
	}
}
