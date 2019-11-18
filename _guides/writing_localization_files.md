---
layout: 'guide'
title: 'Writing Localization Files'
menuOrder: 1
redirect_from:
  - /guides/default
---


# Writing Localization Files
If you've used YAMDBF, the predecessor to Sambo in the past, or more specifically its localization system,
this process will be familiar to you. That being said, there's a lot to go over for the sake of being
thorough and presenting a well-documented process.

The Localization module operates on top of files with the .lang format. These files consist of string
resource declarations for any one arbitrary language (You will specify which language the file represents
when loading the file). A language definition can be split across any arbitrary number of files; The
declarations will all be cached for the specified language. If a localization resource is loaded and
has a key that has already beed loaded, it will overload the previously loaded string. This provides
the ability to load a localization pack, and then replace any of its resources as desired.

TODO: The rest of the guide