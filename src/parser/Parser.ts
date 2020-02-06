import { LocalizationStringChildNode } from '../interfaces/LocalizationStringChildNode';
import { LocalizationStringChunkKind } from '../types/LocalizationStringChunkKind';
import { LocalizationStringParentKeyData } from '../types/LocalizationStringParentKeyData';
import { LocalizationStringParentNode } from '../interfaces/LocalizationStringParentNode';
import { LocalizationStringTemplateKind } from '../types/LocalizationStringTemplateKind';
import { LocalizationStringTypeDeclarationMapping } from '../types/LocalizationStringTypeDeclarationMapping';
import { NodeKindImplForwardTemplate } from '../nodeKindImpl/NodeKindImplForwardTemplate';
import { NodeKindImplOptionalTemplate } from '../nodeKindImpl/NodeKindImplOptionalTemplate';
import { NodeKindImplParentNode } from '../nodeKindImpl/NodeKindImplParentNode';
import { NodeKindImplRegularTemplate } from '../nodeKindImpl/NodeKindImplRegularTemplate';
import { NodeKindImplScriptTemplate } from '../nodeKindImpl/NodeKindImplScriptTemplate';
import { NodeKindImplStringChunk } from '../nodeKindImpl/NodeKindImplStringChunk';
import { ParseError } from './ParseError';
import { StringReader } from './StringReader';

/** @internal */
export class Parser
{
	private static readonly _validIdent: RegExp = /^(?:(?=[a-zA-Z_][\w]*)[\w]+|[a-zA-Z])$/;

	/**
	 * Parse the given input into a list of abstract localization string nodes.
	 * Will automatically convert `\r\n` to `\n`. The container for the first
	 * argument should be the full file path the input is coming from
	 */
	public static parse(container: string, input: string): NodeKindImplParentNode[]
	{
		const reader: StringReader = new StringReader(input.replace(/\r\n/g, '\n'));
		const nodeList: NodeKindImplParentNode[] = [];

		// Chunk kinds that can be discarded as comments before hitting a parent key chunk
		const headerCommentKinds: LocalizationStringChunkKind[] = [
			LocalizationStringChunkKind.Comment,
			LocalizationStringChunkKind.StringChunk,
			LocalizationStringChunkKind.TypesDeclaration,
			LocalizationStringChunkKind.Template
		];

		// Chunk kinds that we should end a parent node on
		const finalizerKinds: LocalizationStringChunkKind[] = [
			LocalizationStringChunkKind.ParentKey,
			LocalizationStringChunkKind.None
		];

		// Begin parsing
		while (!reader.eof())
		{
			const chunkKind: LocalizationStringChunkKind = Parser._peekChunkKind(reader);

			// Header comments can be safely discarded
			if (headerCommentKinds.includes(chunkKind))
				Parser._discardCommentLine(reader);

			// If the chunk kind is None, we're looking at EOF and can safely break
			else if (chunkKind === LocalizationStringChunkKind.None)
				break;

			// If we see a parent key, begin parsing as a parent node
			else if (chunkKind === LocalizationStringChunkKind.ParentKey)
			{
				// Enforce escaped square-braced text if text is a valid parent key
				if (reader.peekBehind() !== '\n' && typeof reader.peekBehind() !== 'undefined')
					throw new ParseError(
						[
							'Localization string key must begin at the start of its own line.',
							'Escape the opening brace if using text in square braces'
						].join(' '),
						container,
						reader.line,
						reader.column
					);

				const { line, column } = reader;
				const parentKeyData: LocalizationStringParentKeyData =
					Parser._consumeParentNodeKey(container, reader);

				// Error if we hit a valid string key without encountering a string body
				if (Parser._peekChunkKind(reader) === LocalizationStringChunkKind.ParentKey)
					throw new ParseError(
						'Unexpected string key, expected string body',
						container,
						reader.line,
						reader.column
					);

				const currentNode: NodeKindImplParentNode =
					new NodeKindImplParentNode(container, parentKeyData, line, column);

				// Parse children of this parent node
				while (true)
				{
					const nextChunkKind: LocalizationStringChunkKind = Parser._peekChunkKind(reader);

					if (nextChunkKind === LocalizationStringChunkKind.Comment)
						Parser._discardCommentLine(reader);

					else if (nextChunkKind === LocalizationStringChunkKind.TypesDeclaration)
						currentNode.addParams(Parser._consumeTypeDeclarationComment(currentNode, reader));

					else if (nextChunkKind === LocalizationStringChunkKind.StringChunk)
						currentNode.addChild(Parser._consumeStringChunk(currentNode, reader));

					else if (nextChunkKind === LocalizationStringChunkKind.Template)
						currentNode.addChild(Parser._consumeTemplate(currentNode, reader));

					// Finalize this parent node when we hit the next parent key or EOF
					else if (finalizerKinds.includes(nextChunkKind))
						break;
				}

				nodeList.push(currentNode);
			}
		}

		if (nodeList.length < 1)
			throw new ParseError(
				'Localization text contained no parsable data',
				container,
				reader.line,
				reader.column
			);

		return nodeList;
	}

