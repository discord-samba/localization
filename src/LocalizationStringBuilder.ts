/* eslint-disable complexity */
import { Localization } from '#root/Localization';
import { LocalizationPipeFunction } from '#type/LocalizationPipeFunction';
import { LocalizationResrouceMetaData } from '#type/LocalizationResourceMetaData';
import { LocalizationStringChildNode } from '#interface/LocalizationStringChildNode';
import { LocalizationStringChildResultNode } from '#type/LocalizationStringChildResultNode';
import { LocalizationStringError } from '#root/LocalizationStringError';
import { LocalizationStringNodeKind } from '#type/LocalizationStringNodeKind';
import { LocalizationStringParentNode } from '#interface/LocalizationStringParentNode';
import { LocalizationStringTypeDeclaration } from '#type/LocalizationStringTypeDeclaration';
import { NodeKindImplIncludeTemplate } from '#nodeKindImpl/NodeKindImplIncludeTemplate';
import { NodeKindImplMatchTemplate } from '#nodeKindImpl/NodeKindImplMatchTemplate';
import { NodeKindImplOptionalTemplate } from '#nodeKindImpl/NodeKindImplOptionalTemplate';
import { NodeKindImplRegularTemplate } from '#nodeKindImpl/NodeKindImplRegularTemplate';
import { NodeKindImplScriptTemplate } from '#nodeKindImpl/NodeKindImplScriptTemplate';
import { NodeKindImplStringChunk } from '#nodeKindImpl/NodeKindImplStringChunk';
import { Primitive } from '#type/Primitive';
import { TemplateArguments } from '#type/TemplateArguments';
import { TemplatePipe } from '#type/TemplatePipe';

/**
 * Stores a localization string parent node and builds a string
 * from it on demand
 * @internal
 */
export class LocalizationStringBuilder
{
	private readonly _language: string;

	public readonly node: LocalizationStringParentNode;

	public constructor(language: string, input: LocalizationStringParentNode)
	{
		this.node = input;
		this._language = language;
	}

	/**
	 * Builds the output string from the cached Localization string node
	 */
	public build(args: TemplateArguments, _meta: LocalizationResrouceMetaData): string
	{
		const maybeKinds: LocalizationStringNodeKind[] = [
			LocalizationStringNodeKind.OptionalTemplate,
			LocalizationStringNodeKind.MatchTemplate,
			LocalizationStringNodeKind.ScriptTemplate
		];

		const results: LocalizationStringChildResultNode[] = [];
		const path: [string, string, string] =
			[this._language, this.node.category, this.node.subcategory];

		// Validate passed arguments if the parent node has any param type declarations
		if (Object.keys(this.node.params).length > 0)
			this._validateArguments(args, _meta);

		// Evaluate child node results
		for (const child of this.node.children)
		{
			switch (child.kind)
			{
				case LocalizationStringNodeKind.StringChunk:
					this._childIs<NodeKindImplStringChunk>(child);
					results.push(this._makeResult(child.kind, child.content));
					break;

				case LocalizationStringNodeKind.RegularTemplate:
				case LocalizationStringNodeKind.OptionalTemplate:
					this._childIs<NodeKindImplRegularTemplate | NodeKindImplOptionalTemplate>(child);
					const templateArgValue: any = this._runPipes(args[child.key], child.pipes, _meta);
					results.push(this._makeResult(child.kind, templateArgValue));
					break;

				case LocalizationStringNodeKind.IncludeTemplate:
					this._childIs<NodeKindImplIncludeTemplate>(child);

					if (!Localization.resourceExists(path, child.includeKey))
						throw new LocalizationStringError(
							[
								`Localization string key '${child.includeKey}'`,
								`does not exist for language '${this._language}'`
							].join(' '),
							this.node.container,
							child.line,
							child.column,
							_meta
						);

					// Recursion protection. Will work as long as _meta is forwarded.
					// If not, may the Node gods have mercy on your code
					if (_meta._cc?.includes(child.includeKey))
						throw new LocalizationStringError(
							'A localization resource cannot refer to any previous parent',
							this.node.container,
							child.line,
							child.column,
							_meta
						);

					const includeTemplateValue: any = this._runPipes(
						(Localization.resource as any)(path, child.includeKey, args, _meta),
						child.pipes,
						_meta
					);

					results.push(this._makeResult(child.kind, includeTemplateValue));
					break;

				case LocalizationStringNodeKind.MatchTemplate:
					this._childIs<NodeKindImplMatchTemplate>(child);
					const matchTemplateArgValue: any = this._runPipes(args[child.key], child.pipes, _meta);
					let matchValue!: Primitive;

					for (const [pattern, value] of child.matchers)
					{
						if (matchTemplateArgValue === pattern)
						{
							matchValue = value;
							break;
						}
					}

					if (typeof matchValue === 'undefined' && typeof child.defaultMatch !== 'undefined')
						matchValue = child.defaultMatch;

					results.push(this._makeResult(child.kind, matchValue?.toString()));
					break;

				case LocalizationStringNodeKind.ScriptTemplate:
					this._childIs<NodeKindImplScriptTemplate>(child);
					results.push(this._makeResult(child.kind, child.fn(args, _meta)?.toString()));
			}
		}

		// Handle isolated optional templates and script templates with undefined values
		for (const [i, result] of results.entries())
		{
			if (!maybeKinds.includes(result.kind))
				continue;

			const prev: LocalizationStringChildResultNode = results[i - 1];
			const next: LocalizationStringChildResultNode = results[i + 1];
			if (this._isIsolatedMaybeResult(prev, next) && typeof result.value === 'undefined')
			{
				// Remove the leading newline from the next node to compensate
				// for the undefined value of the current node
				next.value = next.value?.replace(/^\n/, '');
				result.value = '';
			}
		}

		// Handle remaining non-isolated optional and script templates with undefined values
		for (const result of results)
			if (maybeKinds.includes(result.kind) && typeof result.value === 'undefined')
				result.value = '';

		return results
			.map(r => `${r.value}`)
			.join('')
			.trimRight();
	}

