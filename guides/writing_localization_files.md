---
layout: 'guide'
title: 'Writing Localization Files'
menuOrder: 2
---

# Writing Localization Files

## Foreword
If you've used YAMDBF, the predecessor to Samba in the past, or more specifically its localization system,
this process will be familiar to you. That being said, there are some slight differences, and there's
a lot to go over for the sake of being thorough and presenting a well-documented process.

This guide is meant to be as in-depth as possible without being too lengthy so if anything is left
unclear by the end don't be afraid to ask for help on the [Discord server](#) if you need it.

*TODO: Make a new Discord server and update the above link*

## Tools and Utilities
An official Samba Visual Studio Code extension to provide syntax highlighting for Samba Localization
files is available on the Visual Studio Marketplace
([samba-localization-highlighter](https://marketplace.visualstudio.com/items?itemName=discord-samba.samba-localization-highlighter)).
You can also search `samba` in the extension interface within Visual Studio Code and install it directly
from your editor.

## File Organization Basics
The Localization module operates on top of files with the `.lang` format. These files consist of string
resource declarations for any one arbitrary language (You will specify which language the file represents
when loading the file).

A language definition can be split across any arbitrary number of files; The string resource declarations
will all be cached under the specified language.

The localization loader method [`loadFromDirectory()`](/localization/docs/classes/localization.html#loadfromdirectory)
will load from subdirectories in the given directory as well, so this allows for even more detailed
organization of localization resources without extra effort in loading them.

## Defining String Resources

Localization string resources are defined as key-value pairs within `.lang` files where the value
is the body containing all text between its key and the next, or the end of the file. The key itself
must be alpha-numeric with underscores allowed (Following Javascript's identifier rules), and the key
declaration must be the first thing on a line. Whitespace is not allowed anywhere within the key
declaration. Anything resembling a localization string resource key that is syntactically invalid
will be parsed as part of the previous string resource, or discarded as header comments if appearing
as the first item in a `.lang` file.

Localization string resource definition syntax is as follows:

```
Anything present above the first string resource will be discarded as
header comments. Comments can appear anywhere else within the .lang file
via `##` syntax.

## example.lang
[KEY_1]
foo bar baz

[KEY_2]
boo far faz
```

This creates two keys, `KEY_1`, and `KEY_2`, when this file is loaded. Their values will consist of
`foo bar baz` and `boo far faz`, respectively.

```
## One-line strings are possible as well
[ONE_LINE_1] foo bar baz

## They can technically span multiple lines, but this looks kind of silly
[ONE_LINE_2] foo bar baz
boo far faz
```

> **Note:** Localization resource content will have ending whitespace trimmed by the Localization string
> builder when the resource is called at runtime. Beginning whitespace is preserved in case it is desired
> for formatting purposes. In the case of one-line resources, the whitespace prior to the resource content
> will be ignored as any whitespace up to and including a linebreak after a Localization resource key is
> explicitly discarded by the parser regardless.

### Categories and subcategories
Additional distinction can be optionally applied to localization resources via categories and subcategories.
These are an addition to the syntax of resource keys. Categories and subcategories, like resource keys,
must follow Javascript's identifier rules, and use the syntax `[category(subcategory):RESOURCE_KEY]`,
where the subcategory is optional (`[category:RESOURCE_KEY]`).

This affords simple arbitrary distinction between otherwise identical resource keys. For example, the
Localization module provides a `CommandInfoProvider` function that operates on top of category/subcategory
functionality that can be given to the Command module to allow it to pull localized command information
from the Localization module for use within the base `help` command.

```
[command(ping):desc]
Pong!

[command(ping):help]
Pings the bot, which will respond with how long the ping took.

[command(shortcuts):desc]
Configure or list command shortcuts

[command(shortcuts):help]
Shortcuts allow creating and calling preconfigured command+argument sets, or simple aliases

Example:
	<prefix>shortcuts set h help

Which would set the shortcut "h" to call the command "help"
...
```

Samba has no base commands written at the time of writing this, so we are using examples from YAMDBF
for how command information could be provided via Samba's Localization module. As you can see, we're
providing information for two commands via the `desc` and `help` keys. Because there is a distinction
between the subcategories for the two sets of keys, there is no overlap.

> **Tip:** If simple distinction via a single category and single subcategory is not adequate for your
> purposes, you can effictively apply infinite arbitrary distinction with just the category by treating
> it like any other language identifier and using multiple words. `camel_case`, `snakeCase`, or even
> `PascalCase` are your friends here. The same can be said for subcategories.

## Templating
`.lang` files allow for more than just simple strings. String building would be a nightmare if interpolation
weren't possible. The Samba Localization module provides variable interpolation functionality through
its templating syntax, which somewhat resembles Handlebars. There are a few different kinds of templates
to use within your localization resources:

 - Regular
 - Optional
 - Include
 - Match
 - Script

The different template kinds will be discussed later.

Templates operate on top of arguments passed to a Localization string resource when it is called at
runtime.

### Template Arguments
Template arguments are passed to localization resources as an object that maps argument names to argument
values. Any arguments not consumed via templates within the resource itself will be ignored when the
resource is assembled.

Arguments can be preemptively declared within a resource definition via `##!` syntax. This is a
type-declaration comment. This allows (or rather necessitates) specifying a type for any arguments,
which will be type-checked at runtime. The allowed types are:

 - `String`
 - `Number`
 - `Boolean`
 - `Any` (Allows any type)
 - An array of any of the above
   - Denoted with `[]`, for example: `String[]`

For convenience, these types are case-insensitive, however the argument identifiers are not as they
must match with the template argument object keys. Resource type declarations follow the syntax of
`ident: type`, or `ident?: type`, delimited by comma. Dangling commas are not permitted and will throw
a parser error when the containing file is loaded.

Identifiers ending in `?` denote optional arguments. These arguments are allowed to be omitted, and
should generally be associated with Optional Templates and Script Templates that provide handling
for undefined values. Arguments that do not have this optional specification will throw runtime errors
when the resource is loaded if a value matching the declared identifier is not present.

Here's an example of a localization resource that takes two arguments, one of which is optional and
used with an Optional Template (Optional Templates will be detailed later):

{% raw %}
```
[EXAMPLE_1]
##! bar: String, baz?: Number
foo{{ bar }}{{? baz }}
```
{% endraw %}

Argument type-declarations can be split accross multiple type-declaration comments if desired. This
helps keep line-length from getting out of hand if you have a particularly large set of arguments
being passed to a resource. Just be mindful of dangling commas which, again, are not allowed. (Yes,
I'm opinionated and so is the parser.)

{% raw %}
```
[EXAMPLE_2]
##! bar: String
##! baz?: Number
foo{{ bar }}{{? baz }}
```
{% endraw %}

Type-checking your arguments provides feedback to you, the developer, so you can be sure you are
passing the correct data to your localization resources. If you encounter a runtime error due to
invalid types being passed, you can interpret this as a bug in your code. The Localization module
will give you a detailed report on which resource triggered the error and where you attempted to
call the resource:

```
.../__test__/locale/manual/manual.lang:2

 2 | ##! bar: String, baz?: Number
         ^

LocalizationStringError: Expected type 'string', got number
    at Localization Container (.../__test__/locale/manual/manual.lang:2:5)
    at Object.<anonymous> (.../__test__/manual_test.js:12:33)
    ...
```

> **Note:** Type-checking your arguments is entirely optional. You do not need to write type declarations
> for your template arguments if you do not want type-checking at runtime.

### Regular Templates
> Syntax: {% raw %}`{{ argument_name }}`{% endraw %}

Regular Templates are the simplest of the template kinds. Regular templates are equivalent to passing
a single variable to a Javascript template string.

For example:

{% raw %}
```
[EXAMPLE_3]
foo{{ bar }}baz
```
{% endraw %}

When the resource `EXAMPLE_3` is called, given an arguments object consisting of `{ bar: 'bar' }`,
the output will be `'foobarbaz'`.

Regular templates expect to always receive a value, and will interpolate `undefined` if given none,
so the above example would return `'fooundefinedbaz'` if given no `bar` argument. You should consider
this result a bug in your code and should diagnose why it is occurring.

If instead you intended to have a template that evaluates to nothing when no value is given, use an
Optional Template.

### Optional Templates
> Syntax: {% raw %}`{{? argument_name }}`{% endraw %}

Optional Templates function like regular templates, except they evaluate to nothing when no matching
argument is given.

{% raw %}
```
[EXAMPLE_4]
foo{{? bar }}baz
```
{% endraw %}

When given an arguments object consisting of `{ bar: 'bar' }`, the above example will return `'foobarbaz'`,
but will return `'foobaz'` when given an arguments object that does not contain a value for `bar`.

Additionally, if an Optional Template is the only thing occupying a line and it is not fulfilled when
the resource is called, the line will not be preserved, provided there is no surrounding whitespace.

{% raw %}
```
[EXAMPLE_5]
foo
{{? bar }}
baz

[EXAMPLE_6]
foo
{{? bar }} ## Note the space before this comment
baz
```
{% endraw %}

In the example above, `EXAMPLE_5` will return `'foo\nbaz'`, whereas `EXAMPLE_6` will return `'foo\n \nbaz'`.
The empty line can, however, be preserved if the value of the optional argument is an empty string (`''`).

### Include Templates
> Syntax: {% raw %}`{{> resource_name }}`{% endraw %}

Include Templates provide an easy way for a localization resource to embed another localization resource.

{% raw %}
```
[EXAMPLE_7]
bar

[EXAMPLE_8]
foo{{> EXAMPLE_7 }}baz
```
{% endraw %}

Using the example above, calling resource `EXAMPLE_8` will return `'foobarbaz'`, because `EXAMPLE_7` has
been called as well via the include template.

Arguments will be forwarded to the resource called by the include template, so be sure to provide the
arguments for all resources that will be called when calling a resource containing include templates.

{% raw %}
```
[EXAMPLE_9]
bar{{ baz }}

[EXAMPLE_10]
foo{{> EXAMPLE_9 }}
```
{% endraw %}

In the example above, `EXAMPLE_9` expects an argument called `baz`, so this must be passed when calling
`EXAMPLE_10` so that the argument may be forwarded to `EXAMPLE_9` when it is loaded as well.

> **Note:** Include templates cannot call any chain of include templates that will eventually load its
> own containing parent resource. This prevents infinite loops. You will receive an error when you attempt
> to call a resource that does not adhere to this restriction.

Resources can also embed other resources via Script Templates, detailed later.

### Match Templates
> Syntax: {% raw %}`{{# foo: 'foo' => 'bar', _ => 'baz' }}`{% endraw %}

Match templates allow you to map primitive (string, number, and boolean values) inputs to primitive outputs.
This can be useful so that you don't have to drop down into embedded scripts via Script Templates to map
inputs to values, and has the added benefit of being able to pipe the initial value through predefined
[transformers](#transformer-functions-pipes) (Handy for normalization prior to matching) instead of having
to write your own solution inside of a Script Template.

{% raw %}
```
[EXAMPLE_11]
##! foo?: String
foo{{#
    foo:
        'foo' => 'bar',
        _ => 'baz'
}}baz
```
{% endraw %}

You can see in the example above that if `foo` equals `'foo'`, then the value `'bar'` will be returned. A
match for `_` is a default match which will match any input that does not match any of the other patterns.

Using the example above, given an arguments object consisting of `{ foo: 'foo' }`, we can expect the resource
to return `'foobarbaz'`, because the value `'foo'` maps to `'bar'`. Given any other value for `foo`, or if `foo`
is absent, the default matcher will be chosen, since there are no other matchers that would handle any other
values, so we can expect the resource to return `'foobazbaz'`.

> **Note:** The default match pattern (`_`) is optional. In the event that it is omitted and a match is not
> found for the given input, the match template will return nothing. This behaves the same way as Optional
> templates, in that the match template will evaluate to nothing and you can expect the same behavior
> as Optional templates with regards to the handling of blank lines resulting from an empty template value
> as well.
>
> For example, {% raw %}`foo{{# bar: }}baz`{% endraw %} will return `'foobaz'` because there are no patterns
> for the `bar` argument, and {% raw %}`foo\n{{# bar: }}\nbaz`{% endraw %} will return `'foo\nbaz'` as the
> blank line left by the empty match result will not be preserved.

Script Templates will always be a more powerful and more versatile option, however, so take time to consider
which is the right fit for what you're trying to accomplish with your external data when writing your
localizations.

### Script Templates
> Syntax: {% raw %}`{{! 'foo' + 'bar' + 'baz' !}}`{% endraw %}<br>
> Supports any valid Javascript code between the template braces

Script templates allow you to embed arbitrary Javascript code in your templates. This code will be
pre-compiled to check for syntax errors when the `.lang` file containing it is loaded. You will also
be presented with errors detailing where in the `.lang` file the script template is located if a script
template throws an error at runtime. This will aid debugging on the part of you, the developer.

Script templates are the ultimate solution to any disparity between the structure of different languages.
The primary example that comes to mind is pluralization. English-like pluralization is not the end-all
solution to pluralization and can not necessarily be represented similarly in many languages.

Using the example from before, simple pluralization in English could look like:

{% raw %}
```
[EXAMPLE_12]
##! qty: Number
I have {{! args.qty === 1 ? 'an' : args.qty !}} apple{{! args.qty === 1 ? '' : 's' !}}!
```
{% endraw %}

In the example above, you can see that resource arguments can be accessed within a script template via
`args`. Given the following values to `qty`, you can expect the following results:

|  Arguments   |        Result        |
| :----------: | :------------------: |
| `{ qty: 1 }` | `'I have an apple!'` |
| `{ qty: 2 }` | `'I have 2 apples!'` |

> **Tip:** For convenience, template arguments can also be used within script templates by prefixing
> them with `$`, rather than accessing them directly via `args`. The above example could be rewritten
> using `$`:
> 
> {% raw %}
> ```
> [EXAMPLE_12]
> ##! qty: Number
> I have {{! $qty === 1 ? 'an' : $qty !}} apple{{! $qty === 1 ? '' : 's' !}}!
> ```
> {% endraw %}

In addition to `args`, script templates also receive `res` which is a
[`LocalizationResourceProxy`](/localization/docs/globals.html#localizationresourceproxy) that can be
used for loading other localization resources, similarly to, and as mentioned in
[Include Templates](#include-templates).

{% raw %}
```
[EXAMPLE_13]
##! qty: Number
Guess what? {{! res.EXAMPLE_11() !}}

## This is functionally identical to the following:
[EXAMPLE_14]
Guess what? {{> EXAMPLE_11 }}
```
{% endraw %}

> **Note:** Just like with include templates, there is recursion protection in place for loading other
> localization resources via `res`. Also note that when calling other resources via `res`, you do not
> need to explicitly pass the arguments to the resource function. They are forwarded automatically.
> You can, however, pass an arguments object specific to that script template if desired.

As you may have noticed, simple script templates have their values returned implicitly. More complex,
multi-line script templates can be written as well, but you will need to explicitly return a value.

{% raw %}
```
[EXAMPLE_15]
##! foo: Number, bar: Number
foo{{!
    let a = $foo * 10;
    let b = $bar * 20;
    return a + b;
!}}baz
```
{% endraw %}

Given the example above and an arguments object consisting of `{ foo: 1, bar: 2 }` you can expect the
resource to return `'foo50baz'` when called.

If you recall in [Optional Templates](#optional-templates) we went over how optional templates isolated
on their own line without whitespace will not preserve the empty line if the argument is not satisfied.
Script templates present this same behavior when they return `undefined`.

{% raw %}
```
[EXAMPLE_16]
##! bar?: String
foo
{{! $bar !}}
baz
```
{% endraw %}

Given the example above and no arguments, you can expect the resource to return `'foo\nbaz'`. Just like
with optional templates, this behavior can be circumvented by returning an empty string (`''`).

### Transformer Functions (Pipes)
Transformer functions are functions that you can pipe data into to transform it in some way. Regular and
Optional Template values, as well as Include Template results can be piped into transformer functions in
your Localization files using the pipe operator (`|`):

{% raw %}
```
[EXAMPLE_17]
##! bar: String
foo{{ bar | toUpperCase }}baz
```
{% endraw %}

Given the example above and a template arguments object consisting of `{ bar: 'bar' }`, you can expect
the resource to return `'fooBARbaz'`, as the template value for `bar` was piped into the `toUpperCase`
transformer which, as you would expect, transformed `'bar'` to `'BAR'`.

Transformer functions can also accept additional parameters like so:

{% raw %}
```
[EXAMPLE_18]
##! bar: String
foo{{ bar | padStart(5, '@') | repeat(2) }}baz
```
{% endraw %}

Given the example above and a template arguments object consisting of `{ bar: 'bar' }`, you can expect
the resource to return `'foo@@bar@@barbaz'`. As you can see in the example, we're piping the value of
`bar` into `padStart`, to which we are passing `5`, and `'@'` to pad to a length of `5` with `@`. We
then pipe the result of this transformation into `repeat`, to which we are passing `2` to repeat the
value twice.

> **Note:** Additional values passed to transformer functions may only consist of `string`, `number`,
> and `boolean`, as these are the only primitive literals that exist in the Localization "language".
> Anything else (invalid identifiers, symbols, etc.) will be interpreted as a parser error of some kind.

As you would expect, the transformers detailed above expect the piped-in value to be a string as they
are analogous to the JavaScript `String` prototype functions of the same name. You can create your
own transformer functions that you can pipe values into as well, which are not limited to receiving
strictly strings for the piped-in value. You could write a transformer that sorts arrays of values,
for example. Supplying your own transformers is detailed in
[*Using the Localization Module*](/localization/guides/using_the_localization_module/#providing-custom-transformers).

> **Tip:** Whitespace, including linebreaks and tabs, is allowed within templates. If you are piping
> a template value through many transformers, you can freely use linebreaks, etc. to make it look cleaner.
> For instance, `EXAMPLE_17` above could be restructured like so:
> {% raw %}
> ```
> [EXAMPLE_18]
> ##! bar: String
> foo{{
>     bar
>     | padStart(5, '@')
>     | repeat(2)
> }}baz
> ```
> {% endraw %}

Transformers are able to be used in combination with Regular Templates, Optional Templates, Include
Templates, and Match Templates. The former three bahave identically in terms of their syntax. For
Match Templates, the transformers are only able to be used on the initial template argument within
the match template itself, like so:

{% raw %}
```
[EXAMPLE_19]
foo{{#
	foo | toLowerCase | replace('\s', ''):
		'foo' => 'bar',
		'bar' => 'baz'
}}baz
```
{% endraw %}

Using the example above, given an arguments object consisting of `{ foo: 'F O O' }`, we can expect
the resource to return `'foobarbaz'` because we're piping the value of `foo` into `toLowerCase` to
create `'f o o'`, and then into `replace('\s', '')` which will replace every occurrence of whitespace
with an empty string, giving us `'foo'`, which of course matches the first pattern, so we end up
with `'bar'`

#### Base Transformer List
Transformer function signature syntax for the purposes of this section is as follows:
```
[<TypeParams[, ...]>] pipeValueType | ([argType[, argType? ...]]) -> resultType
```

Optional argument types are followed by `?` and repeatable/rest argument types are prefixed by `...`

For example, the function signature for `padStart` looks like:
```
string | (number, string?) -> string
|         |       |           |
|         |       |           `--returnType
|         |       `--optional argType 
|         `--argType
`--pipeValueType
```
This signature indicates the pipe value type is expected to be a `string`, it accepts a `number`
(the pad length) for the first additional argument, optionally accepts a `string` (the fill string)
for a second additional argument, and returns a value of type `string`. Usage of this function should
look like this:

{% raw %}
```
[EXAMPLE_20]
##! bar: String
foo{{ bar | padStart(10) }}baz
## Or with the optional fill string:
foo{{ bar | padStart(10, '#') }}baz
```
{% endraw %}
<br>

> **Note:** An unfamiliar type you may see in the transformer signatures is `primitive`. This type
> represents any of the valid primitive type literals that can be represented in the Localization
> "language" (`string`, `number`, `boolean`). You may also notice `undef`. This is just shorthand
> for `undefined`.

The following is a list of all base transformer functions that can be used:

{% capture example %}{% raw %}{{ foo | add(10) }}{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="add"
	signature="number | (number) -> number"
	description="Adds the given number value to the piped number value"
	example=example
%}


{% capture example %}{% raw %}{{ foo | capitalize }}{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="capitalize"
	signature="string | () -> string"
	description="Capitalizes the first character of the piped string value"
	example=example
%}


{% capture example %}{% raw %}{{ foo | ceil }}{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="ceil"
	signature="number | () -> number"
	description="Rounds the piped number value up to the nearest integer"
	example=example
%}


{% capture example %}{% raw %}
{{ foo | clamp(10, 20) }}
## 30 | (10, 20) -> 20
## 5  | (10, 20) -> 10
## etc.
{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="clamp"
	signature="number | (number, number) -> number"
	description="Clamps the piped number to the given range"
	example=example
%}


{% capture example %}{% raw %}{{ foo | concat("bar", "baz") }}{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="concat"
	signature="string | (...string) -> string"
	description="Concatenates the given string values with the piped string value"
	example=example
%}


{% capture example %}{% raw %}
##! foo?: Number
{{ foo | default(5) }}
{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="default"
	signature="<T: primitive, U: any> U | (T) -> U / T"
	description="
Returns the given value if the piped value is <code>undefined</code>, otherwise returns the piped value
"
	example=example
%}


{% capture example %}{% raw %}{{ foo | divideBy(2) }}{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="divideBy"
	signature="number | (number) -> number"
	description="Divides the piped number value by the given number value"
	example=example
%}


{% capture example %}{% raw %}
##! foo: String[]
{{ foo | first }}
{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="first"
	signature="&lt;T&gt; T[] | () -> T / undef"
	description="
Takes the first item from a piped array. Can result in <code>undefined</code> if the piped array is empty
"
	example=example
%}


{% capture example %}{% raw %}{{ foo | floor }}{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="floor"
	signature="number | () -> number"
	description="Rounds the piped number value down to the nearest integer"
	example=example
%}


{% capture example %}{% raw %}
##! foo: Any
{{ foo | inspect }}

## Or, with a specified depth

{{ foo | inspect(3) }}
{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="inspect"
	signature="any | (number?) -> string"
	description="
Calls <a href=\"https://nodejs.org/api/util.html#util_util_inspect_object_options\"><code>util.inspect()</code></a>
on the piped value. Can be given a number for inspection depth (defaults to 1).
<br>
<blockquote>
<b>Note:</b> This can be used for debugging complex values before piping them to transformers that
simplify the value. Obviously this kind of debugging is better suited to the debugger in your editor
but some might find this helpful.
</blockquote>
"
	example=example
%}


{% capture example %}{% raw %}
##! foo: String[]
{{ foo | join(";") }}
{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="join"
	signature="any[] | (string?) -> string"
	description="Joins all items of a piped array with the given string. Defaults to <code>','</code>"
	example=example
%}


{% capture example %}{% raw %}{{ foo | length }}{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="length"
	signature="string / any[] | () -> number"
	description="Returns the length of the piped string or array value"
	example=example
%}


{% capture example %}{% raw %}{{ foo | max(100) }}{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="max"
	signature="number | (number) -> number"
	description="Ensures the piped number is <i>at most</i> the given number"
	example=example
%}


{% capture example %}{% raw %}{{ foo | min(10) }}{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="min"
	signature="number | (number) -> number"
	description="Ensures the piped number is <i>at least</i> the given number"
	example=example
%}


{% capture example %}{% raw %}{{ foo | multiplyBy(10) }}{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="multiplyBy"
	signature="number | (number) -> number"
	description="Multiply the piped number value by the given number value"
	example=example
%}


{% capture example %}{% raw %}{{ foo | normalizeWhitespace }}{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="normalizeWhitespace"
	signature="string | () -> string"
	description="Replaces all consecutive whitespace with a single space and trims surrounding whitespace"
	example=example
%}


{% capture example %}{% raw %}{{ foo | padEnd(5, "*") }}{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="padEnd"
	signature="string | (number, string?) -> string"
	description="Pads the end of the piped string to the given length with the given filler, or <code>' '</code>"
	example=example
%}


{% capture example %}{% raw %}{{ foo | padStart(5, "#") }}{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="padStart"
	signature="string | (number, string?) -> string"
	description="Pads the start of the piped string to the given length with the given filler, or <code>' '</code>"
	example=example
%}


{% capture example %}{% raw %}
## Pick a property from an object by string key

{{ foo | pick("bar") }}

## Pick an item from an array by numerical index

{{ foo | pick(5) }}
{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="pick"
	signature="object / array | (string / number) -> any / undef"
	description="
Picks a value from the piped object using the given key. Can also be used to pick an item from an array
via numerical index. Can result in <code>undefined</code> if the key does not exist on a piped object
or the index is out of range on a piped array.
"
	example=example
%}


{% capture example %}{% raw %}{{ foo | prepend("bar") }}{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="prepend"
	signature="string | (string) -> string"
	description="Adds the given string to beginning of the piped string value"
	example=example
%}


{% capture example %}{% raw %}{{ foo | repeat(5) }}{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="repeat"
	signature="string | (number) -> string"
	description="Repeats the piped string value <code>n</code> times"
	example=example
%}


{% capture example %}{% raw %}
## foo = 'foofoofoo'

{{ foo | replace('foo', 'bar') }}

## Results in 'barbarbar'
{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="replace"
	signature="string | (string, string) -> string"
	description="
Replaces all occurrences of the first given string with the second within the piped string value.

<br>
<blockquote>
<b>Note:</b> The first argument is compiled as a regular expression with the global flag. Because
the Localization module does not treat <code>\</code> as a special character except in the raw text of a resource
body you do not need to double-escape within the regular expression as you would in the JavaScript
RegExp constructor.
</blockquote>
"
	example=example
%}

{% capture example %}{% raw %}
## foo = 'foofoofoo'

{{ foo | replaceOnce('foo', 'bar') }}

## Results in 'barfoofoo'
{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="replaceOnce"
	signature="string | (string, string) -> string"
	description="
Replaces the first occurrence of the first given string with the second within the piped string value.
<br>
<blockquote>
<b>Note:</b> The first argument is compiled as a regular expression. Because the Localization module
does not treat <code>\</code> as a special character except in the raw text of a resource body you do not need
to double-escape within the regular expression as you would in the JavaScript RegExp constructor.
</blockquote>
"
	example=example
%}


{% capture example %}{% raw %}
## foo = [{ foo: 'foo' }, { foo: 'bar' }, { foo: 'baz' }]

{{ foo | select('foo') | join(', ') }}

## Results in 'foo, bar, baz'
{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="select"
	signature="any[] | (string) -> any[]"
	description="Maps the piped array of objects to the value of their property represented by the given key"
	example=example
%}


{% capture example %}{% raw %}
## Slice the piped string, removing the first and last characters

##! foo: String
{{ foo | slice(1, -1) }}

## Slice the piped array, skipping the first 2 items, and take the first
## item from the resulting array

##! bar: any[]
{{ bar | slice(2) | first }}
{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="slice"
	signature="string / any[] | (number?, number?) -> string / any[]"
	description="Returns a slice of the piped string or array value"
	example=example
%}


{% capture example %}{% raw %}
## Split the given string and pick the first item from the resulting array

{{ foo | split(', ') | first }}
{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="split"
	signature="string | (string) -> string[]"
	description="Splits the piped string value into an array of substrings by the given separator"
	example=example
%}


{% capture example %}{% raw %}{{ foo | subtract(10) }}{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="subtract"
	signature="number | (number) -> number"
	description="Subtracts the given number value from the piped number value"
	example=example
%}


{% capture example %}{% raw %}{{ foo | toLowerCase }}{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="toLowerCase"
	signature="string | () -> string"
	description="Lowercases the entire piped string value"
	example=example
%}


{% capture example %}{% raw %}{{ foo | toUpperCase }}{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="toUpperCase"
	signature="string | () -> string"
	description="Uppercases the entire piped string value"
	example=example
%}


{% capture example %}{% raw %}{{ foo | trim }}{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="trim"
	signature="string | () -> string"
	description="Trims whitespace at both ends of the piped string value"
	example=example
%}

{% capture example %}{% raw %}{{ foo | trimLeft }}{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="trimLeft"
	signature="string | () -> string"
	description="Trims whitespace on the left side of the piped string value"
	example=example
%}

{% capture example %}{% raw %}{{ foo | trimRight }}{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="trimRight"
	signature="string | () -> string"
	description="Trims whitespace on the right side of the piped string value"
	example=example
%}


{% capture example %}{% raw %}
## Truncate to 10 characters with '...'

{{ foo | truncate(10) }}

## Truncate to 20 characters with custom filler

{{ foo | truncate(20, '-snip-') }}

## Truncate to 10 characters with no filler

{{ foo | truncate(10, '') }}
{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="truncate"
	signature="string | (number, string?) -> string"
	description="
Truncates the piped string value to the given number of characters and appends the given fill string,
or <code>'...'</code> if none is given. The string will not be truncated nor will the fill string be
appended if the given length is longer than the total length of the piped string value.
<br>
<blockquote>
<b>Note:</b> The fill string is included in the truncated length. If you want to truncate the string
to 20 characters before the fill string then you must specify 20 + the length of the fill string, so
23 for the default <code>'...'</code>.
<br><br>
The piped string can also be explicitly truncated to the specified length with no fill string simply
by passing an empty string as the fill string.
</blockquote>
"
	example=example
%}


{% capture example %}{% raw %}
##! foo: Any[]
{{ foo | unique }}
{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="unique"
	signature="&lt;T&gt; T[] | () -> T[]"
	description="Creates an array of all unique items from the piped array"
	example=example
%}


{% capture example %}{% raw %}
## Filter an array of objects for objects that have a "bar" property
## which holds a truthy value, then take the first item from the array

{{ foo | where("bar") | first }}

## Filter an array of objects for those that have a "foo" property
## that equals "bar", take the first item from the filtered array,
## and pick the value of "baz" from the resulting object

{{ foo | where("foo", "bar") | first | pick("baz") }}
{% endraw %}{% endcapture %}
{%
	include pipe_signature.html
	name="where"
	signature="&lt;T&gt; T[] | (string, primitive?) -> T[]"
	description="
Filters a piped array of objects by the given key. If the key on the object is truthy value (or
matches the second argument if given) then the item will be kept in the resulting array
"
	example=example
%}

> **Note:** This list may expand in the future.

## Escape Sequences
All of the `.lang` format-specific syntax can be escaped with `\` if you need to use something that
would otherwise be parsed as a resource key or template syntax. For example:

{% raw %}
```
[EXAMPLE_19]
\[NOT_A_KEY]
\{{ Not a template }}
```
{% endraw %}

Without escaping, the square braces would be interpreted as a key and throw a parse error, as the parser
expects to see a string body and not another key immediately after the `EXAMPLE_16` key. The template
would be otherwise parsed as a Regular Template with the key `Not a template`.

`.lang` files also support a few other escape sequences as well:
- `\t`
- `\n`
- `\u####` for unicode character insertion
  - Where each `#` is a hex digit

Any `\` found that does not match any of the escape sequences described here will be interpreted and
output as a literal `\` in the resource text.

## Afterword
Hopefully this guide serves to adequately describe the process of writing localization files. Again,
if you have any questions, feel free to ask for help on the Discord server.
