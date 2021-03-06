---
layout: 'guide'
title: 'Using the Localization Module'
menuOrder: 1
redirect_from:
  - /guides/default
---

# Using the Localization Module

## Foreword
This guide assumes you have already written at least one Localization file (`.lang` format) to load
and use in your code. If you have not, or are unsure how to go about doing so, please read
[*Writing Localization Files*](/localization/guides/writing_localization_files/) before continuing.

If anything is left unclear by the end of this don't be afraid to ask for help on the
[Discord server](#) if you need it.

*TODO: Make a new Discord server and update the above link*

## Getting started
First, you'll want to import the Localization module itself
```js
const { Localization } = require('@discord-samba/localization');
// or if you prefer TypeScript like I do:
// import { Localization } from '@discord-samba/localization';
```

There are two ways to load Localization files with the module. The first is
[`loadLangFile(language, file)`](/localization/docs/classes/localization.html#loadlangfile),
and the second is
[`loadFromDirectory(language, directory)`](/localization/docs/classes/localization.html#loadfromdirectory).

### `loadLangFile()`
`loadLangFile()` loads a single `.lang` file and registers it for the given language. Given some `.lang` files
like this:
```
locale/
|---en-US.lang
`---fr-FR.lang
```
You can load them like so:
```js
Localization.loadLangFile('en-US', './locale/en-US.lang');
Localization.loadLangFile('fr-FR', './locale/fr-FR.lang');
```

### `loadFromDirectory()`
`loadFromDirectory()` will load all `.lang` files in the given directory (including those within
subdirectories) and register them for the given language. `loadFromDirectory()` is the easier of
the two methods to use if you prefer splitting your localizations across multiple files for logical
organization. For example, given a directory structure like this:
```
locale/
|---en-US/
|   |---foo.lang
|   `---bar.lang
`---fr-FR/
    |---foo.lang
    `---bar.lang
```
You can load the files for each language like so:
```js
Localization.loadFromDirectory('en-US', './locale/en-US');
Localization.loadFromDirectory('fr-FR', './locale/fr-FR');
```
All `.lang` files from those directories will be loaded and any files that do not have the `.lang` file
extension will be ignored.

## Using Your Localizations
Given the standalone nature of the Localization module, in lieu of providing examples that utilize
localizations in real-world scenarios, all examples will simply log the localization output or save
it to variables to keep things generic, rather than assuming it will be used for Discord client purposes.

### Simple strings
Given a Localization file consisting of:
```
[EXAMPLE_1]
Foo bar baz

[cat(sub):EXAMPLE_2]
Boo far faz
```
that has already been loaded via any of the methods detailed in [Getting Started](#getting-started), we
can load the Localization string resources via
[`Localization.resource()`](/localization/docs/classes/localization.html#resource).

The first resource can be loaded like so:
```js
// We will assume for all examples the language is 'en-US'

console.log(Localization.resource('en-US', 'EXAMPLE_1'));
// Outputs 'Foo bar baz'
```
Because the first resource does not have a specified category or subcategory, it is assigned `'default'`
for both its category and subcategory when the `.lang` file is loaded.

Loading a resource with a category, or both category and subcategory, requires providing the fully qualified
path for the resource (language, category, and subcategory):
```js
console.log(Localization.resource(['en-US', 'cat', 'sub'], 'EXAMPLE_2'));
// Outputs 'Boo far faz'
```
Behind the scenes, `Localization.resource('en-US', 'EXAMPLE_1')` in the first example was treated as:
`Localization.resource(['en-US', 'default', 'default'], 'EXAMPLE_1')`

### Templated strings
Templated strings require the passing of an arguments object. Usage of template arguments within
Localization resources is detailed in [*Writing Localization Files*](/localization/guides/writing_localization_files/)
so you should already be familiar with how to use them.

Localization string resources accept a [`TemplateArguments`](/localization/docs/interfaces/templatearguments.html)
object via the third argument for the `Localization.resource()` method.

Appending to the Localization file from earlier:
{% raw %}
```
[EXAMPLE_3]
##! bar: Number
foo{{ bar }}baz
```
{% endraw %}
we can provide the template arguments like so:
```js
const templateArgs = { bar: 12 };
console.log(Localization.resource('en-US', 'EXAMPLE_3', templateArgs));
// Outputs 'foo12baz'
```

If a Localization resource has type declarations for its templates and the resource was given any values
of incorrect types a runtime error will be thrown detailing the error, as shown in
[this section](/localization/guides/writing_localization_files/#template-arguments) of *Writing Localization
Files*.

## Setting a Fallback Language
In the event that a resource [does not exist](/localization/docs/classes/localization.html#resourceexists)
for the given key, a generic resource will be returned:
```js
console.log(Localization.resource('en-US', 'INVALID_EXAMPLE'));
// Outputs 'en-US::default::default::INVALID_EXAMPLE'
```
This generic resource is encoded as `language::category::subcategory::resource_key`.


This can be viewed as a message to you, the developer, that you are missing localizations, as you
obviously cannot load a resource that does not exist. You can, however, provide a fallback language
which will allow the module to default to that language in the event that a resource does not exist.
This way, at least some output can be returned, even if it is not translated yet.

To set a fallback language, use the [`setFallbackLanguage()`](/localization/docs/classes/localization.html#setfallbacklanguage)
method:

```js
Localization.setFallbackLanguage('fr-FR');
```

In the event that a resource also does not exist in the fallback language, a generic resource will
still be returned as seen above. Again, seeing this generic output is a helpful indicator for you,
the developer, that you are missing a Localization resource that you are expecting to have.

## Using Resource Proxies
Loading Localization resources by hand can be a bit tedious if you are loading a lot of of them for
the same language, or the same language with the same category/subcategory. That's where
[LocalizationResourceProxy](/localization/docs/globals.html#localizationresourceproxy) comes in to make
your life easier.

You can create a resource proxy for any arbitrary resource path. These proxies allow you to easily
access the resource keys contained within that resource path as methods on the proxy. These methods
also accept `TemplateArguments` objects.

Let's use the example Localization file from [Simple Strings](#simple-strings). To create a resource
proxy, use the [`Localization.getResourceProxy()`](/localization/docs/classes/localization.html#getresourceproxy)
method:

```js
const proxy1 = Localization.getResourceProxy('en-US');
console.log(proxy1.EXAMPLE_1());
// Outputs 'Foo bar baz'
```

Proxies are cached, so `getResourceProxy()` will always return the same proxy instance for a given resource
path. The `getResourceProxy()` method behaves the same as `resource()` in that it accepts a language
string, or the fully qualified path (language, category, and subcategory). The proxy in the example above
is treated as though it is for the language `'en-US'`, with `'default'` category and `'default'` subcategory.

Using the same example Localization file as above, to create a proxy that can access the resource `EXAMPLE_2`,
you can do:
```js
const proxy2 = Localization.getResourceProxy(['en-US', 'cat', 'sub']);
console.log(proxy2.EXAMPLE_2());
// Outputs 'Boo far faz'
```

### Passing Template Arguments
Localization resource proxy methods optionally accept a template arguments object as their only argument.

```js
const proxy3 = Localization.getResourceProxy('en-US');
const templateArgs = { bar: 12 };
console.log(proxy3.EXAMPLE_3(templateArgs));
// Outputs 'foo12baz'
```

### Typescript Interop
Localization resource proxies (and really any Javascript `Proxy` in general) are a bit more finnicky
in Typescript because the Typescript compiler views a `Proxy` as an empty object. To combat this,
generally you would cast the proxy to another type and benefit from type hinting as if the proxy
were actually that type. `LocalizationResourceProxy` accepts a generic parameter that allows you to
pass in an object type that contains keys representing the resource keys of the language your proxy
points to, which will allow type hinting to display all the given keys as available methods on the proxy.

```js
interface Foo {
    EXAMPLE_1: any,
    EXAMPLE_3: any
}

// or `type Foo = { ... }`

const proxy4: LocalizationResourceProxy<Foo> =
    Localization.getResourceProxy('en-US');

console.log(proxy4.EXAMPLE_1());
// Outputs 'Foo bar baz'
```

You can also use an enum via `typeof`, which can save a bit of extra typing by not having to provide
member types on the interface/type. Personally, I prefer this method because I think it looks cleaner.
The above example can be rewritten like so:

```js
enum Foo {
    EXAMPLE_1,
    EXAMPLE_3
}

const proxy4: LocalizationResourceProxy<typeof Foo> =
    Localization.getResourceProxy('en-US');

console.log(proxy4.EXAMPLE_1());
// Outputs 'Foo bar baz'
```

Writing these types/interfaces/enums by hand could become tedious if you have a large number of resources.
The easiest solution would be to simply pass `any` for the `LocalizationResourceProxy` generic and
eliminate the problem right there. This of course provides no type-hinting for your resources which
are certainly helpful to have.

Another solution would be to write a script that automatically generates a file containing an exported
object populated with all of your resource keys. You can retrieve all loaded resource keys by using
[`Localization.getKeys()`](/localization/docs/classes/localization.html#getkeys) at runtime after
all of your localization resources have been loaded. You will want to create distinct objects for
specific categories and subcategories as well as they are all distinct subsets of the language you've
loaded and proxies targeting them represent those subsets with regards to the resources the proxy
has access to.

## Providing Custom Transformers
Transformer functions (detailed in
[*Writing Localization Files*](/localization/guides/writing_localization_files/#transformer-functions-pipes))
are useful for easily performing common transformations for your Localization data at runtime without
having to drop down into Script Templates to manually manipulate the data every time or having to
manipulate the data before passing it to the Localization resource.

Samba comes with a handful of base transformers but writing your own transformers can be desirable.

Providing custom transformers is done with the
[`Localization.addPipeFunction()`](/localization/docs/classes/localization.html#addpipefunction) method.
This method accepts a name string for the function which will be used in your Localization files to
specify the function to pipe data into, and the
[`LocalizationPipeFunction`](/localization/docs/globals.html#localizationpipefunction) itself which
must accept at least one argument (the piped-in value) of any type, and optionally may receive additional
arguments of types `string`, `number`, or `boolean` (the primitive type literals that exist within the
Localization "language"). This function can return anything given that it is meant to transform the
data in some way. Just be mindful of the return type of each function when chaining pipes.

```js
Localization.addPipeFunction('double', (pipeVal: number) => pipeVal * 2);
Localization.addPipeFunction('square', (pipeVal: number) => pipeVal * pipeVal);
```

This creates two transformers, `double` and `square`, which can be used like so:
{% raw %}
```
[EXAMPLE_4]
##! bar: Number
foo{{ bar | double }}baz
foo{{ bar | square }}baz
```
{% endraw %}
Using the example above and a template arguments object consisting of `{ bar: 5 }` you can expect the
resource to return `'foo10baz\nfoo25baz'`.

> **Note:** You should do your best to make sure your transformer functions are **pure**. Transformers
> should not have any side-effects. They should predictably produce the same results every time when
> given the same data.
