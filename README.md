# Sort Selected Tabs

A fork of [Sort tabs advanced](https://github.com/monomon/sort-tabs-advanced)
by Mois Moshev ([original on AMO](https://addons.mozilla.org/firefox/addon/sort-tabs-advanced/)).
This fork adds the option to sort only the tabs you have selected.
It is a separate add-on with its own name and add-on ID, and is not affiliated with the original.

Licensed under the Mozilla Public License 2.0, like the original (see `LICENSE`).

Web extension for sorting tabs by various criteria:

* url
* domain
* title
* last time of access
* container

I found myself frustrated that it's not possible to sort tabs by domain in Firefox 57.

Then, I discovered that sorting tabs by access time is kinda useful.
You can push the tabs you use often to the top, sinking old ones saved for later.

There are switches in the popup that allow toggling automatic sorting, pinned tab sorting and sorting only the selected tabs.

## Sorting only selected tabs

Select several tabs (Ctrl+click or Shift+click on the tab strip), open the popup,
tick "sort only selected tabs" and pick a sorting method.

* Only the selected tabs move. They trade places among the positions they already occupy; every other tab stays where it is.
* With fewer than two tabs selected, nothing is sorted.
* Selected pinned tabs are sorted only if "sort pinned tabs" is also ticked.
* Selected tabs in a tab group are sorted within that group.
* Automatic sorting is paused while "sort only selected tabs" is ticked.

## Tab groups

When the window has tab groups, the popup shows two extra controls:

* "Sort within" picks what the sort buttons apply to: all tabs, or the tabs of one group. With a group picked, only that group's tabs are sorted. Combined with "Only selected tabs", only the selected tabs in that group are sorted.
* "Order groups" (shown with two or more groups) sorts the groups themselves by name. Groups trade places among the spots groups already occupy; ungrouped tabs stay between the same groups as before. Unnamed groups go last.

## Automatic sorting

The last sorting method that you selected gets remembered in settings.

If automatic sorting is enabled, this sorting method will be applied every time you change tabs (create new, change url, etc.).

Automatic sorting is preserved between browser restarts.

## Tab groups when sorting all tabs

The addon preserves tab groups.

"Islands" of tab groups, surrounded by ungrouped tabs, are preserved. The ungrouped tabs before and after the group are sorted separately.

## Building the extension

Run `build.sh`, which uses `web-ext`.

## Tests

Run `node test/sort.test.js`. It runs every sort mode against a simulated tab strip that follows Firefox's rules for moving tabs and groups.
