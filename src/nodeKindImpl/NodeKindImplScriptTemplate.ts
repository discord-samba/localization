import { LocalizationStringParentNode } from '../interfaces/LocalizationStringParentNode';
import { LocalizationStringChildNode } from '../interfaces/LocalizationStringChildNode';
import { LocalizationStringNodeKind } from '../types/LocalizationStringNodeKind';
import { LocalizationResrouceMetaData } from '../types/LocalizationResourceMetaData';
import { TemplateArguments } from '../types/TemplateArguments';
import { Script } from 'vm';

export class NodeKindImplScriptTemplate implements LocalizationStringChildNode
{
	public kind: LocalizationStringNodeKind =
		LocalizationStringNodeKind.ScriptTemplate;

	private _fn!: Function;
	private _impFn?: Function;

	// Should be the line that the template script body actually begins on.
	// Can be different than the line the template script braces are opened
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
		column: number)
	{
		this.bodyStartLine = bodyStartLine;
		this.parent = parent;
		this.line = line;
		this.column = column;

		this._createFunction(fnBody);
	}

	/**
	 * Wrap the given code in a dummy function body
	 */
	private static _functionWrap(code: string)
	{
		return `function _(args, res) {\n${code}\n}`;
	}

	/**
	 * Create the Script Template function from the given function body string
	 */
	private _createFunction(fnBody: string): void
	{
		let fn!: Function;
		// Defer syntax error handling to the vm Script because
		// it will actually detail the code in question in the error
		try { fn = new Function('args', 'res', fnBody); } catch {}

		let error!: Error;

		// Compile the script and capture the error for editing, if any
		// tslint:disable:no-unused-expression
		try { new Script(NodeKindImplScriptTemplate._functionWrap(fnBody)); }
		catch (err) { error = err; }

		if (typeof error !== 'undefined')
		{
			let errStackLines: string[] = error.stack!
				.split('\n')
				.filter((_, i) => i < 5);

			let scriptLine: number = parseInt(errStackLines[0].split(':')[1]) - 3 + this.bodyStartLine;

			// If the error is an unexpected `}`, chances are the line will be off
			// since it is affected by the braces of the function wrapper itself
			// which aren't present in the .lang file so we'll just give the line
			// the script starts on. Accounting for all possible cases with `}` to
			// give an accurate line just isn't worth it.
			if (/Unexpected token }/.test(errStackLines[4]))
				scriptLine = this.line;

			errStackLines[0] = `Error compiling template script:\n`;
			errStackLines.push(`    at Template Script (${this.parent.container}:${scriptLine})`);

			error.stack = errStackLines.join('\n');

			throw error;
		}

		// Attempt to create the coerced implicit return function
		try
		{
			const newFnBody: string = `return ${fnBody.replace(/^[\s]+/, '')}`;
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
		let error: Error = new Error();

		error.message = err.message;

		let stack: string[] = [];
		stack.push(`TemplateScriptError: ${error.message}`);
		stack.push(`    at Template Script (${this.parent.container}:${this.line})`);
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
			try { result = this._impFn(args, _meta._mp); }
			catch (err) { error = this._newErr(err, _meta); }
		}

		if (typeof error !== 'undefined')
			throw error;

		return result;
	}
}
