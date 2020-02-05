import { LocalizationResrouceMetaData } from '../types/LocalizationResourceMetaData';
import { LocalizationStringChildNode } from '../interfaces/LocalizationStringChildNode';
import { LocalizationStringNodeKind } from '../types/LocalizationStringNodeKind';
import { LocalizationStringParentNode } from '../interfaces/LocalizationStringParentNode';
import { Script } from 'vm';
import { TemplateArguments } from '../types/TemplateArguments';

/**
 * Represents an abstract Localization resource node that holds a script
 * embedded in a Localization resource which will be executed when the
 * resource is loaded at runtime
 * @internal
 */
export class NodeKindImplScriptTemplate implements LocalizationStringChildNode
{
	public readonly kind: LocalizationStringNodeKind = LocalizationStringNodeKind.ScriptTemplate;

	private _fn!: Function;
	private _impFn?: Function;

	private _fnBody: string;

	// Should be the line that the script template body actually begins on.
	// Can be different than the line the script template braces are opened
	// which would be the `line` property
	public bodyStartLine: number;

	public parent: LocalizationStringParentNode;
	public line: number;
	public column: number;

	public constructor(
		fnBody: string,
		bodyStartLine: number,
		parent: LocalizationStringParentNode,
		line: number,
		column: number
	)
	{
		this.bodyStartLine = bodyStartLine;
		this.parent = parent;
		this.line = line;
		this.column = column;

		this._fnBody = fnBody;
	}

	/**
	 * Finalize this node by compiling the embedded script it represents. Should
	 * be called after the parent node has finished being parsed so that we have
	 * access to all declared template arguments (since they can be declared at
	 * any point, including after a Script Template that actually utilizes it,
	 * even though it'd be silly to do that in practice) for creation of the
	 * shortcut `$` variables
	 */
	public finalize(): void
	{
		this._createFunction(this._fnBody);
	}

	/**
	 * Wrap the given code in a dummy function body
	 */
	private static _functionWrap(code: string): string
	{
		return `function _(args, res) {\n${code}\n}`;
	}

	/**
	 * Implicitly declare shortcut variables for all declared template arguments
	 * and prefix the given function body with them
	 */
	private _argsWrap(fnBody: string): string
	{
		const args: string = Object.keys(this.parent.params)
			.map(arg => `let $${arg} = args.${arg};`)
			.join('\n');

		return `${args}\n${fnBody}`;
	}

	/**
	 * Create the Script Template function from the given function body string
	 */
	private _createFunction(originalFnBody: string): void
	{
		let fn!: Function;

		const fnBody: string = this._argsWrap(originalFnBody);

		// Defer syntax error handling to the vm Script because
		// it will actually detail the code in question in the error
		// eslint-disable-next-line no-new-func
		try { fn = new Function('args', 'res', fnBody); }
		catch {}

		let error!: Error;

		// Compile the script and capture the error for editing, if any
		// eslint-disable-next-line no-new, no-unused-expressions
		try { new Script(NodeKindImplScriptTemplate._functionWrap(fnBody)); }
		catch (err) { error = err; }

		if (typeof error !== 'undefined')
		{
			const errStackLines: string[] = error.stack!
				.split('\n')
				.slice(0, 5);

			// Offset by the number of additional lines created by the function wrapper,
			// the number of declared template args that will have shortcut vars created,
			// and the .lang file line the script starts on
			const lineOffset: number = 3 - Object.keys(this.parent.params).length + this.bodyStartLine;

			let scriptLine: number = parseInt(errStackLines[0].split(':')[1]) - lineOffset;

			// If the error is an unexpected `}`, chances are the line will be off
			// since it is affected by the braces of the function wrapper itself
			// which aren't present in the .lang file so we'll just give the line
			// the script starts on. Accounting for all possible cases with `}` to
			// give an accurate line just isn't worth it.
			if (errStackLines[4].includes('Unexpected token }'))
				scriptLine = this.line;

			errStackLines[0] = 'Error compiling script template:\n';
			errStackLines.push(`    at Script Template (${this.parent.container}:${scriptLine})`);

			error.stack = errStackLines.join('\n');

			throw error;
		}

		// Attempt to create the coerced implicit return function
		try
		{
			const newFnBody: string = this._argsWrap(`return ${originalFnBody.replace(/^[\s]+/, '')}`);
			// eslint-disable-next-line no-new-func
			const implicitReturnFn: Function = new Function('args', 'res', newFnBody);
			this._impFn = implicitReturnFn;
		}
		catch {}

		this._fn = fn;
	}

	/**
	 * Create a new Error from the given Error that reports the file/key
	 * of the script template that the error was thrown from
	 */
	private _newErr(err: Error, _meta: LocalizationResrouceMetaData): Error
	{
		const error: Error = new Error();
		const stack: string[] = [];

		error.message = err.message;

		stack.push(`ScriptTemplateError: ${error.message}`);
		stack.push(`    at Script Template (${this.parent.container}:${this.line})`);
		if (typeof _meta._cl !== 'undefined')
			stack.push(_meta._cl);

		error.stack = stack.join('\n');

		return error;
	}

	/**
	 * Try calling the script template's fn or implFn and return the result
	 */
	public fn(args: TemplateArguments, _meta: LocalizationResrouceMetaData): string | undefined
	{
		let result: any;
		let error!: Error;

		try { result = this._fn(args, _meta._mp); }
		catch (err) { error = this._newErr(err, _meta); }

		if (typeof result === 'undefined' && typeof this._impFn !== 'undefined')
		{
			if (typeof _meta._cc !== 'undefined'
				&& typeof _meta._ck !== 'undefined'
				&& Array.isArray(_meta._cc)
				&& _meta._cc[_meta._cc.length - 1] === _meta._ck)
				_meta._cc.pop();

			try { result = this._impFn(args, _meta._mp); }
			catch (err) { error = this._newErr(err, _meta); }
		}

		if (typeof error !== 'undefined')
			throw error;

		return result;
	}
}
