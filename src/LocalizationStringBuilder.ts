import { LocalizationStringParentNode } from './interfaces/LocalizationStringParentNode';
import { LocalizationStringNodeKind } from './types/LocalizationStringNodeKind';
import { LocalizationStringChildNode } from './interfaces/LocalizationStringChildNode';
import { NodeKindImplStringChunk } from './classes/NodeKindImplStringChunk';
import { NodeKindImplScriptTemplate } from './classes/NodeKindImplScriptTemplate';
import { TemplateArguments } from './types/TemplateArguments';
import { NodeKindImplRegularTemplate } from './classes/NodeKindImplRegularTemplate';
import { NodeKindImplForwardTemplate } from './classes/NodeKindImplForwardTemplate';
import { Localization } from './Localization';
import { NodeKindImplMaybeTemplate } from './classes/NodeKindImplMaybeTemplate';
import { LocalizationStringChildResultNode } from './interfaces/LocalizationStringChildResultNode';
import { LocalizationResourceProxy } from './types/LocalizationResourceProxy';

/**
 * Stores a localization string parent node and builds a string
 * from it on demand
 */
export class LocalizationStringBuilder
{
	private _cachedNode: LocalizationStringParentNode;
	private _language: string;

	public constructor(language: string, input: LocalizationStringParentNode)
	{
		this._cachedNode = input;
		this._language = language;
	}

	/**
	 * Builds the output string from the cached Localization string node
	 */
	public build(args: TemplateArguments, proxy: LocalizationResourceProxy): string
	{
		const maybeKinds: LocalizationStringNodeKind[] = [
			LocalizationStringNodeKind.MaybeTemplate,
			LocalizationStringNodeKind.ScriptTemplate
		];

		let results: LocalizationStringChildResultNode[] = [];

		// TODO: Verify types and presence of TemplateArguments based on
		//       the parent node's type declarations
		//
		//       Be sure to use the type declaration's line/column to direct
		//       the user to the location of the declaration in question
		//       within the localization file when giving an error

		for (const child of this._cachedNode.children)
		{
			switch (child.kind)
			{
				case LocalizationStringNodeKind.StringChunk:
					this._childIs<NodeKindImplStringChunk>(child);
					results.push(this._makeResult(child.kind, child.content));
					break;

				case LocalizationStringNodeKind.RegularTemplate:
				case LocalizationStringNodeKind.MaybeTemplate:
					this._childIs<NodeKindImplRegularTemplate | NodeKindImplMaybeTemplate>(child);
					results.push(this._makeResult(child.kind, args[child.key]));
					break;

				case LocalizationStringNodeKind.ForwardTemplate:
					this._childIs<NodeKindImplForwardTemplate>(child);
					results.push(this._makeResult(
						child.kind,
						Localization.resource(this._language, child.forwardKey, args)));

					break;

				case LocalizationStringNodeKind.ScriptTemplate:
					this._childIs<NodeKindImplScriptTemplate>(child);
					results.push(this._makeResult(child.kind, child.fn(args, proxy)?.toString()));
			}
		}

		// Handle isolated maybe templates and script templates with undefined values
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

		// Handle remaining maybe templates with undefined values
		for (const result of results)
			if (result.kind === LocalizationStringNodeKind.MaybeTemplate && typeof result.value === 'undefined')
				result.value = '';

		return results.map(r => `${r.value}`).join('').trim();
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
	 * result (Maybe Template or Script Template) based on the previous
	 * and next result nodes
	 */
	private _isIsolatedMaybeResult(
		prev: LocalizationStringChildResultNode,
		next: LocalizationStringChildResultNode): boolean
	{
		if (this._isValidResult(prev) && this._isValidResult(next))
			return prev.value!.endsWith('\n') && next.value!.startsWith('\n');

		if (this._isValidResult(next))
			return next.value!.startsWith('\n');

		return false;
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
		_child: LocalizationStringChildNode): asserts _child is T {}
}
