import { LocalizationStringChildNode } from '#interface/LocalizationStringChildNode';
import { LocalizationStringParentNode } from '#interface/LocalizationStringParentNode';
import { LocalizationStringTemplateKind } from '#type/LocalizationStringTemplateKind';
import { NodeKindImplIncludeTemplate } from '#nodeKindImpl/NodeKindImplIncludeTemplate';
import { NodeKindImplMatchTemplate } from '#nodeKindImpl/NodeKindImplMatchTemplate';
import { NodeKindImplOptionalTemplate } from '#nodeKindImpl/NodeKindImplOptionalTemplate';
import { NodeKindImplRegularTemplate } from '#nodeKindImpl/NodeKindImplRegularTemplate';
import { NodeKindImplScriptTemplate } from '#nodeKindImpl/NodeKindImplScriptTemplate';
import { ParseError } from '#parser/ParseError';
import { Primitive } from '#type/Primitive';
import { StringReader } from '#parser/StringReader';
import { TemplatePipe } from '#type/TemplatePipe';

/** @internal */
export class TemplateParser
{
	private static readonly _validIdent: RegExp = /^(?:(?=[a-zA-Z_][\w]*)[\w]+|[a-zA-Z])$/;

	/**
	 * Parses a template from the input, consuming its content and braces,
	 * and returns the parsed LocalizationStringChildNode
	 */
	public static parse(
		parent: LocalizationStringParentNode,
		reader: StringReader
	): LocalizationStringChildNode
	{
		switch (TemplateParser._peekTemplateKind(reader))
		{
			case LocalizationStringTemplateKind.Regular:
				return TemplateParser._consumeRegularTemplate(parent, reader);

			case LocalizationStringTemplateKind.Optional:
				return TemplateParser._consumeOptionalTemplate(parent, reader);

			case LocalizationStringTemplateKind.Include:
				return TemplateParser._consumeIncludeTemplate(parent, reader);

			case LocalizationStringTemplateKind.Match:
				return TemplateParser._consumeMatchTemplate(parent, reader);

			case LocalizationStringTemplateKind.Script:
				return TemplateParser._consumeScriptTemplate(parent, reader);

			case LocalizationStringTemplateKind.Invalid:
				throw new ParseError(
					'Invalid template',
					parent.container,
					reader.line,
					reader.column
				);
		}
	}

