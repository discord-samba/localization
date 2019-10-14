import * as Path from 'path';
import { Localization } from '../Localization';
import { LocalizationResourceProxy } from '../types/LocalizationResourceProxy';
import { LocalizationStringError } from '../LocalizationStringError';

Localization.loadFromDirectory('test', Path.join(__dirname, 'locale', 'test'));
Localization.loadLangFile('fallback', Path.join(__dirname, 'locale', 'fallback', 'test.lang'));
Localization.setFallbackLanguage('fallback');

describe('Loading string resources', () =>
{
	const proxy: LocalizationResourceProxy<any> = Localization.getResourceProxy('test');

	it('Should allow checking if resource exists', () =>
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

	it('Should handle regular templates', () =>
	{
		expect(Localization.resource('test', 'test2', { bar: 'bar' })).toBe('foobarbaz');
		expect(Localization.resource('test', 'test2')).toBe('fooundefinedbaz');
		expect(proxy.test2({ bar: 'bar' })).toBe('foobarbaz');
		expect(proxy.test2()).toBe('fooundefinedbaz');
	});

	it('Should handle maybe templates', () =>
	{
		expect(Localization.resource('test', 'test3', { bar: 'bar' })).toBe('foobarbaz');
		expect(Localization.resource('test', 'test3')).toBe('foobaz');
		expect(proxy.test3({ bar: 'bar' })).toBe('foobarbaz');
		expect(proxy.test3()).toBe('foobaz');
	});

	it('Should properly handle isolated maybe templates', () =>
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

	it('Should pull from fallback language if no resource is found', () =>
	{
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
});
