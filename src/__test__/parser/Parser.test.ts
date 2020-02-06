import { ParseError } from '../../parser/ParseError';
import { Parser } from '../../parser/Parser';

const c: string = 'parser.test.lang';

describe('Parsing valid localization text', () =>
{
	it('Should parse a simple string', () =>
	{
		expect(() => Parser.parse(c, '[test]\nfoobarbaz')).not.toThrow(ParseError);
	});

	it('Should parse a simple one-line string', () =>
	{
		expect(() => Parser.parse(c, '[test] foobarbaz')).not.toThrow(ParseError);
	});

	it('Should parse regular templates', () =>
	{
		expect(() => Parser.parse(c, '[test]\nfoo{{ bar }}baz')).not.toThrow(ParseError);
	});

	it('Should parse optional templates', () =>
	{
		expect(() => Parser.parse(c, '[test]\nfoo{{? bar }}baz')).not.toThrow(ParseError);
	});

	it('Should parse forward templates', () =>
	{
		expect(() => Parser.parse(c, '[test]\nfoo{{> test2 }}bar')).not.toThrow(ParseError);
	});

	it('Should parse script templates', () =>
	{
		expect(() => Parser.parse(c, '[test]\nfoo{{! \'bar\' !}}baz')).not.toThrow(ParseError);
	});

	it('Should allow strings with placeholder comments', () =>
	{
		expect(() => Parser.parse(c, '[foo]\n## bar\n[baz]\n## boo')).not.toThrow(ParseError);
		expect(() => Parser.parse(c, '[foo]\n## bar\n[baz]\nboo')).not.toThrow(ParseError);
		expect(() => Parser.parse(c, '[foo]\n## bar\n')).not.toThrow(ParseError);
		expect(() => Parser.parse(c, '[foo]\n## bar')).not.toThrow(ParseError);
	});

	describe('Parsing argument type declarations', () =>
	{
		it('Should parse valid declarations ', () =>
		{
			expect(() => Parser.parse(c, '[test]\n##! foo: string\nfoo')).not.toThrow(ParseError);
			expect(() => Parser.parse(c, '[test]\n##! foo?: string\nfoo')).not.toThrow(ParseError);
			expect(() => Parser.parse(c, '[test]\n##! foo: number\nfoo')).not.toThrow(ParseError);
			expect(() => Parser.parse(c, '[test]\n##! foo: boolean\nfoo')).not.toThrow(ParseError);
			expect(() => Parser.parse(c, '[test]\n##! foo: any\nfoo')).not.toThrow(ParseError);
			expect(() => Parser.parse(c, '[test]\n##! foo: String\nfoo')).not.toThrow(ParseError);
			expect(() => Parser.parse(c, '[test]\n##! foo: Number\nfoo')).not.toThrow(ParseError);
			expect(() => Parser.parse(c, '[test]\n##! foo: Boolean\nfoo')).not.toThrow(ParseError);
			expect(() => Parser.parse(c, '[test]\n##! foo: Any\nfoo')).not.toThrow(ParseError);
			expect(() => Parser.parse(c, '[test]\n##! foo: string[]\nfoo')).not.toThrow(ParseError);
			expect(() => Parser.parse(c, '[test]\n##! foo: number[]\nfoo')).not.toThrow(ParseError);
			expect(() => Parser.parse(c, '[test]\n##! foo: boolean[]\nfoo')).not.toThrow(ParseError);
			expect(() => Parser.parse(c, '[test]\n##! foo: any[]\nfoo')).not.toThrow(ParseError);
			expect(() => Parser.parse(c, '[test]\n##! foo: string, bar: number\nfoo')).not.toThrow(ParseError);
			expect(() => Parser.parse(c, '[test]\n##!     foo  :\tstring')).not.toThrow(ParseError);
		});

		// The declarations effectively act as placeholder comments, which are allowed
		it('Should allow strings with only declarations', () =>
		{
			expect(() => Parser.parse(c, '[foo]\n##! bar: string\n[baz]\n##! boo: string')).not.toThrow(ParseError);
			expect(() => Parser.parse(c, '[foo]\n##! bar: string\n[baz]\nboo')).not.toThrow(ParseError);
			expect(() => Parser.parse(c, '[foo]\n##! bar: string\n')).not.toThrow(ParseError);
			expect(() => Parser.parse(c, '[foo]\n##! bar: string')).not.toThrow(ParseError);
		});
	});
});

