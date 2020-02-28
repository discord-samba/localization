import { LocalizationStringChildNode } from '../interfaces/LocalizationStringChildNode';
import { LocalizationStringParentNode } from '../interfaces/LocalizationStringParentNode';
import { LocalizationStringTemplateKind } from '../types/LocalizationStringTemplateKind';
import { NodeKindImplForwardTemplate } from '../nodeKindImpl/NodeKindImplForwardTemplate';
import { NodeKindImplOptionalTemplate } from '../nodeKindImpl/NodeKindImplOptionalTemplate';
import { NodeKindImplRegularTemplate } from '../nodeKindImpl/NodeKindImplRegularTemplate';
import { NodeKindImplScriptTemplate } from '../nodeKindImpl/NodeKindImplScriptTemplate';
import { ParseError } from './ParseError';
import { StringReader } from './StringReader';
import { TemplatePipe } from '../types/TemplatePipe';

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

			case LocalizationStringTemplateKind.Forward:
				return TemplateParser._consumeForwardTemplate(parent, reader);

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
		// TODO: Return to ! when highlighting is fixed
		// https://github.com/microsoft/TypeScript-TmLanguage/issues/806
		if (/[\w?>!\s]/.test(reader.peek(2)) === false)
			return LocalizationStringTemplateKind.Invalid;

		if (reader.peek(2) === '!')
			kind = LocalizationStringTemplateKind.Script;

		else if (reader.peek(2) === '>')
			kind = LocalizationStringTemplateKind.Forward;

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

				// TODO: Return to ! when highlighting is fixed
				// https://github.com/microsoft/TypeScript-TmLanguage/issues/806
				if (/[\w\s]/.test(reader.peek(index - 1)) === false)
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
	 * Discards whitespace until hitting a non-whitespace character
	 */
	private static _discardWhitespace(reader: StringReader): void
	{
		while (/\s/.test(reader.peek()))
			reader.discard();
	}

	/**
	 * Parses all template pipes and returns them. Should be called when the next character
	 * is the first pipe (`|`) encountered.
	 */
	private static _parsePipes(parent: LocalizationStringParentNode, reader: StringReader): TemplatePipe[]
	{
		const result: TemplatePipe[] = [];

		while (true)
		{
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
			TemplateParser._discardWhitespace(reader);

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

			TemplateParser._discardWhitespace(reader);

			// Handle pipe function arguments
			if (reader.peek() === '(')
			{
				// Discard `(`
				reader.discard();

				while (true)
				{
					// Discard surrounding whirespace
					TemplateParser._discardWhitespace(reader);

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

					const argVal: string | number | boolean = TemplateParser._parsePipeArgument(parent, reader);
					templatePipe.args.push(argVal);

					// Discard surrounding whitespace
					TemplateParser._discardWhitespace(reader);

					// Discard comma if present
					if (reader.peek() === ',')
						reader.discard();
				}
			}

			result.push(templatePipe);

			// Discard ending whitespace
			TemplateParser._discardWhitespace(reader);
		}

		return result;
	}

	/**
	 * Parses and returns a single pipe argument (raw value passed to a pipe function),
	 * which can be a string, number, or boolean following Javascript syntax rules,
	 * though all string types will capture whitespace indiscriminately, including
	 * newlines
	 */
	private static _parsePipeArgument(
		parent: LocalizationStringParentNode,
		reader: StringReader
	): string | number | boolean
	{
		// Discard whitespace
		TemplateParser._discardWhitespace(reader);

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

			// TODO: Return to ! when highlighting is fixed
			// https://github.com/microsoft/TypeScript-TmLanguage/issues/806
			if (/^-?(?:\d+|\.\d+|\d+\.\d+)$/.test(result) === false)
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
		TemplateParser._discardWhitespace(reader);

		const key: string = reader.consumeUntil(/\s/);

		if (!TemplateParser._validIdent.test(key))
			throw new ParseError(
				'Invalid template identifier',
				parent.container,
				line,
				column
			);

		// Discard whitespace after key
		TemplateParser._discardWhitespace(reader);

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
		TemplateParser._discardWhitespace(reader);

		const key: string = reader.consumeUntil(/\s/);

		if (!TemplateParser._validIdent.test(key))
			throw new ParseError(
				'Invalid template identifier',
				parent.container,
				line,
				column
			);

		// Discard whitespace after key
		TemplateParser._discardWhitespace(reader);

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
	 * Consumes a forward template from the input, including its content and braces,
	 * and returns it
	 */
	private static _consumeForwardTemplate(
		parent: LocalizationStringParentNode,
		reader: StringReader
	): NodeKindImplForwardTemplate
	{
		let pipes!: TemplatePipe[];
		const { line, column } = reader;

		// Discard `{{>` and following whitespace
		reader.discard(3);
		TemplateParser._discardWhitespace(reader);

		const key: string = reader.consumeUntil(/\s/);

		if (!TemplateParser._validIdent.test(key))
			throw new ParseError(
				'Invalid forward template identifier',
				parent.container,
				line,
				column
			);

		// Discard whitespace after key
		TemplateParser._discardWhitespace(reader);

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

		const node: NodeKindImplForwardTemplate =
			new NodeKindImplForwardTemplate(key, parent, line, column, pipes ?? []);

		return node;
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
			// TODO: Return to ! when highlighting is fixed
			// https://github.com/microsoft/TypeScript-TmLanguage/issues/806
			if (bodyStartLine === 0 && /\s/.test(reader.peek()) === false)
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
