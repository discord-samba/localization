import * as Path from 'path';
import { Localization } from '../Localization';
import { LocalizationResourceProxy } from '../types/LocalizationResourceProxy';
import { LocalizationStringError } from '../LocalizationStringError';

Localization.loadFromDirectory('test', Path.join(__dirname, 'locale', 'test'));
Localization.loadLangFile('fallback', Path.join(__dirname, 'locale', 'fallback', 'test.lang'));

describe('Loading string resources', () =>
{
	const proxy: LocalizationResourceProxy<any> = Localization.getResourceProxy('test');

	it('Should allow checking if a resource exists', () =>
	{
		expect(Localization.resourceExists('test', 'test1')).toBe(true);
		expect(Localization.resourceExists('foo', 'bar')).toBe(false);
	});

	it('Should load a simple string', () =>
	{
		expect(Localization.resource('test', 'test1')).toBe('foobarbaz');
		expect(proxy.test1()).toBe('foobarbaz');
	});

	it('Should load a simple one-line string', () =>
	{
		expect(Localization.resource(['test', 'oneLine'], 'test1')).toBe('boofarfaz');
	});

	it('Should accept one-line strings that span multiple lines', () =>
	{
		expect(Localization.resource(['test', 'oneLine'], 'test2')).toBe('boofarfaz\nfoobarbaz');
	});

	it('Should handle regular templates', () =>
	{
		expect(Localization.resource('test', 'test2', { bar: 'bar' })).toBe('foobarbaz');
		expect(Localization.resource('test', 'test2')).toBe('fooundefinedbaz');
		expect(proxy.test2({ bar: 'bar' })).toBe('foobarbaz');
		expect(proxy.test2()).toBe('fooundefinedbaz');
	});

	it('Should handle optional templates', () =>
	{
		expect(Localization.resource('test', 'test3', { bar: 'bar' })).toBe('foobarbaz');
		expect(Localization.resource('test', 'test3')).toBe('foobaz');
		expect(proxy.test3({ bar: 'bar' })).toBe('foobarbaz');
		expect(proxy.test3()).toBe('foobaz');
	});

	it('Should properly handle isolated optional templates', () =>
	{
		expect(Localization.resource('test', 'test4')).toBe('foo\nbaz');
		expect(Localization.resource('test', 'test4', { bar: '' })).toBe('foo\n\nbaz');
		expect(proxy.test4()).toBe('foo\nbaz');
		expect(proxy.test4({ bar: '' })).toBe('foo\n\nbaz');
	});

	it('Should handle forward templates', () =>
	{
		expect(Localization.resource('test', 'test5', { bar: 'bar' })).toBe('foofoobarbazbaz');
		expect(Localization.resource('test', 'test5')).toBe('foofoobazbaz');
		expect(proxy.test5({ bar: 'bar' })).toBe('foofoobarbazbaz');
		expect(proxy.test5()).toBe('foofoobazbaz');
	});

	it('Should handle script templates', () =>
	{
		expect(Localization.resource('test', 'test6')).toBe('foobarbaz');
		expect(proxy.test6()).toBe('foobarbaz');
	});

	it('Should handle script templates loading other resources', () =>
	{
		expect(Localization.resource('test', 'test7')).toBe('foofoobazbaz');
		expect(Localization.resource('test', 'test7', { bar: 'bar' })).toBe('foofoobarbazbaz');
		expect(proxy.test7()).toBe('foofoobazbaz');
		expect(proxy.test7({ bar: 'bar' })).toBe('foofoobarbazbaz');
	});

	it('Should handle script templates returning undefined', () =>
	{
		expect(Localization.resource('test', 'test8')).toBe('foobaz');
		expect(proxy.test8()).toBe('foobaz');
	});

	it('Should properly handle isolated script templates', () =>
	{
		expect(Localization.resource('test', 'test9')).toBe('foo\nbaz');
		expect(Localization.resource('test', 'test9', { bar: '' })).toBe('foo\n\nbaz');
		expect(proxy.test9()).toBe('foo\nbaz');
		expect(proxy.test9({ bar: '' })).toBe('foo\n\nbaz');
	});

	it('Should error when given non-existant forward template key', () =>
	{
		const fn: Function = () => proxy.test10();
		expect(fn).toThrow(LocalizationStringError);
		expect(fn).toThrow('Localization string key \'bar\' does not exist for language \'test\'');
	});

	it('Should overload previously loaded strings', () =>
	{
		expect(Localization.resource('test', 'test11')).toBe('boofarfaz');
	});

	it('Should pull from fallback language if no resource is found', () =>
	{
		expect(Localization.resource('test', 'foo')).toBe('test::default::default::foo');
		expect(proxy.foo()).toBe('test::default::default::foo');

		Localization.setFallbackLanguage('fallback');

		// Defined in locale/fallback/test.lang
		expect(Localization.resource('test', 'foo')).toBe('foobarbaz\nboofarfaz');
		expect(proxy.foo()).toBe('foobarbaz\nboofarfaz');
	});

	it('Should return path for non-existant resources', () =>
	{
		const foobarProxy: LocalizationResourceProxy<any> =
			Localization.getResourceProxy(['test', 'foo', 'bar']);

		expect(foobarProxy.baz()).toBe('test::foo::bar::baz');
		expect(Localization.resource(['test', 'foo', 'bar'], 'baz'))
			.toBe('test::foo::bar::baz');
	});

	it('Should error for non-existant languages', () =>
	{
		const fn: Function = () => Localization.resource('foo', 'bar');
		expect(fn).toThrow(Error);
		expect(fn).toThrow('No language \'foo\' has been loaded');
	});
});