	/**
	 * Peeks if the following characters make up a valid parent node key.
	 * Should be called when reader.peek() returns the opening key brace.
	 * Can be given an offset to check that many characters ahead for the
	 * first character. If using an offset, be sure to set the offset
	 * to a value that reader.peek(offset) would return the opening key brace.
	 *
	 * This checks if the parent key contains only valid characters. The
	 * order/quantity of these characters and whether or not the characters
	 * follow valid syntax rules is not taken into consideration
	 */
	private static _peekValidParentNodeKey(reader: StringReader, offset: number = 0): boolean
	{
		if (reader.peek(offset) !== '[')
			return false;

		let index: number = 1 + offset;
		while (reader.peek(index) !== ']')
		{
			if (reader.eof(index))
				return false;

			if (!/[():\w]/.test(reader.peek(index)))
				return false;

			index++;
		}
		return true;
	}

	/**
	 * Peeks whether or not the following characters make up a valid
	 * parent node category or category(subcategory) pair
	 */
	private static _peekValidParentNodeCategory(reader: StringReader): boolean
	{
		let index: number = 0;
		let categoryText: string = '';
		while (reader.peek(index) !== ':')
		{
			if (reader.eof(index))
				return false;

			if (reader.peek(index) === ']')
				return false;

			if (!/[()\w]/.test(reader.peek(index)))
				return false;

			categoryText += reader.peek(index);
			index++;
		}

		if (!/\w+(?:\(\w+\))?/.test(categoryText))
			return false;

		return true;
	}

	/**
	 * Consumes the parent node category and subcategory
	 */
	private static _consumeParentNodeCategory(
		container: string,
		reader: StringReader
	): { category: string, subcategory: string }
	{
		let category: string = '';
		let subcategory: string = '';

		while (reader.peek() !== ':')
		{
			while (reader.peek() !== '(' && reader.peek() !== ':')
			{
				if (!/\w/.test(reader.peek()))
					throw new ParseError(
						`Unexpected token '${reader.peek()}', expected [a-zA-Z0-9_]`,
						container,
						reader.line,
						reader.column
					);

				category += reader.consume();
			}

			if (reader.peek() === '(')
			{
				// Discard the opening '('
				reader.discard();
				while (reader.peek() !== ')')
				{
					if (!/\w/.test(reader.peek()))
						throw new ParseError(
							`Unexpected token '${reader.peek()}', expected [a-zA-Z0-9_]`,
							container,
							reader.line,
							reader.column
						);

					subcategory += reader.consume();
				}

				// Discard the closing ')'
				reader.discard();
			}
		}

		return { category, subcategory };
	}

