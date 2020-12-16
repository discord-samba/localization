import { Localization } from '../Localization';
import { LocalizationCache } from '../LocalizationCache';
import { LocalizationParser as Parser } from '../parser/LocalizationParser';

const l: string = 'test';
const c: string = 'parser.test.lang';
const d: string = 'default';
const p: [string, string, string] = [l, d, d];

describe('Building strings from abstract localization nodes', () =>
{
	it('Should build a simple string', () =>
	{
		LocalizationCache.set(p, 'test', Parser.parse(c, '[test]\nfoobarbaz')[0]);
		expect(LocalizationCache.get(p, 'test')!.build({}, {})).toBe('foobarbaz');
		LocalizationCache.clear();
	});

	it('Should build a string with regular templates', () =>
	{
		LocalizationCache.set(p, 'test', Parser.parse(c, '[test]\nfoo{{ bar }}baz')[0]);
		expect(LocalizationCache.get(p, 'test')!.build({ bar: 'bar' }, {})).toBe('foobarbaz');
		LocalizationCache.clear();
	});

	it('Should build a string with optional templates', () =>
	{
		LocalizationCache.set(p, 'test', Parser.parse(c, '[test]\nfoo{{? bar }}baz')[0]);
		expect(LocalizationCache.get(p, 'test')!.build({ bar: 'bar' }, {})).toBe('foobarbaz');
		LocalizationCache.clear();
	});

	it('Should build a string with optional templates with missing args', () =>
	{
		LocalizationCache.set(p, 'test', Parser.parse(c, '[test]\nfoo{{? bar }}baz')[0]);
		expect(LocalizationCache.get(p, 'test')!.build({}, {})).toBe('foobaz');
		LocalizationCache.clear();
	});

	it('Should properly handle isolated optional templates', () =>
	{
		LocalizationCache.set(p, 'test', Parser.parse(c, '[test]\nfoo\n{{? bar }}\nbaz')[0]);
		expect(LocalizationCache.get(p, 'test')!.build({}, {})).toBe('foo\nbaz');
		LocalizationCache.clear();
	});

	it('Should build a string with include templates', () =>
	{
		LocalizationCache.set(p, 'test1', Parser.parse(c, '[test1]\nfoobarbaz')[0]);
		LocalizationCache.set(p, 'test2', Parser.parse(c, '[test2]\nfoo{{> test1 }}baz')[0]);
		expect(LocalizationCache.get(p, 'test2')!.build({}, {})).toBe('foofoobarbazbaz');
		LocalizationCache.clear();
	});

	it('Should build a string with script templates', () =>
	{
		LocalizationCache.set(p, 'test', Parser.parse(c, '[test]\nfoo{{! \'bar\' !}}baz')[0]);
		expect(LocalizationCache.get(p, 'test')!.build({}, {})).toBe('foobarbaz');
		LocalizationCache.clear();
	});

	it('Should properly handle isolated script templates', () =>
	{
		LocalizationCache.set(p, 'test', Parser.parse(c, '[test]\nfoo\n{{! undefined !}}\nbaz')[0]);
		expect(LocalizationCache.get(p, 'test')!.build({}, {})).toBe('foo\nbaz');
		LocalizationCache.clear();
	});

	// We use Localization.resource() here to build and forward metadata
	// for the sake of convenience rather than mocking it. We're still
	// effectively testing LocalizationStringBuilder in the end
	describe('Localization resource build errors', () =>
	{
		it('Should error on recursive include templates', () =>
		{
			LocalizationCache.set(p, 'test1', Parser.parse(c, '[test1]\nfoo{{> test2 }}baz')[0]);
			LocalizationCache.set(p, 'test2', Parser.parse(c, '[test2]\nfoo{{> test3 }}baz')[0]);
			LocalizationCache.set(p, 'test3', Parser.parse(c, '[test3]\nfoo{{> test1 }}baz')[0]);
			expect(() => Localization.resource(p, 'test3', {}))
				.toThrow('A localization resource cannot refer to any previous parent');

			LocalizationCache.clear();
		});

		it('Should error on recursive script templates', () =>
		{
			LocalizationCache.set(p, 'test1', Parser.parse(c, '[test1]\nfoo{{! res.test2() !}}baz')[0]);
			LocalizationCache.set(p, 'test2', Parser.parse(c, '[test2]\nfoo{{! res.test3() !}}baz')[0]);
			LocalizationCache.set(p, 'test3', Parser.parse(c, '[test3]\nfoo{{! res.test1() !}}baz')[0]);
			expect(() => Localization.resource(p, 'test3'))
				.toThrow('A localization resource cannot refer to any previous parent');

			LocalizationCache.clear();
		});
	});
});