describe('Using non-default categories', () =>
{
	const categoryProxy: LocalizationResourceProxy<any> =
		Localization.getResourceProxy(['test', 'testCat']);

	it('Should load resources from non-default categories', () =>
	{
		expect(Localization.resource(['test', 'testCat'], 'test1')).toBe('fooBARbaz');
		expect(categoryProxy.test1()).toBe('fooBARbaz');
	});
});

describe('Using non-default subcategories', () =>
{
	const subcategoryProxy: LocalizationResourceProxy<any> =
		Localization.getResourceProxy(['test', 'testCat', 'testSub']);

	it('Should load resources from non-default subcategories', () =>
	{
		expect(Localization.resource(['test', 'testCat', 'testSub'], 'test1')).toBe('FOOBARBAZ');
		expect(subcategoryProxy.test1()).toBe('FOOBARBAZ');
	});
});

describe('Using argument type declarations', () =>
{
	const argsProxy: LocalizationResourceProxy<any> =
		Localization.getResourceProxy(['test', 'args']);

	it('Should succeed when receiving correct types', () =>
	{
		expect(() => argsProxy.test1({ bar: 'bar' })).not.toThrow(LocalizationStringError);
	});

	it('Should error when receiving the wrong type', () =>
	{
		const fn: Function = () => argsProxy.test1({ bar: 1 });
		expect(fn).toThrow(LocalizationStringError);
		expect(fn).toThrow('Expected type \'string\', got number');
	});

	it('Should error when receiving no arg when one is expected', () =>
	{
		const fn: Function = () => argsProxy.test1();
		expect(fn).toThrow(LocalizationStringError);
		expect(fn).toThrow('Expected type \'string\', got undefined');
	});

	it('Should succeed when receiving a correct array type', () =>
	{
		expect(() => argsProxy.test2({ bar: ['b', 'a', 'r'] })).not.toThrow(LocalizationStringError);
	});

	it('Should error when receiving non-array type when expecting array', () =>
	{
		const fn: Function = () => argsProxy.test2({ bar: 'bar' });
		expect(fn).toThrow(LocalizationStringError);
		expect(fn).toThrow('Expected array type, got string');
	});

	it('Should error when receiving the wrong type within an array', () =>
	{
		const fn: Function = () => argsProxy.test2({ bar: [1, 2, 3] });
		expect(fn).toThrow(LocalizationStringError);
		expect(fn).toThrow('Expected type \'string\' in array, got number');
	});

	it('Should succeed when not given an optional argument', () =>
	{
		const fn: Function = () => argsProxy.test3();
		expect(fn).not.toThrow(LocalizationStringError);
		expect(fn()).toBe('foobaz');
	});

	it('Should error when given an optional argument of the wrong type', () =>
	{
		const fn: Function = () => argsProxy.test3({ bar: 1 });
		expect(fn).toThrow(LocalizationStringError);
		expect(fn).toThrow('Expected type \'string\', got number');
	});

	it('Should allow any type for arguments of type \'any\'', () =>
	{
		expect(argsProxy.test4({ bar: 'bar' })).toBe('foobarbaz');
		expect(argsProxy.test4({ bar: 1 })).toBe('foo1baz');
		expect(argsProxy.test4({ bar: true })).toBe('footruebaz');
	});

	it('Should error when not given required argument of type \'any\'', () =>
	{
		const fn: Function = () => argsProxy.test4();
		expect(fn).toThrow(LocalizationStringError);
		expect(fn).toThrow('Expected type \'any\', got undefined');
	});

	it('Should allow any type in array for arguments of type \'any[]\'', () =>
	{
		expect(argsProxy.test5({ bar: [1, true, 'three'] })).toBe('foo1truethreebaz');
	});

	it('Should implicitly declare $template_arguments for any used in the script', () =>
	{
		expect(argsProxy.test6({ bar: 'bar', far: 'far' })).toBe('fooBARbaz\nboofarfarfaz');
		expect(argsProxy.test7({ bar: true })).toBe('foobarbaz');
		expect(argsProxy.test7({ bar: false })).toBe('foobazbaz');
	});
});