	/**
	 * Consumes the key string for a parent node key, including the braces
	 * and newline, and returns the key, category, and subcategory
	 */
	private static _consumeParentNodeKey(container: string, reader: StringReader): LocalizationStringParentKeyData
	{
		let key: string = '';
		let category: string = '';
		let subcategory: string = '';

		// Discard the opening `[`
		reader.discard();

		const { line, column } = reader;

		while (reader.peek() !== ']')
		{
			if (Parser._peekValidParentNodeCategory(reader))
			{
				({ category, subcategory } = Parser._consumeParentNodeCategory(container, reader));

				// Discard category separator ':'
				reader.discard();
			}

			if (!/[\w]/.test(reader.peek()))
				throw new ParseError(
					`Unexpected token '${reader.peek()}', expected [a-zA-Z0-9_]`,
					container,
					reader.line,
					reader.column
				);

			key += reader.consume();
		}

		// Set category and subcategory defaults if none were found
		if (category === '')
			category = 'default';

		if (subcategory === '')
			subcategory = 'default';

		if (!Parser._validIdent.test(category))
			throw new ParseError(
				'Invalid category identifier',
				container,
				line,
				column
			);

		if (!Parser._validIdent.test(subcategory))
			throw new ParseError(
				'Invalid subcategory identifier',
				container,
				line,
				column
			);

		if (!Parser._validIdent.test(key))
			throw new ParseError(
				'Invalid resource key identifier',
				container,
				line,
				column
			);

		// Discard the closing `]`
		reader.discard();

		// Discard whitespace after key and newline if it exists
		Parser._discardWhitespace(reader);
		if (reader.peek() === '\n')
			reader.discard();

		return { key, category, subcategory };
	}

	/**
	 * Peeks the kind of chunk we are looking at so we know how to parse
	 * it into a proper child node
	 */
	private static _peekChunkKind(reader: StringReader): LocalizationStringChunkKind
	{
		if (reader.peek() === '\\')
		{
			if (reader.peekSegment(2, 1) === '##'
				|| reader.peekSegment(2, 1) === '{{'
				|| reader.peek(1) === '[')
				return LocalizationStringChunkKind.StringChunk;
		}

		if (reader.peekSegment(2) === '##')
		{
			if (reader.peek(2) === '!')
				return LocalizationStringChunkKind.TypesDeclaration;

			return LocalizationStringChunkKind.Comment;
		}

		if (reader.peek() === '[' && Parser._peekValidParentNodeKey(reader))
			return LocalizationStringChunkKind.ParentKey;

		if (reader.peekSegment(2) === '{{')
			return LocalizationStringChunkKind.Template;

		if (reader.eof())
			return LocalizationStringChunkKind.None;

		return LocalizationStringChunkKind.StringChunk;
	}

	/**
	 * Discards the remainder of the line, including the ending newline
	 */
	private static _discardCommentLine(reader: StringReader): void
	{
		while (reader.peek() !== '\n' && !reader.eof())
			reader.discard();

		// Discard newline after comment
		reader.discard();
	}

	/**
	 * Discards whitespace until hitting a non-whitespace character or newline
	 */
	private static _discardWhitespace(reader: StringReader): void
	{
		while (/\s/.test(reader.peek()) && reader.peek() !== '\n')
			reader.discard();
	}

	/**
	 * Consumes the declared identifier of a type declaration
	 */
	private static _consumeDeclarationIdent(
		parent: LocalizationStringParentNode,
		reader: StringReader
	): { ident: string, isOptional: boolean, line: number, column: number }
	{
		Parser._discardWhitespace(reader);

		let ident: string = '';
		let isOptional: boolean = false;
		const { line, column } = reader;

		while (/[\w?]/.test(reader.peek()))
		{
			if (reader.eof())
				throw new ParseError(
					'Unexpected EOF, expected \':\'',
					parent.container,
					reader.line,
					reader.column
				);

			if (!/\w/.test(reader.peek()) && reader.peek() !== '?')
				throw new ParseError(
					`Unexpected token '${reader.peek()}, expected identifier`,
					parent.container,
					reader.line,
					reader.column
				);

			if (reader.peek() === '?')
			{
				if (ident.length < 1)
					throw new ParseError(
						'Unexpected token \'?\', expected identifier',
						parent.container,
						reader.line,
						reader.column
					);

				isOptional = true;
				reader.discard();
				break;
			}

			ident += reader.consume();
		}

		if (ident.length < 1)
			throw new ParseError(
				`Unexpected token '${reader.peek()}', expected identifier`,
				parent.container,
				reader.line,
				reader.column
			);

		return { ident, isOptional, line, column };
	}

