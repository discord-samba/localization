/**
 * Represents a Proxy object for a specific language where function calls
 * will call [Localization.resource()]{@link Localization.resource} for that
 * language and forward the given `TemplateArguments` to the resource lookup.
 *
 * **TypeScript note:** Can be given a type parameter object where the keys
 * are Localization string keys mapped to type objects that map template keys
 * to template value types. This will provide type hinting for both template
 * key names (methods on the proxy) and the template arguments they expect.
 * Example:
 *
 * ```ts
 * type Resources = { foo: { bar: string, baz?: number } };
 * const proxy: LocalizationResourceProxy<Resources> = Localization.getResourceProxy('en-US');
 * const foo: string = proxy.foo({ bar: 'baz' });
 * // The compiler knows that the value of `bar` should be a string, and
 * // that `baz` expects a number but is optional
 * ```
 */
export type LocalizationResourceProxy<T extends Record<string, Record<string, any>> = {}> = {
	[K in keyof T]: T[K] extends Record<string, never>
		? (args?: T[K] & Record<string, any>) => string
		: (args: T[K] & Record<string, any>) => string;
} & {
	[K: string]: (args?: Record<string, any>) => string;
};
