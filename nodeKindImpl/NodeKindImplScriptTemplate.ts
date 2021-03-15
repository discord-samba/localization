import { LocalizationResourceMetaData } from '#type/LocalizationResourceMetaData';
import { LocalizationStringChildNode } from '#interface/LocalizationStringChildNode';
import { LocalizationStringNodeKind } from '#type/LocalizationStringNodeKind';
import { LocalizationStringParentNode } from '#interface/LocalizationStringParentNode';
import { Script } from 'vm';
import { TemplateArguments } from '#type/TemplateArguments';

/**
 * Represents an abstract Localization resource node that holds a script
 * embedded in a Localization resource which will be executed when the
 * resource is loaded at runtime
 * @internal
 */
export class NodeKindImplScriptTemplate implements LocalizationStringChildNode
{
	public readonly kind: LocalizationStringNodeKind = LocalizationStringNodeKind.ScriptTemplate;

	private static readonly _argRegex: RegExp = /\B\$(?:(?=[a-zA-Z_][\w]*)[\w]+|[a-zA-Z])\b/g;

	private _fn?: Function;
	private _impFn?: Function;

	// Should be the line that the script template body actually begins on.
	// Can be different than the line the script template braces are opened
	// which would be the `line` property
	public readonly bodyStartLine: number;

	public readonly parent: LocalizationStringParentNode;
	public readonly line: number;
	public readonly column: number;

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

		this._createFunction(fnBody);
	}

	/**
	 * Wrap the given code in a dummy function body
	 */
	private static _functionWrap(code: string): string
	{
		return `function _(args, res) {\n${code.replace(/^\n/, '')}\n}`;
	}

	/**
	 * Implicitly declare shortcut variables for all `$template_argument` found in
	 * the given function body and prefix the given function body with them.
	 *
	 * Returns the wrapped function body and the number of arguments declared
	 */
	private _argsWrap(fnBody: string): [string, number]
	{
		const args: string[] = Array.from(new Set(fnBody.match(NodeKindImplScriptTemplate._argRegex)))
			.map(arg => `let $${arg.slice(1)} = args.${arg.slice(1)};`);

		return [`${args.join('\n')}\n${fnBody.replace(/^\n/, '')}`, args.length];
	}

	/**
	 * Create the Script Template function from the given function body string
	 */
	private _createFunction(originalFnBody: string): void
	{
		let fn!: Function;

		const [fnBody, numArgs]: [string, number] = this._argsWrap(originalFnBody);

		// Only create the function if it contains the `return` keyword. This is a naive tactic
		// but a reasonable assumption to make. If it doesn't contain `return` it simply cannot
		// return a value on its own, so we will immediately fall back to the implicit return
		// function when this script is called. This approach prevents us from compiling twice
		// for every script that exclusively leverages implict returns, and from calling them
		// twice whenever their containing resource is loaded

		// That being said, a script leveraging implicit returns could still have a comment
		// after the implicitly returned value that contains the keyword `return` which would
		// cause us to create an unassuming function here but that occurrence should be far
		// more infrequent than genuine non-implicit scripts in real-life scenarios

		if (fnBody.includes('return'))
		{
			// Defer syntax error handling to the vm Script because
			// it will actually detail the code in question in the error
			// eslint-disable-next-line no-new-func
			try { fn = new Function('args', 'res', fnBody); }
			catch {}
		}

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

			// Offset by the number of additional lines counted by the function wrapper in the vm Script
			// instance, the number of $arg lines added by _argsWrap, and the line number the script template
			// opens on. Then, if the template line and the line the script body starts on are not the same,
			// add 1, unless the original function body begins with whitespace other than a newline, in which
			// case we add 0. For some reason, if the originalFnBody starts with non-linebreak whitespace, it
			// adds a line to the reported line number in the original error message, so we have to ignore that
			// extra line in those cases to get an accurate error line number for our custom error here

			const lineOffset: number = -2 - numArgs + this.line + (
				this.line !== this.bodyStartLine
					? /^[\t\f\v ]+/.test(originalFnBody)
						? 0
						: 1
					: 0
			);

			// Calculate the line the error occurs on in the localization file
			const scriptLine: number = parseInt(errStackLines[0].split(':')[1]) + lineOffset;

			errStackLines[0] = 'Error compiling script template:\n';
			errStackLines.push(`    at Script Template (${this.parent.container}:${scriptLine})`);

			error.stack = errStackLines.join('\n');

			throw error;
		}

		// Attempt to create the coerced implicit return function
		try
		{
			const newFnBody: string = this._argsWrap(`return ${originalFnBody.replace(/^[\s]+/, '')}`)[0];
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
	private _newErr(err: Error, _meta: LocalizationResourceMetaData): Error
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
	public fn(args: TemplateArguments, _meta: LocalizationResourceMetaData): string | undefined
	{
		let result: any;
		let error!: Error;

		// Try the regular function if it exists
		if (typeof this._fn !== 'undefined')
		{
			try { result = this._fn(args, _meta._mp); }
			catch (err) { error = this._newErr(err, _meta); }
		}

		// Try the implicit return function if we did not receive a value from the first function
		if (typeof result === 'undefined' && typeof this._impFn !== 'undefined')
		{
			// In the event that a regular function is created for a script that does not explicitly return
			// a value (likely it contained a comment that contained the word `return`), and that function
			// includes another resource (via `res`), we need to remove the current key from the call chain
			// (that was added when that resource was included while running the initial function) before we
			// can try the implicit return function because otherwise, when that resource is included a second
			// time by calling the implicit return function, we will receive a recursion error due to the key
			// for that resource already existing within the call chain from the first function call

			if (typeof this._fn !== 'undefined'
				&& typeof _meta._cc !== 'undefined'
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
