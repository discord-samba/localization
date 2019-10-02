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

export class Parser
{
	public parse(container: string, input: string): NodeKindImplParentNode[]
	{
		let nodeList: NodeKindImplParentNode[] = [];
		const reader: StringReader = new StringReader(input);

		while (!reader.eof())
		{
			let currentNode: NodeKindImplParentNode;
			switch (reader.peek())
			{
				case '#':
					// Allow header comments before the first key.
					this._consumeCommentLine(reader);
					break

				case '[':
					// Ignore everything at the start of the file until we hit a valid key
					if (reader.peekBehind() !== '\n' && typeof reader.peekBehind() !== 'undefined')
						throw new ParseError(
							'Localization string key must begin at the start of its own line',
							container,
							reader.line,
							reader.column);

					let column: number = reader.column;
					let line: number = reader.line;
					let key: string = this._consumeParentKey(reader, container, line, column);
					
					currentNode = new NodeKindImplParentNode(container, key, line, column);
					nodeList.push(currentNode);

					// Break if we hit a valid string key without encountering a string body
					if (reader.peek() === '[' && this._peekValidParentKey(reader))
						throw new ParseError(
							`Unexpected string key, expected string body`,
							container,
							reader.line,
							reader.column);

					let creatingNode: boolean = true;
					while (creatingNode)
					{
						switch (this._peekChunkKind(reader))
						{
							case LocalizationStringChunkKind.Comment:
								this._consumeCommentLine(reader);
								break;

							case LocalizationStringChunkKind.StringChunk:
								currentNode.addChild(this._consumeStringChunk(currentNode, reader));
								break;

							case LocalizationStringChunkKind.Template:
								
								currentNode.addChild(this._consumeTemplate(currentNode, reader));
								break;

							case LocalizationStringChunkKind.TypesDeclaration:
								// TODO: Handle parameter type validation building.
								//       Write function to parse until the end of the line. Should return an object
								//       mapping param names to param types. This can then be appended to the parent
								//       nodes param types, as multiple type declaration comments should be allowed
								//       to allow splitting the declaration across multiple lines
								creatingNode = false;
								break;

							case LocalizationStringChunkKind.None:
								creatingNode = false;
								break;
						}
					}
					break;

				// TODO: Handle any other cases? I don't think there will be any.
				//       If not, break this down into an if-else and save a level
				//       of indentation

				default:
					reader.consume();
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
	private _peekValidParentKey(reader: StringReader, offset: number = 0): boolean
	{
		// if (reader.peek(offset - 1) !== '\n' && typeof reader.peek(offset - 1) !== 'undefined')
		// 	return false;

		if (reader.peek(offset) !== '[')
			return false;

		let index: number = 1 + offset;
		while (reader.peek(index) !== ']')
		{
			if (reader.eof(index))
				return false;

			if (!/[a-zA-Z0-9_]/.test(reader.peek(index)))
				return false;

			index++;
		}
		return true;
	}

	/**
	 * Consumes the key string for a parent node key, including the braces
	 * and newline, and returns the key
	 */
	private _consumeParentKey(reader: StringReader, container: string, line: number, column: number): string
	{
		if (!this._peekValidParentKey(reader)
			|| (reader.peekBehind() !== '\n' && typeof reader.peekBehind() !== 'undefined'))
			throw new ParseError(
				'Localization string key must begin at the start of its own line',
				container,
				reader.line,
				reader.column);

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
			
			if (!/[a-zA-Z0-9_]/.test(reader.peek()))
				throw new ParseError(
					'String key may only contain alpha-numeric characters and underscores',
					container,
					line,
					column);

			key += reader.consume();
		}

		// Discard the closing `]`
		reader.consume();

		if (reader.peek() !== '\n')
			throw new ParseError(
				`Unexpected token '${reader.peek()}', expected newline`,
				container,
				reader.line,
				reader.column + 1);

		// Discard the newline following key
		reader.consume();

		return key;
	}

	/**
	 * Peeks the kind of chunk we are looking at so we know how to parse
	 * it into a proper child node
	 */
	private _peekChunkKind(reader: StringReader): LocalizationStringChunkKind
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

		if (reader.peekSegment(2) === '{{')
			return LocalizationStringChunkKind.Template;

		if (reader.peek() === '[' && this._peekValidParentKey(reader) || reader.eof())
			return LocalizationStringChunkKind.None;

		return LocalizationStringChunkKind.StringChunk;
	}

	
	/**
	 * Consumes and discards the remainder of the line, including
	 * the ending newline
	 */
	private _consumeCommentLine(reader: StringReader): void
	{
		while (reader.peek() !== '\n')
			reader.consume();

		// Discard newline after comment
		reader.consume();
	}

	/**
	 * Consumes a string chunk from the input and returns it
	 */
	private _consumeStringChunk(
		parent: LocalizationStringParentNode,
		reader: StringReader): NodeKindImplStringChunk
	{
		let content: string = ''

		while (true)
		{
			// Check if we are about to encounter a template or parent string key
			if (reader.peekSegment(2, 1) === '{{'
				|| (reader.peek(1) === '['
					&& this._peekValidParentKey(reader, 1)))
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
			new NodeKindImplStringChunk(content, parent, reader.line, reader.column);

		return node;
	}

	/**
	 * Peeks the following chunk for its template kind
	 */
	private _peekTemplateKind(reader: StringReader): LocalizationStringTemplateKind
	{
		let index: number = 0;
		let kind: LocalizationStringTemplateKind = LocalizationStringTemplateKind.Invalid;
		if (!/[a-zA-Z0-9_!>\s]/.test(reader.peek(2)))
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
	private _consumeTemplate(
		parent: LocalizationStringParentNode,
		reader: StringReader): LocalizationStringChildNode
	{
		switch (this._peekTemplateKind(reader))
		{
			case LocalizationStringTemplateKind.Regular: return this._consumeRegularTemplate(parent, reader);
			case LocalizationStringTemplateKind.Forward: return this._consumeForwardTemplate(parent, reader);
			case LocalizationStringTemplateKind.Script: return this._consumeScriptTemplate(parent, reader);
			case LocalizationStringTemplateKind.Maybe: return this._consumeMaybeTemplate(parent, reader);
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
	private _consumeTemplateKeyChar(parent: LocalizationStringParentNode, reader: StringReader): string
	{
		if (!/[a-zA-Z0-9_\s]/.test(reader.peek()))
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
	private _consumeRegularTemplate(
		parent: LocalizationStringParentNode,
		reader: StringReader): NodeKindImplRegularTemplate
	{
		let key: string = ''

		// Discard the opening braces
		reader.consume(2);

		while (reader.peekSegment(2) !== '}}')
			key += this._consumeTemplateKeyChar(parent, reader);

		// Discard the closing braces
		reader.consume(2);

		let node: NodeKindImplRegularTemplate =
			new NodeKindImplRegularTemplate(key.trim(), parent, reader.line, reader.column);

		return node;
	}

	/**
	 * Consumes a forward template from the input, including its content and braces,
	 * and returns it
	 */
	private _consumeForwardTemplate(
		parent: LocalizationStringParentNode,
		reader: StringReader): NodeKindImplForwardTemplate
	{
		let key: string = ''

		// Discard the opening braces
		reader.consume(3);

		while (reader.peekSegment(2) !== '}}')
			key += this._consumeTemplateKeyChar(parent, reader);

		// Discard the closing braces
		reader.consume(2);

		let node: NodeKindImplForwardTemplate =
			new NodeKindImplForwardTemplate(key.trim(), parent, reader.line, reader.column);

		return node;
	}

	/**
	 * Consumes a maybe template from the input, including its content and braces,
	 * and returns it
	 */
	private _consumeMaybeTemplate(
		parent: LocalizationStringParentNode,
		reader: StringReader): NodeKindImplMaybeTemplate
	{
		let key: string = ''

		// Discard the opening braces
		reader.consume(2);

		while (reader.peekSegment(3) !== '?}}')
			key += this._consumeTemplateKeyChar(parent, reader);

		// Discard the closing braces
		reader.consume(3);

		let node: NodeKindImplMaybeTemplate =
			new NodeKindImplMaybeTemplate(key.trim(), parent, reader.line, reader.column);

		return node;
	}

	/**
	 * Consumes a script template from the input, including its content and braces,
	 * and returns it
	 */
	private _consumeScriptTemplate(
		parent: LocalizationStringParentNode,
		reader: StringReader): NodeKindImplScriptTemplate
	{
		let scriptBody: string = '';
		let bodyStartLine: number = 0;

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
			new NodeKindImplScriptTemplate(scriptBody, bodyStartLine, parent, reader.line, reader.column);

		return node;
	}
}