describe('Using template pipes', () =>
{
	it('Should properly pipe values in regular templates', () =>
	{
		expect(Localization.resource('test', 'test12', { bar: 'bar' })).toBe('fooBARbaz');
	});

	it('Should properly pipe values in optional templates', () =>
	{
		expect(Localization.resource('test', 'test13', { bar: 'bar' })).toBe('fooBARbaz');
		expect(() => Localization.resource('test', 'test13'))
			.toThrow('Cannot read property \'toUpperCase\' of undefined');
	});

	it('Should properly pipe forward template results', () =>
	{
		expect(Localization.resource('test', 'test14', { bar: 'bar' })).toBe('FOOBARBAZ');
	});

	it('Should properly pipe to multiple functions', () =>
	{
		expect(Localization.resource('test', 'test15', { foo: 'bar' })).toBe('bar');
	});

	it('Should properly pipe to functions accepting additional parameters', () =>
	{
		expect(Localization.resource('test', 'test16', { foo: 'bar' })).toBe('barbarbar');
	});

	it('Should error for non-existant pipe functions', () =>
	{
		expect(() => Localization.resource('test', 'test17', { bar: 'bar' }))
			.toThrow('LocalizationPipeFunction \'nonExistantFn\' does not exist');
	});

	it('Should return expected results from base pipe functions', () =>
	{
		expect(Localization.resource(
			'test', 'test18', { foo: 'bar' }
		)).toBe([
			'BAR',
			'bar',
			'Bar',
			'barbarbar',
			'@@bar',
			'bar@@',
			'bar',
			'bar',
			'bar',
			'barabcd',
			'ba',
			'foobar'
		].join('\n'));

		expect(Localization.resource(
			'test', 'test19', { bar: 20 }
		)).toBe([
			'baz',
			'10',
			'50'
		].join('\n'));

		expect(Localization.resource(
			'test',
			'test20',
			{
				foo: [{ foo: 'baz', baz: 'far' }, { foo: 'bar', baz: 'boo' }],
				bar: ['foo', 'bar', 'baz']
			}
		)).toBe([
			'boo',
			'bar'
		].join('\n'));

		expect(Localization.resource(
			'test', 'test21', { foo: ['foo', 'bar', 'baz', 'baz'] }
		)).toBe([
			'foo',
			'foo,bar,baz',
			'foo+bar+baz+baz'
		].join('\n'));
	});
});

describe('Misc.', () =>
{
	it('Should provide a list of all keys for the given language/path', () =>
	{
		const genTestNames: (n: number) => string[] =
			n => new Array(n)
				.fill(0)
				.map((_, i) => `test${i + 1}`);

		expect(Localization.getKeys('test')).toStrictEqual(genTestNames(21));
		expect(Localization.getKeys(['test', 'args'])).toStrictEqual(genTestNames(7));
		expect(Localization.getKeys(['test', 'oneLine'])).toStrictEqual(genTestNames(2));
		expect(Localization.getKeys(['test', 'testCat', 'testSub'])).toStrictEqual(genTestNames(1));
	});

	it('Should provide an empty list of keys for nonexistant languages/paths', () =>
	{
		expect(Localization.getKeys('foo')).toStrictEqual([]);
		expect(Localization.getKeys(['test', 'foo'])).toStrictEqual([]);
		expect(Localization.getKeys(['test', 'default', 'foo'])).toStrictEqual([]);
		expect(Localization.getKeys(['test', 'oneLine', 'foo'])).toStrictEqual([]);
		expect(Localization.getKeys(['test', 'testCat', 'foo'])).toStrictEqual([]);
	});
});
