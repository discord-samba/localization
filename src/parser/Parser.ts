import { LocalizationStringTemplateKind } from '../types/LocalizationStringTemplateKind';
import { LocalizationStringChildNode } from '../interfaces/LocalizationStringChildNode';
import { NodeKindImplParentNode } from '../classes/NodeKindImplParentNode';
import { NodeKindImplStringChunk } from '../classes/NodeKindImplStringChunk';
import { NodeKindImplRegularTemplate } from '../classes/NodeKindImplRegularTemplate';
import { NodeKindImplForwardTemplate } from '../classes/NodeKindImplForwardTemplate';
import { NodeKindImplMaybeTemplate } from '../classes/NodeKindImplMaybeTemplate';
import { NodeKindImplScriptTemplate } from '../classes/NodeKindImplScriptTemplate';
import { LocalizationStringParentNode } from '../interfaces/LocalizationStringParentNode';
import { LocalizationStringChunkKind } from '../types/LocalizationStringChunkKind';
import { StringReader } from './StringReader';
import { ParseError } from './ParseError';
import { LocalizationStringTypesDeclaration } from '../types/LocalizationStringTypesDeclaration';

export class Parser
{
	public static parse(container: string, input: string): NodeKindImplParentNode[]
	{
		const reader: StringReader = new StringReader(input);
		let nodeList: NodeKindImplParentNode[] = [];

		while (!reader.eof())
		{
			let currentNode: NodeKindImplParentNode;
			switch (Parser._peekChunkKind(reader))
			{
				// Allow anything before the first key to be counted as comments
				case LocalizationStringChunkKind.Comment:
				case LocalizationStringChunkKind.StringChunk:
				case LocalizationStringChunkKind.TypesDeclaration:
				case LocalizationStringChunkKind.Template:
					Parser._consumeCommentLine(reader);
					break

				// If the chunk kind is none, we're looking at EOF
				case LocalizationStringChunkKind.None:
					break;

				case LocalizationStringChunkKind.ParentKey:
					// Enforce escaped square-braced text if text is a valid parent key
					if (reader.peekBehind() !== '\n' && typeof reader.peekBehind() !== 'undefined')
						throw new ParseError(
							[
								'Localization string key must begin at the start of its own line.',
								'Escape the opening brace if using text in square braces'
							].join(' '),
							container,
							reader.line,
							reader.column);

					const { line, column } = reader;
					const key: string = Parser._consumeParentKey(container, reader);
					
					currentNode = new NodeKindImplParentNode(container, key, line, column);
					nodeList.push(currentNode);

					// Error if we hit a valid string key without encountering a string body
					if (Parser._peekChunkKind(reader) === LocalizationStringChunkKind.ParentKey)
						throw new ParseError(
							`Unexpected string key, expected string body`,
							container,
							reader.line,
							reader.column);

					let buildingNode: boolean = true;
					while (buildingNode)
					{
						switch (Parser._peekChunkKind(reader))
						{
							case LocalizationStringChunkKind.Comment:
								Parser._consumeCommentLine(reader);
								break;

							case LocalizationStringChunkKind.StringChunk:
								currentNode.addChild(Parser._consumeStringChunk(currentNode, reader));
								break;

							case LocalizationStringChunkKind.Template:
								// TODO: Add functionality to remove the empty line if a maybe
								//       template or script template are the only thing to occupy
								//       their line and the maybe template is not filled or the
								//       script template returns undefined
								currentNode.addChild(Parser._consumeTemplate(currentNode, reader));
								break;

							case LocalizationStringChunkKind.TypesDeclaration:
								currentNode.addParamTypes(Parser._consumeTypesDeclaration(currentNode, reader));
								break;

							// Finalize this node when we hit a parent key or EOF
							case LocalizationStringChunkKind.ParentKey:
							case LocalizationStringChunkKind.None:
								buildingNode = false;
								break;
						}
					}
					break;
			}
		}

		return nodeList
	}