	/**
	 * Validate the given arguments in the context of the cached parent node,
	 * erroring on invalid types and missing required arguments
	 */
	private _validateArguments(args: TemplateArguments, _meta: LocalizationResrouceMetaData): void
	{
		for (const ident of Object.keys(this.node.params))
		{
			const declaration: LocalizationStringTypeDeclaration = this.node.params[ident];
			const expectedType: string = `${declaration.identType}${declaration.isArrayType ? '[]' : ''}`;

			if (declaration.isOptional && typeof args[ident] === 'undefined')
				continue;

			if (typeof args[ident] === 'undefined')
				throw new LocalizationStringError(
					`Expected type '${expectedType}', got undefined`,
					this.node.container,
					declaration.line,
					declaration.column,
					_meta
				);

			if (declaration.isArrayType)
			{
				if (!Array.isArray(args[ident]))
					throw new LocalizationStringError(
						`Expected array type, got ${typeof args[ident]}`,
						this.node.container,
						declaration.line,
						declaration.column,
						_meta
					);

				for (const arg of args[ident])
					this._validateType(declaration, arg, _meta);
			}
			else
			{
				this._validateType(declaration, args[ident], _meta);
			}
		}
	}

	/**
	 * Validate the type of the given value based on the given declaration
	 */
	private _validateType(
		declaration: LocalizationStringTypeDeclaration,
		value: any,
		_meta: LocalizationResrouceMetaData
	): void
	{
		if (declaration.identType === 'any' || typeof value === declaration.identType)
			return;

		throw new LocalizationStringError(
			[
				`Expected type '${declaration.identType}'`,
				`${declaration.isArrayType ? ' in array' : ''}, got ${typeof value}`
			].join(''),
			this.node.container,
			declaration.line,
			declaration.column,
			_meta
		);
	}

	/**
	 * Returns whether or not a result is valid (exists and has a value)
	 */
	private _isValidResult(result?: LocalizationStringChildResultNode): boolean
	{
		return typeof result?.value !== 'undefined' && result?.value !== '';
	}

	/**
	 * Determines whether or not we are expecting an isolated maybe
	 * result (Optional Template or Script Template) based on the
	 * previous and next result nodes
	 */
	private _isIsolatedMaybeResult(
		prev: LocalizationStringChildResultNode,
		next: LocalizationStringChildResultNode
	): boolean
	{
		if (this._isValidResult(prev) && this._isValidResult(next))
			return prev.value!.endsWith('\n') && next.value!.startsWith('\n');

		if (this._isValidResult(next))
			return next.value!.startsWith('\n');

		return false;
	}

	/**
	 * Run the given value through all pipes for the given child
	 */
	private _runPipes(
		value: string,
		pipes: TemplatePipe[],
		_meta: LocalizationResrouceMetaData
	): any
	{
		let result: any = value;

		for (const pipe of pipes)
		{
			if (!Localization.hasPipeFunction(pipe.ident))
				throw new LocalizationStringError(
					`LocalizationPipeFunction '${pipe.ident}' does not exist`,
					this.node.container,
					pipe.line,
					pipe.column,
					_meta
				);

			const pipeFn: LocalizationPipeFunction = Localization.getPipeFunction(pipe.ident)!;

			try
			{
				result = pipeFn(result, ...pipe.args);
			}
			catch (err)
			{
				throw new LocalizationStringError(
					err.message,
					this.node.container,
					pipe.line,
					pipe.column,
					_meta
				);
			}
		}

		return result;
	}

	/**
	 * Create and return a `LocalizationStringChildResultNode`
	 */
	private _makeResult(kind: LocalizationStringNodeKind, value?: string): LocalizationStringChildResultNode
	{
		return { kind, value };
	}

	/**
	 * Asserts at compile time that the given child node is of type T
	 */
	private _childIs<T extends LocalizationStringChildNode>(
		_child: LocalizationStringChildNode
	): asserts _child is T {}
}
