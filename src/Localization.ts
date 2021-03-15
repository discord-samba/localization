import { InternalLocalization } from '#type/InternalLocalization';
import { InternalResourceProxy } from '#type/InternalResourceProxy';
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
		const resourcePath: [string, string, string] = Localization._createPath(path);
		const [language, category, subcategory] = resourcePath;

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

		// Set the current key
		_meta._ck = key;

		// Create meta proxy to forward args and _meta for use in script templates
		if (typeof _meta._mp === 'undefined')
		{
			_meta._mp = new Proxy({}, {
				get: (_, _key: string) =>
				{
					// Return resource call fn if this key hasn't been seen before
					if (!_meta._cc?.includes(_key))
					{
						const proxy: InternalResourceProxy = Localization.getResourceProxy(path);
						return (_args: TemplateArguments = args): string => proxy[_key](_args, _meta);
					}

					// Parent is guaranteed to exist at this point since this proxy
					// would never be accessed if it didn't, so this assertion is safe
					const parent: LocalizationStringParentNode = LocalizationCache.get(resourcePath, key)?.node!;

					// Throw resource recursion error
					throw new LocalizationStringError(
						'A localization resource cannot refer to any previous parent',
						parent?.container,
						parent?.line,
						parent?.column,
						_meta
					);
				}
			}) as LocalizationResourceProxy;
		}

		// Get string builder for the given resource path & key
		let builder: LocalizationStringBuilder | undefined = LocalizationCache.get(resourcePath, key);

		// Try fallback lang if builder was not found
		if (typeof builder === 'undefined' && typeof LocalizationCache.fallbackLanguage !== 'undefined')
			builder = LocalizationCache.get([LocalizationCache.fallbackLanguage, category, subcategory], key);

		// Return default string if fallback builder was not found
		if (typeof builder === 'undefined')
			return `${language}::${category}::${subcategory}::${key}`;

		// Build and return the Localization resource
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
		return LocalizationCache.has(Localization._createPath(path), key);
	}

	/**
	 * Gets a [[`LocalizationResourceProxy`]] for the given path. Uses a cached
	 * resource proxy if one already exists for the given path
	 */
	public static getResourceProxy<T extends {} = {}>(path: ResourcePath): LocalizationResourceProxy<T>
	{
		const resourcePath: [string, string, string] = Localization._createPath(path);

		if (LocalizationCache.hasProxy(resourcePath))
			return LocalizationCache.getProxy(resourcePath) as LocalizationResourceProxy<T>;

		const proxy: LocalizationResourceProxy<T> = new Proxy({}, {
			get: (_, key: string) =>
				(args: TemplateArguments = {}, _meta: LocalizationResrouceMetaData = {}): string =>
				{
					_meta._ip = true;
					return (Localization as InternalLocalization).resource(resourcePath, key, args, _meta);
				}
		}) as LocalizationResourceProxy<T>;

		// Cache the new proxy for future use
		LocalizationCache.setProxy(resourcePath, proxy);

		return proxy;
	}

	/**
	 * Returns an array of resource keys for the given resource path. The array
	 * will be empty if none exist.
	 */
	public static getKeys(path: ResourcePath): string[]
	{
		return LocalizationCache.getKeys(Localization._createPath(path));
	}

	/**
	 * Returns whether or not the cache has a [[LocalizationPipeFunction]] with
	 * the given identifier
	 */
	public static hasPipeFunction(ident: string): boolean
	{
		return LocalizationCache.hasPipeFunction(ident);
	}

	/**
	 * Adds a [[LocalizationPipeFunction]] with the given identifier to the cache
	 */
	public static addPipeFunction(idenbt: string, fn: LocalizationPipeFunction): void
	{
		LocalizationCache.addPipeFunction(idenbt, fn);
	}

	/**
	 * Gets the [[LocalizationPipeFunction]] with the given identifier from the
	 * cache and returns it
	 */
	public static getPipeFunction(ident: string): LocalizationPipeFunction | undefined
	{
		return LocalizationCache.getPipeFunction(ident);
	}

	/**
	 * Creates a usable path from the given ResourcePath
	 */
	private static _createPath(fromPath: ResourcePath): [string, string, string]
	{
		let language: string;
		let category: string;
		let subcategory: string;

		if (typeof fromPath === 'string')
			[language, category, subcategory] = [fromPath, 'default', 'default'];
		else
			[language, category = 'default', subcategory = 'default'] = fromPath;

		return [language, category, subcategory];
	}
}
