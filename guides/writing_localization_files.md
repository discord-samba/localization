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

Localization string resources are defined as key-value pairs within `.lang` files where the value is the
body containing all text between its key and the next, or the end of the file. The key itself must be
alpha-numeric with underscores allowed, and must be the first thing on a line. Whitespace is not allowed
anywhere within the key declaration syntax. Anything resembling a localization string resource key that
is syntactically invalid will be parsed as part of the previous string resource, or discarded as header
comments if appearing as the first item in a `.lang` file.

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
must be alpha-numeric with underscores allowed, and use the syntax `[category(subcategory):RESOURCE_KEY]`,
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
 - Forward
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

### Forward Templates
> Syntax: {% raw %}`{{> resource_name }}`{% endraw %}

Forward Templates provide an easy way for a localization resource to embed another localization resource.

{% raw %}
```
[EXAMPLE_7]
bar

[EXAMPLE_8]
foo{{> EXAMPLE_7 }}baz
```
{% endraw %}

Using the example above, calling resource `EXAMPLE_8` will return `'foobarbaz'`, because `EXAMPLE_7` has
been called as well via the forward template.

Arguments will be forwarded to the resource called by the forward template, so be sure to provide the
arguments for all resources that will be called when calling a resource containing forward templates.

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

> **Note:** Forward templates cannot call any chain of forward templates that will eventually load its
> own containing parent resource. This prevents infinite loops. You will receive an error when you attempt
> to call a resource that does not adhere to this restriction.

Resources can also embed other resources via Script Templates, detailed later.

### Script Templates
> Syntax: {% raw %}`{{! 'foo' + 'bar' + 'baz' !}}`{% endraw%}<br>
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
[EXAMPLE_11]
##! qty: Number
I have {{! args.qty === 1 ? 'an' : args.qty !}} apple{{! args.qty === 1 ? '' : 's' }}!
```
{% endraw %}

In the example above, you can see that resource arguments can be accessed within a script template via
`args`. Given the following values to `qty`, you can expect the following results:

|  arguments   |        result        |
| :----------: | :------------------: |
| `{ qty: 1 }` | `'I have an apple!'` |
| `{ qty: 2 }` | `'I have 2 apples!'` |

> **Tip:** For convenience, template arguments can also be used within script templates by prefixing
> them with `$`, rather than accessing them directly via `args`. The above example could be rewritten
> using `$`:
> 
> {% raw %}
> ```
> [EXAMPLE_11]
> ##! qty: Number
> I have {{! $qty === 1 ? 'an' : $qty !}} apple{{! $qty === 1 ? '' : 's' }}!
> ```
> {% endraw %}

In addition to `args`, script templates also receive `res` which is a
[`LocalizationResourceProxy`](/localization/docs/globals.html#localizationresourceproxy) that can be
used for loading other localization resources, similarly to, and as mentioned in
[Forward Templates](#forward-templates).

{% raw %}
```
[EXAMPLE_12]
##! qty: Number
Guess what? {{! res.EXAMPLE_11() !}}

## This is functionally identical to the following:
[EXAMPLE_13]
Guess what? {{> EXAMPLE_11 }}
```
{% endraw %}

> **Note:** Just like with forward templates, there is recursion protection in place for loading other
> localization resources via `res`. Also note that when calling other resources via `res`, you do not
> need to explicitly pass the arguments to the resource function. They are forwarded automatically.
> You can, however, pass an arguments object specific to that script template if desired.

As you may have noticed, simple script templates have their values returned implicitly. More complex,
multi-line script templates can be written as well, but you will need to explicitly return a value.

{% raw %}
```
[EXAMPLE_14]
##! foo: Number, bar: Number
foo{{!
    let a = $foo * 10;
    let b = $bar * 20;
    return a + b;
!}}baz
```
{% endraw %}

Given the example above and an arguments object consisting of `{ foo: 1, bar: 2 }` you can expect the
resource to return `'foo3baz'` when called.

If you recall in [Optional Templates](#optional-templates) we went over how optional templates isolated
on their own line without whitespace will not preserve the empty line if the argument is not satisfied.
Script templates present this same behavior when they return `undefined`.

{% raw %}
```
[EXAMPLE_15]
##! bar?: String
foo
{{! $bar !}}
baz
```
{% endraw %}

Given the example above and no arguments, you can expect the resource to return `'foo\nbaz'`. Just like
with optional templates, this behavior can be circumvented by returning an empty string (`''`).

## Escape Sequences
All of the `.lang` format-specific syntax can be escaped with `\` if you need to use something that
would otherwise be parsed as a resource key or template syntax. For example:

{% raw %}
```
[EXAMPLE_16]
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