describe('Throwing parser errors', () =>
{
	it('Should error on invalid templates', () =>
	{
		const e: string = 'Invalid template';
		expect(() => Parser.parse(c, '[test]\nfoo{{ bar ?}}baz')).toThrow(e);
		expect(() => Parser.parse(c, '[test]\nfoo{{! bar }}baz')).toThrow(e);
		expect(() => Parser.parse(c, '[test]\nfoo{{ bar !}}baz')).toThrow(e);
		expect(() => Parser.parse(c, '[test]\nfoo{{! bar ?}}baz')).toThrow(e);
		expect(() => Parser.parse(c, '[test]\nfoo{{? bar !}}baz')).toThrow(e);
		expect(() => Parser.parse(c, '[test]\nfoo{{> bar ?}}baz')).toThrow(e);
		expect(() => Parser.parse(c, '[test]\nfoo{{> bar !}}baz')).toThrow(e);
		expect(() => Parser.parse(c, '[test]\nfoo{{$ bar }}baz')).toThrow(e);
	});

	it('Should error on invalid template identifiers (template argument keys)', () =>
	{
		const e: string = 'Invalid template identifier';
		expect(() => Parser.parse(c, '[test]\n{{ 1 }}')).toThrow(e);
		expect(() => Parser.parse(c, '[test]\n{{ 2foo }}')).toThrow(e);
		expect(() => Parser.parse(c, '[test]\n{{ 3_bar }}')).toThrow(e);
		expect(() => Parser.parse(c, '[test]\n{{ 4 baz }}')).toThrow(e);
		expect(() => Parser.parse(c, '[test]\n{{ foo bar }}')).toThrow(e);
		expect(() => Parser.parse(c, '[test]\n{{? 1 }}')).toThrow(e);
		expect(() => Parser.parse(c, '[test]\n{{? 2foo }}')).toThrow(e);
		expect(() => Parser.parse(c, '[test]\n{{? 3_bar }}')).toThrow(e);
		expect(() => Parser.parse(c, '[test]\n{{? 4 baz }}')).toThrow(e);
		expect(() => Parser.parse(c, '[test]\n{{? foo bar }}')).toThrow(e);
	});

	it('Should error when encountering a key without encountering a body', () =>
	{
		expect(() => Parser.parse(c, '[test]\n[foo]\nfoobarbaz'))
			.toThrow('Unexpected string key, expected string body');
	});

	it('Should error if string key isn\'t first on a line', () =>
	{
		const err: string = [
			'Localization string key must begin at the start of its own line.',
			'Escape the opening brace if using text in square braces'
		].join(' ');

		expect(() => Parser.parse(c, '[test1]\nfoobarbaz\n [test2]\nfoobarbaz'))
			.toThrow(err);
	});

	it('Should error if there is no parsable data', () =>
	{
		const e: string = 'Localization text contained no parsable data';

		expect(() => Parser.parse(c, '## Comments\n## Comments')).toThrow(e);
		expect(() => Parser.parse(c, '\\[test]\nfoobarbaz')).toThrow(e);

		// Because the line starts with a space and not a string key, it's
		// considered a comment line so everything is consumed, leaving no
		// parsable data behind
		expect(() => Parser.parse(c, ' [test]\nfoobarbaz')).toThrow(e);

		expect(() => Parser.parse(c, '\n\n\n\n\n')).toThrow(e);
		expect(() => Parser.parse(c, 'foobarbaz')).toThrow(e);
		expect(() => Parser.parse(c, '\t\n\t')).toThrow(e);
		expect(() => Parser.parse(c, '     ')).toThrow(e);
		expect(() => Parser.parse(c, '')).toThrow(e);
	});

	// A key won't actually be considered valid if it contains invalid characters
	// other than `(`, `)`, and `:` as these are used for categories/subcategories,
	// so it will be parsed as part of the previous string body, or treated as
	// discardable comments if it's the first/only key in the parsed text.
	// These errors are strictly for malformed keys/categrories/subcategories
	describe('Throwing string key/category/subcategory errors', () =>
	{
		it('Should error on malformed parent key', () =>
		{
			expect(() => Parser.parse(c, '[test(test):(test]\nfoobarbaz'))
				.toThrow('Unexpected token \'(\', expected [a-zA-Z0-9_]');

			expect(() => Parser.parse(c, '[test(test)::test]\nfoobarbaz'))
				.toThrow('Unexpected token \':\', expected [a-zA-Z0-9_]');
		});

		it('Should error on malformed category', () =>
		{
			expect(() => Parser.parse(c, '[test):test]\nfoobarbaz'))
				.toThrow('Unexpected token \')\', expected [a-zA-Z0-9_]');
		});

		it('Should error on malformed subcategory', () =>
		{
			expect(() => Parser.parse(c, '[test(:test]\nfoobarbaz'))
				.toThrow('Unexpected token \':\', expected [a-zA-Z0-9_]');

			expect(() => Parser.parse(c, '[test((test):test]\nfoobarbaz'))
				.toThrow('Unexpected token \'(\', expected [a-zA-Z0-9_]');
		});

		it('Should error on invalid category identifiers', () =>
		{
			expect(() => Parser.parse(c, '[1:test]\nfoobarbaz'))
				.toThrow('Invalid category identifier');
		});

		it('Should error on invalid subcategory identifiers', () =>
		{
			expect(() => Parser.parse(c, '[test(1):test]\nfoobarbaz'))
				.toThrow('Invalid subcategory identifier');
		});

		it('Should error on invalid resource key identifiers', () =>
		{
			expect(() => Parser.parse(c, '[1]\nfoobarbaz'))
				.toThrow('Invalid resource key identifier');
		});
	});

	describe('Argument type declaration errors', () =>
	{
		it('Should error on leading or dangling comma', () =>
		{
			expect(() => Parser.parse(c, '[test]\n##! ,foo: string\nfoobarbaz'))
				.toThrow('Unexpected token \',\', expected identifier');

			expect(() => Parser.parse(c, '[test]\n##! foo: string,\nfoobarbaz'))
				.toThrow('Unexpected token \'newline\', expected identifier');
		});

		it('Should error on unexpected non-identifier tokens', () =>
		{
			expect(() => Parser.parse(c, '[test]\n##! @foo: string,\nfoobarbaz'))
				.toThrow('Unexpected token \'@\', expected identifier');

			expect(() => Parser.parse(c, '[test]\n##! : string\nfoobarbaz'))
				.toThrow('Unexpected token \':\', expected identifier');

			expect(() => Parser.parse(c, '[test]\n##! ?: string,\nfoobarbaz'))
				.toThrow('Unexpected token \'?\', expected identifier');

			expect(() => Parser.parse(c, '[test]\n##! fo!o: string,\nfoobarbaz'))
				.toThrow('Unexpected token \'!\', expected \':\'');

			expect(() => Parser.parse(c, '[test]\n##! fo?o: string,\nfoobarbaz'))
				.toThrow('Unexpected token \'o\', expected \':\'');

			expect(() => Parser.parse(c, '[test]\n##! fo o: string,\nfoobarbaz'))
				.toThrow('Unexpected token \'o\', expected \':\'');
		});

		it('Should error on dangling non-delimiters', () =>
		{
			expect(() => Parser.parse(c, '[test]\n##! foo: string a'))
				.toThrow('Unexpected token \'a\', expected \',\' or newline');

			expect(() => Parser.parse(c, '[test]\n##! foo: string @'))
				.toThrow('Unexpected token \'@\', expected \',\' or newline');
		});

		it('Should error when receiving an identifer but no type ', () =>
		{
			expect(() => Parser.parse(c, '[test]\n##! foo \nfoobarbaz'))
				.toThrow('Unexpected token \'newline\', expected \':\'');

			expect(() => Parser.parse(c, '[test]\n##! foo\nfoobarbaz'))
				.toThrow('Unexpected token \'newline\', expected \':\'');

			expect(() => Parser.parse(c, '[test]\n##! foo'))
				.toThrow('Unexpected EOF, expected \':\'');

			expect(() => Parser.parse(c, '[test]\n##! foo:\nstring'))
				.toThrow('Unexpected token \'newline\', expected type');
		});

		it('Should error when receiving invalid types', () =>
		{
			const e: string = 'Invalid type. Must be one of string, number, boolean, or an array of those';
			expect(() => Parser.parse(c, '[test]\n##! foo: Error')).toThrow(e);
			expect(() => Parser.parse(c, '[test]\n##! foo: Array')).toThrow(e);
			expect(() => Parser.parse(c, '[test]\n##! foo: Map[]')).toThrow(e);
		});

		it('Should error when on invalid identifiers', () =>
		{
			const e: string = 'Invalid template argument identifier';
			expect(() => Parser.parse(c, '[test]\n##! 1: String')).toThrow(e);
			expect(() => Parser.parse(c, '[test]\n##! 2foo: String')).toThrow(e);
			expect(() => Parser.parse(c, '[test]\n##! 3 foo: String')).toThrow(e);
		});
	});
});
