import { LocalizationResourceProxy } from './types/LocalizationResourceProxy';
import { LocalizationStringBuilder } from './LocalizationStringBuilder';
import { LocalizationStringParentNode } from './interfaces/LocalizationStringParentNode';

/**
 * Caches string builders for given `LocalizationStringParentNodes`
 * for given languages and `LocalizationResourceProxy` instances
 * for given languages as well.
 * @internal
 */
export class LocalizationCache
{
	private static _staticInstance: LocalizationCache;

	// Language -> Category -> Subcategory -> Key -> LocalizationStringBuilder
	private _cache: Map<string, Map<string, Map<string, Map<string, LocalizationStringBuilder>>>>;

	// Language -> Category -> Subcategory -> LocalizationResourceProxy
	private _proxyCache: Map<string, Map<string, Map<string, LocalizationResourceProxy>>>;

	private _fallbackLang!: string;

	private constructor()
	{
		if (typeof LocalizationCache._staticInstance !== 'undefined')
			throw new Error('Cannot create multiple instances of LocalizationCache');

		LocalizationCache._staticInstance = this;
		this._cache = new Map();
		this._proxyCache = new Map();
	}

	/**
	 * Returns the instance of the LocalizationCache singleton
	 */
	private static get _instance(): LocalizationCache
	{
		return LocalizationCache._staticInstance ?? new LocalizationCache();
	}

	/**
	 * The fallback language to be used by the Localization module if a resource
	 * cannot be found for the given language
	 */
	public static get fallbackLanguage(): string
	{
		return LocalizationCache._instance._fallbackLang;
	}

	public static set fallbackLanguage(language: string)
	{
		LocalizationCache._instance._fallbackLang = language;
	}

	/**
	 * Clear the Localization cache
	 */
	public static clear(): void
	{
		LocalizationCache._instance._cache.clear();
	}

	/**
	 * Returns whether or not the cache has the given language
	 */
	public static hasLanguage(language: string): boolean
	{
		return LocalizationCache._instance._cache
			.has(language);
	}

	/**
	 * Returns whether or not the cache has the given category
	 * for the given language
	 */
	public static hasCategory(language: string, category: string): boolean
	{
		return Boolean(
			LocalizationCache._instance._cache
				.get(language)
				?.has(category)
		);
	}

	/**
	 * Returns whether or not the cache has the given subcategory
	 * for the given category for the given language
	 */
	public static hasSubcategory(language: string, category: string, subcategory: string): boolean
	{
		return Boolean(
			LocalizationCache._instance._cache
				.get(language)
				?.get(category)
				?.has(subcategory)
		);
	}

	/**
	 * Returns whether or not we have a string builder for the given
	 * key for the given language with the given category and subcategory.
	 */
	public static has(path: [string, string, string], key: string): boolean
	{
		const [language, category = 'default', subcategory = 'default'] = path;
		return Boolean(
			LocalizationCache._instance._cache
				.get(language)
				?.get(category)
				?.get(subcategory)
				?.has(key)
		);
	}

	/**
	 * Returns a `LocalizationStringBuilder` with the given language
	 * and key for category 'default' if it exists
	 */
	public static get(path: [string, string, string], key: string): LocalizationStringBuilder | undefined
	{
		const [language, category = 'default', subcategory = 'default'] = path;
		return LocalizationCache._instance._cache
			.get(language)
			?.get(category)
			?.get(subcategory)
			?.get(key);
	}

	/**
	 * Adds a node to the cache as a builder with the given key for the given
	 * language, category, and subcategory. If the category, subcategory, or both
	 * are not given, they will be 'default'.
	 *
	 * Creates the caches for language, category, and subcategory if they don't
	 * already exist
	 */
	public static set(path: [string, string, string], key: string, node: LocalizationStringParentNode): void
	{
		const [language, category = 'default', subcategory = 'default'] = path;

		// Create language cache if it doesn't exist
		if (!LocalizationCache.hasLanguage(language))
			LocalizationCache._instance._cache
				.set(language, new Map());

		// Create category cache if it doesn't exist
		if (!LocalizationCache.hasCategory(language, category))
			LocalizationCache._instance._cache
				.get(language)!
				.set(category, new Map());

		// Create subcategory cache if it doesn't exist
		if (!LocalizationCache.hasSubcategory(language, category, subcategory))
			LocalizationCache._instance._cache
				.get(language)!
				.get(category)!
				.set(subcategory, new Map());

		LocalizationCache._instance._cache
			.get(language)!
			.get(category)!
			.get(subcategory)!
			.set(key, new LocalizationStringBuilder(language, node));
	}

	/**
	 * Returns whether or not we have a cached proxy for the given path
	 */
	public static hasProxy(path: [string, string, string]): boolean
	{
		const [language, category = 'default', subcategory = 'default'] = path;
		return Boolean(
			LocalizationCache._instance._proxyCache
				.get(language)
				?.get(category)
				?.has(subcategory)
		);
	}

	/**
	 * Returns a proxy for the given path if it exists
	 */
	public static getProxy(path: [string, string, string]): LocalizationResourceProxy | undefined
	{
		const [language, category = 'default', subcategory = 'default'] = path;
		return LocalizationCache._instance._proxyCache
			.get(language)
			?.get(category)
			?.get(subcategory);
	}

	/**
	 * Adds a proxy to the proxy cache for the given path, creating
	 * language and category if they don't exist
	 */
	public static setProxy(path: [string, string, string], proxy: LocalizationResourceProxy): void
	{
		const [language, category = 'default', subcategory = 'default'] = path;

		// Create the proxy language cache if it doesn't exist
		if (!LocalizationCache._instance._proxyCache.has(language))
			LocalizationCache._instance._proxyCache
				.set(language, new Map());

		// Create the proxy category cache if it doesn't exist
		if (!LocalizationCache._instance._proxyCache.get(language)!.has(category))
			LocalizationCache._instance._proxyCache
				.get(language)!
				.set(category, new Map());

		LocalizationCache._instance._proxyCache
			.get(language)!
			.get(category)!
			.set(subcategory, proxy);
	}
}