	/**
	 * Peeks the following chunk for its template kind
	 */
	private static _peekTemplateKind(reader: StringReader): LocalizationStringTemplateKind
	{
		let index: number = 0;
		let kind: LocalizationStringTemplateKind = LocalizationStringTemplateKind.Invalid;

		// Check for allowed template opening characters
		if (!/[\w?>#!\s]/.test(reader.peek(2)))
			return LocalizationStringTemplateKind.Invalid;

		if (reader.peek(2) === '!')
			kind = LocalizationStringTemplateKind.Script;

		else if (reader.peek(2) === '>')
			kind = LocalizationStringTemplateKind.Include;

		else if (reader.peek(2) === '#')
			kind = LocalizationStringTemplateKind.Match;

		else if (reader.peek(2) === '?')
			kind = LocalizationStringTemplateKind.Optional;

		else
			kind = LocalizationStringTemplateKind.Regular;

		while (true)
		{
			if (reader.peekSegment(2, index) === '}}')
			{
				if (reader.peek(index - 1) === '!')
				{
					if (kind !== LocalizationStringTemplateKind.Script)
						kind = LocalizationStringTemplateKind.Invalid;

					break;
				}

				if (kind === LocalizationStringTemplateKind.Script)
				{
					if (reader.peek(index - 1) !== '!')
						kind = LocalizationStringTemplateKind.Invalid;

					break;
				}

				// Mark as invalid if we see any non-whitespace, non-word characters before the
				// closing braces, unless we're examining a Match template which will have non-word
				// characters before the closing braces
				if (!/[\w\s]/.test(reader.peek(index - 1)) && kind !== LocalizationStringTemplateKind.Match)
					kind = LocalizationStringTemplateKind.Invalid;

				break;
			}

			index++;

			if (reader.eof(index))
				return LocalizationStringTemplateKind.Invalid;
		}

		return kind;
	}

	/**
	 * Discards whitespace until hitting a non-whitespace character.
	 * If the non-whitespace character is a comment, discards that too
	 * and recursively discards remaining whitespace
	 */
	private static _discardWhitespaceAndComments(reader: StringReader): void
	{
		while (/\s/.test(reader.peek()))
			reader.discard();

		if (reader.peekSegment(2) === '##')
		{
			while (/[^\n]/.test(reader.peek()))
				reader.discard();

			TemplateParser._discardWhitespaceAndComments(reader);
		}
	}

	/**
	 * Parses all template pipes and returns them. Should be called when the next character
	 * is the first pipe (`|`) encountered.
	 */
	private static _parsePipes(
		parent: LocalizationStringParentNode,
		reader: StringReader,
		isMatchTemplate: boolean = false
	): TemplatePipe[]
	{
		const result: TemplatePipe[] = [];

		while (true)
		{
			if (isMatchTemplate && reader.peek() === ':')
				break;

			if (reader.peekSegment(2) !== '}}' && reader.peek() !== '|')
				throw new ParseError(
					`Unexpected token '${reader.peek()}', expected '}}' or '|'`,
					parent.container,
					reader.line,
					reader.column
				);

			// Discard pipe character if present
			if (reader.peek() === '|')
				reader.discard();

			// Discard whitespace following pipe, if any
			TemplateParser._discardWhitespaceAndComments(reader);

			if (reader.peekSegment(2) === '}}')
				break;

			const { line, column } = reader;
			const templatePipe: TemplatePipe = {
				ident: reader.consumeUntil(/[^\w]/),
				args: [],
				line,
				column
			};

			if (!TemplateParser._validIdent.test(templatePipe.ident))
				throw new ParseError(
					'Invalid pipe function identifier',
					parent.container,
					line,
					column
				);

			TemplateParser._discardWhitespaceAndComments(reader);

			// Handle pipe function arguments
			if (reader.peek() === '(')
			{
				// Discard `(`
				reader.discard();

				while (true)
				{
					// Discard surrounding whirespace
					TemplateParser._discardWhitespaceAndComments(reader);

					if (reader.peek() === ')')
					{
						// Discard `)` and break
						reader.discard();
						break;
					}

					if (reader.peekSegment(2) === '}}')
						throw new ParseError(
							'Malformed pipe function',
							parent.container,
							line,
							column
						);

					const argVal: Primitive = TemplateParser._parsePrimitive(parent, reader);
					templatePipe.args.push(argVal);

					// Discard surrounding whitespace
					TemplateParser._discardWhitespaceAndComments(reader);

					// Discard comma if present
					if (reader.peek() === ',')
						reader.discard();
				}
			}

			result.push(templatePipe);

			// Discard ending whitespace
			TemplateParser._discardWhitespaceAndComments(reader);
		}

		return result;
	}

	/**
	 * Parses and returns a single pipe argument (raw value passed to a pipe function),
	 * which can be a string, number, or boolean following Javascript syntax rules,
	 * though all string types will capture whitespace indiscriminately, including
	 * newlines
	 */
	private static _parsePrimitive(
		parent: LocalizationStringParentNode,
		reader: StringReader
	): Primitive
	{
		// Discard whitespace
		TemplateParser._discardWhitespaceAndComments(reader);

		const { line, column } = reader;
		let result: string = '';
		let stringChar: string = '';

		// Handle strings
		if (/['"`]/.test(reader.peek()))
		{
			// Capture string declaration character
			stringChar = reader.consume();

			while (true)
			{
				// Append string character to result if it is escaped
				if (reader.peek(1) === stringChar && reader.peek() === '\\')
				{
					// Discard escape char
					reader.discard();
					result += reader.consume();
				}

				if (reader.peek() === stringChar)
					break;

				result += reader.consume();

				if (reader.eof())
					throw new ParseError(
						'Unterminated string',
						parent.container,
						line,
						column
					);
			}

			// Discard closing string declaration character
			reader.discard();

			return result;
		}

		// Handle numbers
		if (/[-\d.]/.test(reader.peek()))
		{
			result = reader.consumeUntil(/[^-\d.]/);

			if (!/^-?(?:\d+|\.\d+|\d+\.\d+)$/.test(result))
				throw new ParseError(`Invalid number '${result}'`, parent.container, line, column);

			return Number.parseFloat(result);
		}

		// Handle booleans
		while (/\w/.test(reader.peek()))
			result += reader.consume();

		if (result === 'true')
			return true;

		if (result === 'false')
			return false;

		// Error on missing value
		if (reader.peek() === ',' && result === '')
			throw new ParseError(
				'Missing value, expected string, number, or boolean',
				parent.container,
				line,
				column
			);

		if (result !== '')
			throw new ParseError(
				'Unexpected identifier, expected string, number, or boolean',
				parent.container,
				line,
				column
			);

		// Throw a parser error if we've received anything other than `true`/`false` at this point
		throw new ParseError(
			`Unexpected token '${reader.peek()}', expected string, number, or boolean`,
			parent.container,
			line,
			column
		);
	}

	/**
	 * Consumes a regular template from the input, including its content and braces,
	 * and returns it
	 */
	private static _consumeRegularTemplate(
		parent: LocalizationStringParentNode,
		reader: StringReader
	): NodeKindImplRegularTemplate
	{
		let pipes!: TemplatePipe[];
		const { line, column } = reader;

		// Discard the opening braces and whitespace
		reader.discard(2);
		TemplateParser._discardWhitespaceAndComments(reader);

		const key: string = reader.consumeUntil(/[^\w]/);

		if (!TemplateParser._validIdent.test(key))
			throw new ParseError(
				'Invalid template identifier',
				parent.container,
				line,
				column
			);

		// Discard whitespace after key
		TemplateParser._discardWhitespaceAndComments(reader);

		if (reader.peekSegment(2) !== '}}' && reader.peek() !== '|')
			throw new ParseError(
				`Unexpected token '${reader.peek()}', expected '}}' or '|'`,
				parent.container,
				reader.line,
				reader.column
			);

		if (reader.peek() === '|')
			pipes = TemplateParser._parsePipes(parent, reader);

		// Discard closing braces
		reader.discard(2);

		const node: NodeKindImplRegularTemplate =
			new NodeKindImplRegularTemplate(key, parent, line, column, pipes ?? []);

		return node;
	}

	/**
	 * Consumes a optional template from the input, including its content and braces,
	 * and returns it
	 */
	private static _consumeOptionalTemplate(
		parent: LocalizationStringParentNode,
		reader: StringReader
	): NodeKindImplOptionalTemplate
	{
		let pipes!: TemplatePipe[];
		const { line, column } = reader;

		// Discard `{{?` and following whitespace
		reader.discard(3);
		TemplateParser._discardWhitespaceAndComments(reader);

		const key: string = reader.consumeUntil(/[^\w]/);

		if (!TemplateParser._validIdent.test(key))
			throw new ParseError(
				'Invalid template identifier',
				parent.container,
				line,
				column
			);

		// Discard whitespace after key
		TemplateParser._discardWhitespaceAndComments(reader);

		if (reader.peekSegment(2) !== '}}' && reader.peek() !== '|')
			throw new ParseError(
				`Unexpected token '${reader.peek()}', expected '}}' or '|'`,
				parent.container,
				reader.line,
				reader.column
			);

		if (reader.peek() === '|')
			pipes = TemplateParser._parsePipes(parent, reader);

		// Discard closing braces
		reader.discard(2);

		const node: NodeKindImplOptionalTemplate =
			new NodeKindImplOptionalTemplate(key, parent, line, column, pipes ?? []);

		return node;
	}

	/**
	 * Consumes an include template from the input, including its content and braces,
	 * and returns it
	 */
	private static _consumeIncludeTemplate(
		parent: LocalizationStringParentNode,
		reader: StringReader
	): NodeKindImplIncludeTemplate
	{
		let pipes!: TemplatePipe[];
		const { line, column } = reader;

		// Discard `{{>` and following whitespace
		reader.discard(3);
		TemplateParser._discardWhitespaceAndComments(reader);

		const key: string = reader.consumeUntil(/[^\w]/);

		if (!TemplateParser._validIdent.test(key))
			throw new ParseError(
				'Invalid include template identifier',
				parent.container,
				line,
				column
			);

		// Discard whitespace after key
		TemplateParser._discardWhitespaceAndComments(reader);

		if (reader.peekSegment(2) !== '}}' && reader.peek() !== '|')
			throw new ParseError(
				`Unexpected token '${reader.peek()}', expected '}}' or '|'`,
				parent.container,
				reader.line,
				reader.column
			);

		if (reader.peek() === '|')
			pipes = TemplateParser._parsePipes(parent, reader);

		// Discard closing braces
		reader.discard(2);

		const node: NodeKindImplIncludeTemplate =
			new NodeKindImplIncludeTemplate(key, parent, line, column, pipes ?? []);

		return node;
	}

	/**
	 * Consumes a match template from the input, including its content and braces,
	 * and returns it
	 */
	private static _consumeMatchTemplate(
		parent: LocalizationStringParentNode,
		reader: StringReader
	): NodeKindImplMatchTemplate
	{
		let pipes!: TemplatePipe[];
		let defaultMatch!: Primitive;
		const matchers: [Primitive, Primitive][] = [];
		const { line, column } = reader;

		// Discard `{{#` and following whitespace
		reader.discard(3);
		TemplateParser._discardWhitespaceAndComments(reader);

		const key: string = reader.consumeUntil(/[^\w]/);

		if (!TemplateParser._validIdent.test(key))
			throw new ParseError(
				'Invalid match template identifier',
				parent.container,
				line,
				column
			);

		// Discard whitespace after key
		TemplateParser._discardWhitespaceAndComments(reader);

		if (reader.peekSegment(2) !== '}}' && reader.peek() !== '|' && reader.peek() !== ':')
			throw new ParseError(
				`Unexpected token '${reader.peek()}', expected '}}', '|' or ':'`,
				parent.container,
				reader.line,
				reader.column
			);

		if (reader.peek() === '|')
			pipes = TemplateParser._parsePipes(parent, reader, true);

		// Discard whitespace after pipes
		TemplateParser._discardWhitespaceAndComments(reader);

		if (reader.peek() !== ':')
			throw new ParseError(
				`Unexpected token '${reader.peek()}', expected ':''`,
				parent.container,
				reader.line,
				reader.column
			);

		// Discard `:`
		else
			reader.discard();

		while (true)
		{
			// Discard whitespace before match condition
			TemplateParser._discardWhitespaceAndComments(reader);

			if (reader.peekSegment(2) === '}}')
				break;

			if (reader.peek() === '_' && !/\s/.test(reader.peek(1)) && reader.peekSegment(2, 1) !== '=>')
			{
				const { line: identLine, column: identColumn } = reader;
				throw new ParseError(
					`Unexpected segment '${reader.consumeUntil(/\s/)}', expected primitive value or '_'`,
					parent.container,
					identLine,
					identColumn
				);
			}

			if (reader.peek() !== '_')
			{
				// Parse the match condition
				const matchCondition: Primitive = TemplateParser._parsePrimitive(parent, reader);

				TemplateParser._discardWhitespaceAndComments(reader);

				if (reader.peekSegment(2) !== '=>')
					throw new ParseError(
						`Unexpected token '${reader.peek()}', expected '=>'`,
						parent.container,
						reader.line,
						reader.column
					);

				// Discard `=>` and following whitespace/comments
				reader.discard(2);
				TemplateParser._discardWhitespaceAndComments(reader);

				// Parse the match value
				const matchValue: Primitive = TemplateParser._parsePrimitive(parent, reader);

				TemplateParser._discardWhitespaceAndComments(reader);

				if (reader.peek() !== ',' && reader.peekSegment(2) !== '}}')
					throw new ParseError(
						`Unexpected token '${reader.peek()}', expected ',' or '}}'`,
						parent.container,
						reader.line,
						reader.column
					);

				matchers.push([matchCondition, matchValue]);

				// Discard `,`
				if (reader.peek() === ',')
					reader.discard();

				continue;
			}
			else
			{
				// Discard `_` and whitespace/comments
				reader.discard();
				TemplateParser._discardWhitespaceAndComments(reader);

				if (reader.peekSegment(2) !== '=>')
					throw new ParseError(
						`Unexpected token '${reader.peek()}', expected '=>'`,
						parent.container,
						reader.line,
						reader.column
					);

				// Discard `=>` and whitespace/comments
				reader.discard(2);
				TemplateParser._discardWhitespaceAndComments(reader);

				defaultMatch = TemplateParser._parsePrimitive(parent, reader);
				continue;
			}
		}

		// Discard closing braces
		reader.discard(2);

		return new NodeKindImplMatchTemplate(key, parent, line, column, pipes ?? [], matchers, defaultMatch);
	}

	/**
	 * Consumes a script template from the input, including its content and braces,
	 * and returns it
	 */
	private static _consumeScriptTemplate(
		parent: LocalizationStringParentNode,
		reader: StringReader
	): NodeKindImplScriptTemplate
	{
		let scriptBody: string = '';
		let bodyStartLine: number = 0;
		const { line, column } = reader;

		// Discard the opening braces
		reader.discard(3);

		while (reader.peekSegment(3) !== '!}}')
		{
			if (bodyStartLine === 0 && !/\s/.test(reader.peek()))
				bodyStartLine = reader.line;

			scriptBody += reader.consume();
		}

		// Discard the closing braces
		reader.discard(3);

		const node: NodeKindImplScriptTemplate =
			new NodeKindImplScriptTemplate(scriptBody, bodyStartLine, parent, line, column);

		return node;
	}
}
