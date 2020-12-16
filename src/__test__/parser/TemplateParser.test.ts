import { LocalizationStringNodeKind } from '../../types/LocalizationStringNodeKind';
import { LocalizationStringParentNode } from '../../interfaces/LocalizationStringParentNode';
import { NodeKindImplRegularTemplate } from '../../nodeKindImpl/NodeKindImplRegularTemplate';
import { StringReader } from '../../parser/StringReader';
import { TemplateParser } from '../../parser/TemplateParser';

const parent: LocalizationStringParentNode = { container: 'TemplateParser.test.lang' } as any;
const baseTemplateNode: NodeKindImplRegularTemplate =
	new NodeKindImplRegularTemplate('foo', parent, 1, 1, []);

// Currently we're only testing template pipes here as tests for general template
// parsing already exist in the LocalizationParser test suite. I plan to move them
// here eventually but they'll all have to be majorly rewritten to operate via
// TemplateParser directly

describe('TemplateParser template pipe tests', () =>
{
	it('Should successfully parse a regular template with pipe', () =>
	{
		expect(TemplateParser.parse(parent, new StringReader('{{ foo | bar }}'))).toEqual({
			...baseTemplateNode,
			pipes: [{ ident: 'bar', line: 1, column: 10, args: [] }]
		});
	});

	it('Should successfully parse an optional template with pipe', () =>
	{
		expect(TemplateParser.parse(parent, new StringReader('{{? foo | bar }}'))).toEqual({
			...baseTemplateNode,
			kind: LocalizationStringNodeKind.OptionalTemplate,
			pipes: [{ ident: 'bar', line: 1, column: 11, args: [] }]
		});
	});

	it('Should successfully parse include template with pipe', () =>
	{
		expect(TemplateParser.parse(parent, new StringReader('{{> foo | bar }}'))).toEqual({
			kind: LocalizationStringNodeKind.IncludeTemplate,
			parent,
			includeKey: 'foo',
			line: 1,
			column: 1,
			pipes: [{ ident: 'bar', line: 1, column: 11, args: [] }]
		});
	});

	it('Should successfully parse chained pipes', () =>
	{
		expect(TemplateParser.parse(parent, new StringReader('{{ foo | bar | baz }}'))).toEqual({
			...baseTemplateNode,
			pipes: [
				{ ident: 'bar', line: 1, column: 10, args: [] },
				{ ident: 'baz', line: 1, column: 16, args: [] }
			]
		});
	});

	it('Should successfully parse pipe targets with extra arguments', () =>
	{
		expect(TemplateParser.parse(parent, new StringReader('{{ foo | bar(1, 1) }}'))).toEqual({
			...baseTemplateNode,
			pipes: [{ ident: 'bar', line: 1, column: 10, args: [1, 1] }]
		});
	});

	it('Should successfully parse valid number, string, and boolean literals', () =>
	{
		expect(TemplateParser.parse(
			parent,
			new StringReader('{{ foo | bar(1, .1, 0.1, 10.10, -1, -.1, -0.1, -10.10) }}')
		)).toEqual({
			...baseTemplateNode,
			pipes: [{ ident: 'bar', line: 1, column: 10, args: [1, 0.1, 0.1, 10.10, -1, -0.1, -0.1, -10.10] }]
		});

		expect(TemplateParser.parse(
			parent,
			new StringReader('{{ foo | bar(\'foo\', "bar", `baz`, "boo \\"far\\" faz") }}')
		)).toEqual({
			...baseTemplateNode,
			pipes: [{ ident: 'bar', line: 1, column: 10, args: ['foo', 'bar', 'baz', 'boo "far" faz'] }]
		});

		expect(TemplateParser.parse(
			parent,
			new StringReader('{{ foo | bar(true, false) }}')
		)).toEqual({
			...baseTemplateNode,
			pipes: [{ ident: 'bar', line: 1, column: 10, args: [true, false] }]
		});
	});

	it('Should successfully ignore whitespace in non-script templates', () =>
	{
		expect(TemplateParser.parse(parent, new StringReader('{{\n\tfoo\n\t| bar\n\t| baz\n}}'))).toEqual({
			...baseTemplateNode,
			pipes: [
				{ ident: 'bar', line: 3, column: 4, args: [] },
				{ ident: 'baz', line: 4, column: 4, args: [] }
			]
		});

		expect(TemplateParser.parse(parent, new StringReader('{{?\n\tfoo\n\t| bar\n\t| baz\n}}'))).toEqual({
			...baseTemplateNode,
			kind: LocalizationStringNodeKind.OptionalTemplate,
			pipes: [
				{ ident: 'bar', line: 3, column: 4, args: [] },
				{ ident: 'baz', line: 4, column: 4, args: [] }
			]
		});

		expect(TemplateParser.parse(parent, new StringReader('{{>\n\tfoo\n\t| bar\n\t| baz\n}}'))).toEqual({
			kind: LocalizationStringNodeKind.IncludeTemplate,
			parent,
			includeKey: 'foo',
			line: 1,
			column: 1,
			pipes: [
				{ ident: 'bar', line: 3, column: 4, args: [] },
				{ ident: 'baz', line: 4, column: 4, args: [] }
			]
		});
	});

	it('Should error on invalid pipe identifiers', () =>
	{
		expect(() => TemplateParser.parse(parent, new StringReader('{{ foo | 3bar }}')))
			.toThrow('Invalid pipe function identifier');
	});

	it('Should error on unexpected tokens when parsing pipes', () =>
	{
		expect(() => TemplateParser.parse(parent, new StringReader('{{ foo | bar! }}')))
			.toThrow('Unexpected token \'!\', expected \'}}\' or \'|\'');
	});

	it('Should error on malformed pipe functions', () =>
	{
		expect(() => TemplateParser.parse(parent, new StringReader('{{ foo | bar( }}')))
			.toThrow('Malformed pipe function');
	});

	it('Should error on unterminated pipe argument strings', () =>
	{
		expect(() => TemplateParser.parse(parent, new StringReader('{{ foo | bar("foo) }}')))
			.toThrow('Unterminated string');
	});

	it('Should error on invalid pipe argument numbers', () =>
	{
		expect(() => TemplateParser.parse(parent, new StringReader('{{ foo | bar(10.05.0 }}')))
			.toThrow('Invalid number \'10.05.0\'');

		expect(() => TemplateParser.parse(parent, new StringReader('{{ foo | bar(10-05.0 }}')))
			.toThrow('Invalid number \'10-05.0\'');
	});

	it('Should error when missing an expected value', () =>
	{
		expect(() => TemplateParser.parse(parent, new StringReader('{{ foo | bar(,) }}')))
			.toThrow('Missing value, expected string, number, or boolean');
	});

	it('Should error when receiving anything other than a valid value', () =>
	{
		expect(() => TemplateParser.parse(parent, new StringReader('{{ foo | bar(baz) }}')))
			.toThrow('Unexpected identifier, expected string, number, or boolean');

		expect(() => TemplateParser.parse(parent, new StringReader('{{ foo | bar(!) }}')))
			.toThrow('Unexpected token \'!\', expected string, number, or boolean');
	});
});