	/**
	 * Peeks if the following characters make up a valid parent node key.
	 * Should be called when reader.peek() returns the opening key brace.
	 * Can be given an offset to check that many characters ahead for the
	 * first character. If using an offset, be sure to set the offset
	 * to a value that reader.peek(offset) would the opening key brace
	 */
	private static _peekValidParentKey(reader: StringReader, offset: number = 0): boolean
	{
		if (reader.peek(offset) !== '[')
			return false;

		let index: number = 1 + offset;
		while (reader.peek(index) !== ']')
		{
			if (reader.eof(index))
				return false;

			if (!/[\w]/.test(reader.peek(index)))
				return false;

			index++;
		}
		return true;
	}

	/**
	 * Consumes the key string for a parent node key, including the braces
	 * and newline, and returns the key
	 */
	private static _consumeParentKey(container: string, reader: StringReader): string
	{
		const { line, column } = reader;

		// Discard the opening `[`
		reader.consume();

		let key: string = '';
		while (reader.peek() !== ']')
		{
			if (reader.eof())
				throw new ParseError(
					'Failed to find closing string key brace',
					container,
					line,
					column);
			
			if (!/[\w]/.test(reader.peek()))
				throw new ParseError(
					`Unexpected token '${reader.peek()}', expected [a-zA-Z0-9_]`,
					container,
					reader.line,
					reader.column);

			key += reader.consume();
		}

		// Discard the closing `]`
		reader.consume();

		if (reader.peek() !== '\n')
			throw new ParseError(
				`Unexpected token '${reader.peek()}', expected newline`,
				container,
				reader.line,
				reader.column);

		// Discard the newline following key
		reader.consume();

		return key;
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
		
		if (reader.peek() === '[' && Parser._peekValidParentKey(reader))
			return LocalizationStringChunkKind.ParentKey;

		if (reader.peekSegment(2) === '{{')
			return LocalizationStringChunkKind.Template;

		if (reader.eof())
			return LocalizationStringChunkKind.None;

		return LocalizationStringChunkKind.StringChunk;
	}

	
	/**
	 * Consumes and discards the remainder of the line, including
	 * the ending newline
	 */
	private static _consumeCommentLine(reader: StringReader): void
	{
		while (reader.peek() !== '\n')
			reader.consume();

		// Discard newline after comment
		reader.consume();
	}

	/**
	 * Consume and discard whitespace until hitting a non-whitespace
	 * character or newline
	 */
	private static _consumeWhitespace(reader: StringReader): void
	{
		while (/\s/.test(reader.peek()) && reader.peek() !== '\n')
			reader.consume();
	}

	/**
	 * Consumes a types declaration line, parses ident:type pairs and returns them
	 */
	private static _consumeTypesDeclaration(
		parent: LocalizationStringParentNode,
		reader: StringReader): LocalizationStringTypesDeclaration
	{
		// Discard ##!
		reader.consume(3);
		
		let types: LocalizationStringTypesDeclaration = {};
		const validKeyChar: RegExp = /\w/;
		const validType: RegExp = /^(?:[sS]tring|[nN]umber|[bB]oolean|[aA]ny)(?:\[\])?$/;

		while (reader.peek() !== '\n')
		{
			let key: string = '';
			let type: string = '';
			let optional: boolean = false;

			Parser._consumeWhitespace(reader);
			
			// Consume comma and following whitespace
			if (reader.peek() === ',')
			{
				if (Object.keys(types).length === 0)
					throw new ParseError(
						`Unexpected token ','`,
						parent.container,
						reader.line,
						reader.column);
				
				reader.consume();
				Parser._consumeWhitespace(reader);
			}

			while (!/[\s:]/.test(reader.peek()))
			{
				if (!validKeyChar.test(reader.peek()))
					throw new ParseError(
						`Unexpected token '${reader.peek()}', expected identifier`,
						parent.container,
						reader.line,
						reader.column);

				key += reader.consume();

				if (reader.peek() === '?')
				{
					optional = true;
					reader.consume();
					break;
				}
			}

			Parser._consumeWhitespace(reader);

			if (reader.peek() !== ':')
				throw new ParseError(
					`Unexpected token '${reader.peek()}', expected ':'`,
					parent.container,
					reader.line,
					reader.column);

			// Discard separator
			reader.consume();

			Parser._consumeWhitespace(reader);

			const { line, column } = reader;
			while (!/[\s,]/.test(reader.peek()))
				type += reader.consume();

			if (!validType.test(type))
				throw new ParseError(
					`Invalid type. Must be one of string, number, boolean, or an array of those`,
					parent.container,
					line,
					column);
			
			types[key] = { type, optional };

			Parser._consumeWhitespace(reader);
			if (reader.peek() !== ',' && reader.peek() !== '\n')
				throw new ParseError(
					`Unexpected token '${reader.peek()}', expected ',' or newline`,
					parent.container,
					reader.line,
					reader.column);
		}

		// Discard ending newline
		reader.consume();

		return types;
	}