	/**
	 * Consume the declared type of a type declaration
	 */
	private static _consumeDeclarationType(
		parent: LocalizationStringParentNode,
		reader: StringReader
	): { identType: string, isArrayType: boolean }
	{
		const { line, column } = reader;

		let identType: string = '';
		let isArrayType: boolean = false;

		while (/[a-zA-Z]/.test(reader.peek()) && !reader.eof())
			identType += reader.consume();

		if (reader.peekSegment(2) === '[]')
		{
			isArrayType = true;
			reader.discard(2);
		}

		if (reader.peek() === '\n' && identType.length < 1)
			throw new ParseError(
				'Unexpected token \'newline\', expected type',
				parent.container,
				reader.line,
				reader.column
			);

		if (!/^(?:[Ss]tring|[Nn]umber|[Bb]oolean|[Aa]ny)(?:\[\])?$/.test(identType))
			throw new ParseError(
				'Invalid type. Must be one of string, number, boolean, or an array of those',
				parent.container,
				line,
				column
			);

		return { identType, isArrayType };
	}

	/**
	 * Consumes a types declaration comment, parses all type declarations
	 * and returns them
	 */
	private static _consumeTypeDeclarationComment(
		parent: LocalizationStringParentNode,
		reader: StringReader
	): LocalizationStringTypeDeclarationMapping
	{
		// Discard ##! and following whitespace
		reader.discard(3);
		Parser._discardWhitespace(reader);

		const types: LocalizationStringTypeDeclarationMapping = {};

		while (reader.peek() !== '\n' && !reader.eof())
		{
			if (reader.peek() === ',')
			{
				// Error if comma appears before any identifiers
				if (Object.keys(types).length === 0)
					throw new ParseError(
						'Unexpected token \',\', expected identifier',
						parent.container,
						reader.line,
						reader.column
					);

				// Discard comma and following whitespace
				reader.discard();
				Parser._discardWhitespace(reader);

				if (reader.peek() === '\n')
					throw new ParseError(
						'Unexpected token \'newline\', expected identifier',
						parent.container,
						reader.line,
						reader.column
					);
			}
			else if (Object.keys(types).length > 0 && reader.peek() !== ',')
			{
				throw new ParseError(
					`Unexpected token '${reader.peek()}', expected ',' or newline`,
					parent.container,
					reader.line,
					reader.column
				);
			}

			if (reader.eof())
				return types;

			const { ident, isOptional, line, column } = Parser._consumeDeclarationIdent(parent, reader);

			if (!Parser._validIdent.test(ident))
				throw new ParseError(
					'Invalid template argument identifier',
					parent.container,
					line,
					column
				);

			// Discard whitespace before separator
			Parser._discardWhitespace(reader);

			if (reader.peek() !== ':')
				throw new ParseError(
					`Unexpected token '${
						reader.peek() === '\n' ? 'newline' : reader.peek()
					}', expected ':'`,
					parent.container,
					reader.line,
					reader.column
				);

			// Discard separator and following whitespace
			reader.discard();
			Parser._discardWhitespace(reader);

			const { identType, isArrayType } = Parser._consumeDeclarationType(parent, reader);

			types[ident] = {
				identType: identType.toLowerCase(),
				isOptional,
				isArrayType,
				line,
				column
			};

			// Discard whitespace following this argument type declaration
			Parser._discardWhitespace(reader);
		}

		// Discard ending newline
		reader.discard();

		return types;
	}

	/**
	 * Consumes a string chunk from the input and returns it
	 */
	private static _consumeStringChunk(
		parent: LocalizationStringParentNode,
		reader: StringReader
	): NodeKindImplStringChunk
	{
		let content: string = '';
		const { line, column } = reader;

		while (true)
		{
			// Check if we are about to encounter a template or parent string key
			if (reader.peekSegment(2, 1) === '{{' || Parser._peekValidParentNodeKey(reader, 1))
			{
				// If it's not escaped, consume the next character and return this chunk
				if (reader.peek() !== '\\')
				{
					content += reader.consume();
					break;
				}

				// Else discard the backslash and continue
				reader.discard();
			}

			// Discard backslash for escaped comments
			if (reader.peekSegment(3) === '\\##')
				reader.discard();

			// Break if we encounter a comment on its own line, as this is
			// its own chunk kind and will be handled separately
			if (reader.peekSegment(2) === '##' && reader.peekBehind() === '\n')
				break;

			// Discard inline comment content, but not escaped comments
			if (reader.peekSegment(2) === '##' && reader.peekBehind() !== '\\')
				while (reader.peek() !== '\n')
					reader.discard();

			content += reader.consume();

			if (reader.eof())
				break;
		}

		// Replace escape chars with their equivalents. Expand this
		// list if desired, but I don't think any others will be
		// necessary for formatting purposes within localization files
		content = content
			.replace(/\\n/g, '\n')
			.replace(/\\t/g, '\t');

		// Replace unicode escape chars with their equivalents
		const unicode: RegExp = /\\u([0-9a-fA-F]{4})/;
		const allUnicode: RegExp = new RegExp(unicode.source, 'g');
		if (unicode.test(content))
		{
			for (const match of content.match(allUnicode)!)
			{
				const hex: string = match.match(unicode)![1];
				content = content.replace(`\\u${hex}`, String.fromCodePoint(parseInt(hex, 16)));
			}
		}

		const node: NodeKindImplStringChunk =
			new NodeKindImplStringChunk(content, parent, line, column);

		return node;
	}

