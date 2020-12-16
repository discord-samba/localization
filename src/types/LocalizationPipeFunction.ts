/**
 * Represents a function that can be used in Localization files by piping template
 * values into it. The function must accept the piped-in template value, and can
 * optionally accept any other static values of the types string, number, or boolean.
 * These additional values allow pipe functions to be configurable.
 *
 * **Note:** The typings specify any type for these additional parameters, but
 * the localization parser only supports string, number, and boolean primitives
 * in the localization file syntax, which translate directly to their JavaScript
 * equivalents
 *
 * In the case of regular templates and optional templates, the piped-in value is
 * of whatever type the template argument value is. In the case of include templates
 * the piped-in value is always a string, given that the value is an included resource
 * which is a fully-built localization string
 *
 * Realistically pipe functions can transform the piped in data in many ways and
 * can accept piped-in data of any type, given anything can be passed to Localization
 * resources as desired. However, you should always make sure to be aware of how
 * each function is transforming your data with regards to what is being piped
 * into the next.
 */
export type LocalizationPipeFunction = (
	pipeValue: any,
	...args: any[]
) => any;
