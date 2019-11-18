---
layout: 'guide'
title: 'Writing Localization Files'
menuOrder: 1
redirect_from:
  - /guides/default
---


# Writing Localization Files
If you've used YAMDBF, the predecessor to Sambo in the past, or more specifically its localization system,
this process will be familiar to you. That being said, there are some slight differences, and there's
a lot to go over for the sake of being thorough and presenting a well-documented process.

The Localization module operates on top of files with the `.lang` format. These files consist of string
resource declarations for any one arbitrary language (You will specify which language the file represents
when loading the file).

A language definition can be split across any arbitrary number of files; The string declarations will
all be cached for the specified language.

If a localization resource is loaded and has a key that already exists, it will overload the existing
string. This provides the ability to load a localization pack, and then replace any of its resources
as desired.

## Defining String Resources

Localization string resources are defined as key-value pairs within `.lang` files. The key itself must be
alpha-numeric, with underscores allowed. Whitespace is not allowed anywhere within the key declaration
syntax. Anything resembling a localization string resource key that is syntactically invalid will be
parsed as part of the previous string resource, or discarded as header comments if appearing as the first
item in a `.lang` file.

Localization string resource definition syntax is as follows:

```
Anything present above the first string resource will be discarded as header comments.
Comments can appear anywhere else within the .lang file via `##` syntax.

## example.lang
[KEY_1]
foo bar baz

[KEY_2]
boo far faz
```

This creates two keys, `KEY_1`, and `KEY_2`, when this file is loaded. Their content will consist of
`foo bar baz` and `boo far faz`, respectively. Localization resource content is trimmed when the resource
is recalled at runtime.

TODO: Detail categories and subcategories

# Templating
`.lang` files allow for more than just simple strings. String building would be a nightmare if interpolation
weren't possible. The Sambo Localization module provides variable interpolation functionality through
its templating syntax, which somewhat resembles Handlebars. There are a few different kinds of templates
to use within the localization resources:

 - Regular
 - Optional
 - Forward
 - Script

The different template kinds will be discussed later.

Templates operate on top of arguments passed to a string resource when it is called at runtime.

## Template Arguments
Template arguments are passed to localization resources as an object that maps argument names to argument
values. Any arguments not consumed via templates within the resource itself will be ignored when the
resource is assembled.

Arguments can be preemptively declared within a resource definition via `##!` syntax. This is a type-declaration
comment. This allows (or rather necessitates) specifying a type for the argument, which will be type-checked
at runtime. The allowed types are:

 - String
 - Number
 - Boolean
 - Any (Allows any type)
 - An array of any of the above
   - Denoted with `[]`, for example: `String[]`

For convenience, these types are case-insensitive, however the argument identifiers are not. Resource
type declarations follow the syntax of `ident: type`, or `ident?: type`, delimited by comma. Dangling
commas are not permitted and will throw a parser error when the containing file is loaded.

Identifiers ending in `?` denote optional arguments. These arguments are allowed to be omitted, and
should generally be associated with Optional Templates and Script Templates that provide handling
for undefined values. Arguments that do not have this optional specification will throw runtime errors
when the resource is loaded if a value matching the declared identifier is not present.

Here's an example of a localization resource that takes two arguments, one of which is optional and
used with an Optional Template (Optional Templates will be detailed later):

```{% raw %}
[EXAMPLE_1]
##! bar: String, baz?: Number
foo{{ bar }}{{? baz }}
```{% endraw %}

Argument type-declarations can be split accross multiple type-declarations if desired. This helps keep
line-length from getting out of hand if you have a particularly large set of arguments being passed to
a resource

```{% raw %}
[EXAMPLE_2]
##! bar: String
##! baz?: Number
foo{{ bar }}{{? baz }}
```{% endraw %}

Type-checking your arguments provides feedback to you, the programmer, so you can be sure you are
passing the correct data to your localization resources. If you encounter a runtime error due to
invalid types being passed, you can interpret this as a bug in your code. The Localization module
will give you a detailed report on what resource triggered the error and where you attempted to
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

## Regular Templates
Regular Templates are the simplest of the template kinds. Regular templates are equivalent to passing
a single variable to a Javascript template string. Regular templates use the syntax
{% raw %}`{{ argument_name }}`{% endraw %}.

For example:

```{% raw %}
[EXAMPLE_3]
foo{{ bar }}baz
```{% endraw %}

When the resource `EXAMPLE_3` is called, given an arguments object consisting of `{ bar: 'bar' }`,
the output will be `foobarbaz`.

Regular templates expect to always receive a value, and will interpolate `undefined` if given none,
so the above example would return `fooundefinedbaz` if given no `bar` argument. You should consider
this result an bug in your code and should diagnose why it is occurring.

If instead you intended to have a template that evaluates to nothing when no value is given, use an
Optional Template.

## Optional Templates
Optional Templates function like regular templates, except they evaluate to nothing when no matching
argument is given. Optional templates use the syntax {% raw %}`{{? argument_name }}`{% endraw %}.

```{% raw %}
[EXAMPLE_4]
foo{{? bar }}baz
```{% endraw %}

The above example will return `foobarbaz` when given an arguments object consisting of `{ bar: 'bar' }`,
but will return `foobaz` when given an arguments object that does not contain a value for `bar`.

Additionally, if an Optional Template is the only thing occupying a line and it is not fulfilled when
the resource is called, the line will not be preserved, provided there is no surrounding whitespace.

```{% raw %}
[EXAMPLE_5]
foo
{{? bar }}
baz

[EXAMPLE_6]
foo
{{? bar }} ## Note the space before this comment
baz
```{% endraw %}

In the example above, `EXAMPLE_5` will return `foo\nbaz`, whereas `EXAMPLE_6` will return `foo\n \nbaz`

## Forward Templates
Forward Templates provide an easy way for a localization resource to embed another localization resource.
Forward templates use the syntax {% raw %}`{{> resource_name }}`{% endraw %}.

```{% raw %}
[EXAMPLE_7]
bar

[EXAMPLE_8]
foo{{> EXAMPLE_7 }}baz
```{% endraw %}

Using the example above, calling resource `EXAMPLE_8` will return `foobarbaz`, because `EXAMPLE_7` has
been called as well via the forward template.

Arguments will be forwarded to the resource called by the forward template, so be sure to provide the
arguments for all resources that will be called when calling a resource containing forward templates.

```{% raw %}
[EXAMPLE_9]
bar{{ baz }}

[EXAMPLE_10]
foo{{> EXAMPLE_9 }}

```{% endraw %}

In the example above, `EXAMPLE_9` expects an argument called `baz`, so this must be passed when calling
`EXAMPLE_10` so that the argument may be forwarded to `EXAMPLE_9` when it is loaded as well.

**Note:** Forward templates cannot load any chain of forward templates that will eventually load its
own containing parent resource. This prevents infinite loops. You will receive an error when you attempt
to call a resource that does not adhere to this restriction.

Resources can also embed other resources via Script Templates, detailed later.

## Script Templates
TODO: Write-up on script templates