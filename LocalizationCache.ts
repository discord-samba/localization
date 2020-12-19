import { LocalizationPipeFunction } from '#type/LocalizationPipeFunction';
import { LocalizationResourceProxy } from '#type/LocalizationResourceProxy';
import { LocalizationStringBuilder } from '#root/LocalizationStringBuilder';
import { LocalizationStringParentNode } from '#interface/LocalizationStringParentNode';
import { inspect } from 'util';

/**
 * Caches string builders for given `LocalizationStringParentNodes`
 * for given languages and `LocalizationResourceProxy` instances
 * for given languages as well.
 * @internal
 */
export class LocalizationCache
{
	private static readonly _whitespace: RegExp = /\s+/g;

	private static _staticInstance: LocalizationCache;

	// Language -> Category -> Subcategory -> Key -> LocalizationStringBuilder
	private _cache: Map<string, Map<string, Map<string, Map<string, LocalizationStringBuilder>>>>;

	// Language -> Category -> Subcategory -> LocalizationResourceProxy
	private _proxyCache: Map<string, Map<string, Map<string, LocalizationResourceProxy>>>;

	private _pipeCache: Map<string, LocalizationPipeFunction>;

	private _fallbackLang!: string;

	private constructor()
	{
		if (typeof LocalizationCache._staticInstance !== 'undefined')
			throw new Error('Cannot create multiple instances of LocalizationCache');

		LocalizationCache._staticInstance = this;
		this._cache = new Map();
		this._proxyCache = new Map();
		this._pipeCache = new Map();

		// Add base pipe functions
		this._pipeCache.set('default', <T, U>(pipeVal: T, d: U): T | U => typeof pipeVal === 'undefined' ? d : pipeVal);
		this._pipeCache.set('toUpperCase', (pipeVal: string) => pipeVal.toUpperCase());
		this._pipeCache.set('toLowerCase', (pipeVal: string) => pipeVal.toLowerCase());
		this._pipeCache.set('capitalize', (pipeVal: string) => pipeVal[0].toUpperCase() + pipeVal.slice(1));
		this._pipeCache.set('repeat', (pipeVal: string, n: number) => pipeVal.repeat(n));
		this._pipeCache.set('padStart', (pipeVal: string, n: number, s: string = ' ') => pipeVal.padStart(n, s));
		this._pipeCache.set('padEnd', (pipeVal: string, n: number, s: string = ' ') => pipeVal.padEnd(n, s));
		this._pipeCache.set('trim', (pipeVal: string) => pipeVal.trim());
		this._pipeCache.set('trimLeft', (pipeVal: string) => pipeVal.trimLeft());
		this._pipeCache.set('trimRight', (pipeVal: string) => pipeVal.trimRight());
		this._pipeCache.set('concat', (pipeVal: string, ...v: string[]) => pipeVal.concat(...v));
		this._pipeCache.set('slice', (pipeVal: string | any[], s?: number, e?: number) => pipeVal.slice(s, e));
		this._pipeCache.set('prepend', (pipeVal: string, p: string) => p + pipeVal);
		this._pipeCache.set('split', (pipeVal: string, s: string) => pipeVal.split(s));
		this._pipeCache.set('length', (pipeVal: string | any[]) => pipeVal.length);
		this._pipeCache.set('replace', (pipeVal: string, r: string, val: string) =>
			pipeVal.replace(new RegExp(r, 'g'), val));

		this._pipeCache.set('replaceOnce', (pipeVal: string, r: string, val: string) =>
			pipeVal.replace(new RegExp(r), val));

		this._pipeCache.set('truncate', (pipeVal: string, len: number, fill: string = '...') =>
			len < pipeVal.length
				? pipeVal.slice(0, Math.max(len - fill.length, 0)) + fill
				: pipeVal);

		this._pipeCache.set('normalizeWhitespace', (pipeVal: string) =>
			pipeVal
				.replace(LocalizationCache._whitespace, ' ')
				.trim());

		this._pipeCache.set('max', (pipeVal: number, max: number) => Math.min(pipeVal, max));
		this._pipeCache.set('min', (pipeVal: number, min: number) => Math.max(pipeVal, min));
		this._pipeCache.set('add', (pipeVal: number, n: number) => pipeVal + n);
		this._pipeCache.set('subtract', (pipeVal: number, n: number) => pipeVal - n);
		this._pipeCache.set('multiplyBy', (pipeVal: number, n: number) => pipeVal * n);
		this._pipeCache.set('divideBy', (pipeVal: number, n: number) => pipeVal / n);
		this._pipeCache.set('floor', (pipeVal: number) => Math.floor(pipeVal));
		this._pipeCache.set('ceil', (pipeVal: number) => Math.ceil(pipeVal));
		this._pipeCache.set('clamp', (pipeVal: number, min: number, max: number) =>
			min < max
				? Math.max(max, Math.min(min, pipeVal))
				: Math.min(min, Math.max(max, pipeVal)));

		this._pipeCache.set('first', <T>(pipeVal: T[]) => pipeVal[0]);
		this._pipeCache.set('join', (pipeVal: any[], s: string = ',') => pipeVal.join(s));
		this._pipeCache.set('unique', (pipeVal: any[]) => Array.from(new Set(pipeVal)));
		this._pipeCache.set('pick', (pipeVal: any, key: string) => pipeVal[key]);
		this._pipeCache.set('select', (pipeVal: any[], key: string) => pipeVal.map(v => v[key]));
		this._pipeCache.set('where', (pipeVal: any[], key: string, val?: string) =>
			pipeVal.filter(o =>
				typeof val === 'undefined'
					? Boolean(o[key])
					: o[key] === val));

		this._pipeCache.set('inspect', (pipeVal: any, depth: number = 1) => inspect(pipeVal, { depth }));
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

	/**
	 * Returns an array of resource keys for the given language path.
	 * The array will be empty if none exist.
	 */
	public static getKeys(path: [string, string, string]): string[]
	{
		const [language, category = 'default', subcategory = 'default'] = path;

		return Array.from(
			LocalizationCache._instance._cache
				.get(language)
				?.get(category)
				?.get(subcategory)
				?.keys() ?? []
		);
	}

	/**
	 * Returns whether or not the cache has a LocalizationPipeFunction for the given key
	 */
	public static hasPipeFunction(key: string): boolean
	{
		return LocalizationCache._instance._pipeCache.has(key);
	}

	/**
	 * Adds a LocalizationPipeFunction for the given key to the cache
	 */
	public static addPipeFunction(key: string, fn: LocalizationPipeFunction): void
	{
		LocalizationCache._instance._pipeCache.set(key, fn);
	}

	/**
	 * Gets a LocalizationPipeFunction for the given key from the cache and returns it
	 */
	public static getPipeFunction(key: string): LocalizationPipeFunction | undefined
	{
		return LocalizationCache._instance._pipeCache.get(key);
	}
}