	/**
	 * Peeks the following chunk for its template kind
	 */
	private static _peekTemplateKind(reader: StringReader): LocalizationStringTemplateKind
	{
		let index: number = 0;
		let kind: LocalizationStringTemplateKind = LocalizationStringTemplateKind.Invalid;

		// Check for allowed template opening characters
		if (!/[\w?>!\s]/.test(reader.peek(2)))
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

				if (!/[\w\s]/.test(reader.peek(index - 1)))
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
	 * Consumes a template from the input, including its content and braces,
	 * and returns it
	 */
	private static _consumeTemplate(
		parent: LocalizationStringParentNode,
		reader: StringReader
	): LocalizationStringChildNode
	{
		switch (Parser._peekTemplateKind(reader))
		{
			case LocalizationStringTemplateKind.Regular: return Parser._consumeRegularTemplate(parent, reader);
			case LocalizationStringTemplateKind.Forward: return Parser._consumeForwardTemplate(parent, reader);
			case LocalizationStringTemplateKind.Script: return Parser._consumeScriptTemplate(parent, reader);
			case LocalizationStringTemplateKind.Optional: return Parser._consumeOptionalTemplate(parent, reader);
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
	 * Consume and return a character as a template key segment,
	 * erroring on invalid characters
	 */
	private static _consumeTemplateKeyChar(
		parent: LocalizationStringParentNode,
		reader: StringReader
	): string
	{
		if (!/[\w\s]/.test(reader.peek()))
			throw new ParseError(
				[
					'Invalid character in template key. Template keys may',
					'only inclue alpha-numeric characters and underscores'
				].join(' '),
				parent.container,
				reader.line,
				reader.column
			);

		return reader.consume();
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
		let key: string = '';
		const { line, column } = reader;

		// Discard the opening braces
		reader.discard(2);

		while (reader.peekSegment(2) !== '}}')
			key += Parser._consumeTemplateKeyChar(parent, reader);

		// Discard the closing braces
		reader.discard(2);

		key = key.trim();

		if (!Parser._validIdent.test(key))
			throw new ParseError(
				'Invalid template identifier',
				parent.container,
				line,
				column
			);

		const node: NodeKindImplRegularTemplate =
			new NodeKindImplRegularTemplate(key, parent, line, column);

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
		let key: string = '';
		const { line, column } = reader;

		// Discard the opening braces
		reader.discard(3);

		while (reader.peekSegment(2) !== '}}')
			key += Parser._consumeTemplateKeyChar(parent, reader);

		// Discard the closing braces
		reader.discard(2);

		key = key.trim();

		if (!Parser._validIdent.test(key))
			throw new ParseError(
				'Invalid forward template identifier',
				parent.container,
				line,
				column
			);

		const node: NodeKindImplForwardTemplate =
			new NodeKindImplForwardTemplate(key, parent, line, column);

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
		let key: string = '';
		const { line, column } = reader;

		// Discard the opening `{{?`
		reader.discard(3);

		while (reader.peekSegment(2) !== '}}')
			key += Parser._consumeTemplateKeyChar(parent, reader);

		// Discard the closing braces
		reader.discard(2);

		key = key.trim();

		if (!Parser._validIdent.test(key))
			throw new ParseError(
				'Invalid template identifier',
				parent.container,
				line,
				column
			);

		const node: NodeKindImplOptionalTemplate =
			new NodeKindImplOptionalTemplate(key, parent, line, column);

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
