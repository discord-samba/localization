import { LocalizationStringParentNode } from './interfaces/LocalizationStringParentNode';
import { LocalizationStringBuilder } from './LocalizationStringBuilder';
import { LocalizationResourceProxy } from './types/LocalizationResourceProxy';

/**
 * Caches string builders for given `LocalizationStringParentNodes`
 * for given languages and `LocalizationResourceProxy` instances
 * for given languages as well
 */
export class LocalizationCache
{
	private static _instance: LocalizationCache;

	private _cache: Map<string, Map<string, LocalizationStringBuilder>>;
	private _proxyCache: Map<string, LocalizationResourceProxy>;

	private constructor()
	{
		if (typeof LocalizationCache._instance !== 'undefined')
			throw new Error('Cannot create multiple instances of LocalizationCache');

		LocalizationCache._instance = this;
		this._cache = new Map();
		this._proxyCache = new Map();
	}

	/**
	 * Returns the instance of the LocalizationCache singleton
	 */
	public static instance(): LocalizationCache
	{
		return LocalizationCache._instance ?? new LocalizationCache();
	}

	/**
	 * Returns whether or we have a cache for the given language
	 */
	public static hasLanguage(language: string): boolean
	{
		return LocalizationCache.instance()._cache.has(language);
	}

	/**
	 * Returns whether or not we have a string builder for the given
	 * key for the given language
	 */
	public static has(language: string, key: string): boolean
	{
		if (!LocalizationCache.hasLanguage(language))
			return false;
		
		return LocalizationCache.instance()._cache.get(language)!.has(key);
	}

	/**
	 * Returns a `LocalizationStringBuilder` with the given language
	 * and key if it exists
	 */
	public static get(language: string, key: string): LocalizationStringBuilder | undefined
	{
		if (!LocalizationCache.hasLanguage(language))
			return;
	
		return LocalizationCache.instance()._cache.get(language)!.get(key);
	}

	/**
	 * Adds a node to the cache as a builder with the given key for the given language.
	 * Also adds a cache for the given language if it doesn't already exist
	 */
	public static set(language: string, key: string, node: LocalizationStringParentNode): void
	{
		if (!LocalizationCache.hasLanguage(language))
			LocalizationCache.instance()._cache.set(language, new Map());

		LocalizationCache.instance()._cache.get(language)!
			.set(key, new LocalizationStringBuilder(language, node));
	}

	/**
	 * Returns whether or not we have a cached proxy for the given language
	 */
	public static hasProxy(language: string): boolean
	{
		return LocalizationCache.instance()._proxyCache.has(language);
	}

	/**
	 * Returns a proxy for the given language if it exists
	 */
	public static getProxy(language: string): LocalizationResourceProxy | undefined
	{
		return LocalizationCache.instance()._proxyCache.get(language);
	}

	/**
	 * Adds a proxy to the proxy cache for the given language
	 */
	public static setProxy(language: string, proxy: LocalizationResourceProxy): void
	{
		LocalizationCache.instance()._proxyCache.set(language, proxy);
	}
}