	/**
	 * Consumes a string chunk from the input and returns it
	 */
	private static _consumeStringChunk(
		parent: LocalizationStringParentNode,
		reader: StringReader): NodeKindImplStringChunk
	{
		let content: string = ''
		const { line, column } = reader;

		while (true)
		{
			// Check if we are about to encounter a template or parent string key
			if (reader.peekSegment(2, 1) === '{{'
				|| (reader.peek(1) === '['
					&& Parser._peekValidParentKey(reader, 1)))
			{
				// If it's not escaped, consume the next character and return this chunk
				if (reader.peek() !== '\\')
				{
					content += reader.consume();
					break;
				}
			
				// Else consume the backslash and continue
				reader.consume();
			}

			// Consume backslash for escaped comments
			if (reader.peekSegment(3) === '\\##')
				reader.consume();

			// Break if we encounter a comment on its own line, as this is
			// its own chunk kind and will be handled separately
			if (reader.peekSegment(2) === '##' && reader.peekBehind() === '\n')
				break;

			// Discard inline comment content, but not escaped comments
			if (reader.peekSegment(2) === '##' && reader.peekBehind() !== '\\')
				while(reader.peek() !== '\n')
					reader.consume();

			content += reader.consume();

			if (reader.eof())
				break;
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
		if (!/[\w!>\s]/.test(reader.peek(2)))
			return LocalizationStringTemplateKind.Invalid;

		if (reader.peek(2) == '!')
			kind = LocalizationStringTemplateKind.Script;

		if (reader.peek(2) == '>')
			kind = LocalizationStringTemplateKind.Forward;

		while (true)
		{
			if (reader.peekSegment(2, index) === '}}')
			{
				if (reader.peek(index - 1) === '!')
				{
					if (kind !== LocalizationStringTemplateKind.Script)
						kind = LocalizationStringTemplateKind.Invalid;
					
					break
				}

				if (kind === LocalizationStringTemplateKind.Script)
				{
					if (reader.peek(index - 1) !== '!')
						kind = LocalizationStringTemplateKind.Invalid;

					break
				}

				if (reader.peek(index - 1) === '?')
				{
					if (kind === LocalizationStringTemplateKind.Forward)
						kind = LocalizationStringTemplateKind.Invalid;

					else
						kind = LocalizationStringTemplateKind.Maybe;
				}

				else if (kind !== LocalizationStringTemplateKind.Forward)
					kind = LocalizationStringTemplateKind.Regular

				break;
			}

			index++

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
		reader: StringReader): LocalizationStringChildNode
	{
		switch (Parser._peekTemplateKind(reader))
		{
			case LocalizationStringTemplateKind.Regular: return Parser._consumeRegularTemplate(parent, reader);
			case LocalizationStringTemplateKind.Forward: return Parser._consumeForwardTemplate(parent, reader);
			case LocalizationStringTemplateKind.Script: return Parser._consumeScriptTemplate(parent, reader);
			case LocalizationStringTemplateKind.Maybe: return Parser._consumeMaybeTemplate(parent, reader);
			case LocalizationStringTemplateKind.Invalid:
				throw new ParseError(
					'Invalid template',
					parent.container!,
					reader.line,
					reader.column);
		}
	}

	/**
	 * Consume and return a character as a template key segment,
	 * erroring on invalid characters
	 */
	private static _consumeTemplateKeyChar(
		parent: LocalizationStringParentNode,
		reader: StringReader): string
	{
		if (!/[\w\s]/.test(reader.peek()))
			throw new ParseError(
				[
					'Invalid character in template key. Template keys may',
					'only inclue alpha-numeric characters and underscores'
				].join(' '),
				parent.container,
				reader.line,
				reader.column);

		return reader.consume();
	}

	/**
	 * Consumes a regular template from the input, including its content and braces,
	 * and returns it
	 */
	private static _consumeRegularTemplate(
		parent: LocalizationStringParentNode,
		reader: StringReader): NodeKindImplRegularTemplate
	{
		let key: string = ''
		const { line, column } = reader;

		// Discard the opening braces
		reader.consume(2);

		while (reader.peekSegment(2) !== '}}')
			key += Parser._consumeTemplateKeyChar(parent, reader);

		// Discard the closing braces
		reader.consume(2);

		let node: NodeKindImplRegularTemplate =
			new NodeKindImplRegularTemplate(key.trim(), parent, line, column);

		return node;
	}

	/**
	 * Consumes a forward template from the input, including its content and braces,
	 * and returns it
	 */
	private static _consumeForwardTemplate(
		parent: LocalizationStringParentNode,
		reader: StringReader): NodeKindImplForwardTemplate
	{
		let key: string = ''
		const { line, column } = reader;

		// Discard the opening braces
		reader.consume(3);

		while (reader.peekSegment(2) !== '}}')
			key += Parser._consumeTemplateKeyChar(parent, reader);

		// Discard the closing braces
		reader.consume(2);

		let node: NodeKindImplForwardTemplate =
			new NodeKindImplForwardTemplate(key.trim(), parent, line, column);

		return node;
	}

	/**
	 * Consumes a maybe template from the input, including its content and braces,
	 * and returns it
	 */
	private static _consumeMaybeTemplate(
		parent: LocalizationStringParentNode,
		reader: StringReader): NodeKindImplMaybeTemplate
	{
		let key: string = ''
		const { line, column } = reader;

		// Discard the opening braces
		reader.consume(2);

		while (reader.peekSegment(3) !== '?}}')
			key += Parser._consumeTemplateKeyChar(parent, reader);

		// Discard the closing braces
		reader.consume(3);

		let node: NodeKindImplMaybeTemplate =
			new NodeKindImplMaybeTemplate(key.trim(), parent, line, column);

		return node;
	}

	/**
	 * Consumes a script template from the input, including its content and braces,
	 * and returns it
	 */
	private static _consumeScriptTemplate(
		parent: LocalizationStringParentNode,
		reader: StringReader): NodeKindImplScriptTemplate
	{
		let scriptBody: string = '';
		let bodyStartLine: number = 0;
		const { line, column } = reader;

		// Discard the opening braces
		reader.consume(3);

		while (reader.peekSegment(3) !== '!}}')
		{
			if (bodyStartLine === 0 && !/\s/.test(reader.peek()))
				bodyStartLine = reader.line

			scriptBody += reader.consume();
		}

		// Discard the closing braces
		reader.consume(3);

		let node: NodeKindImplScriptTemplate =
			new NodeKindImplScriptTemplate(scriptBody, bodyStartLine, parent, line, column);

		return node;
	}
}
