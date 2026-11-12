# Sort Selected Tabs

A Firefox add-on for sorting tabs. It sorts the whole window, the tabs you've selected, the tabs in one group, or the groups themselves.

## What it sorts by

Each of these has an ascending (↑) and a descending (↓) button in the popup:

| Sort by | ↑ | ↓ |
| --- | --- | --- |
| URL | A to Z | Z to A |
| Domain | A to Z | Z to A |
| Title | A to Z | Z to A |
| Last accessed | oldest first | newest first |
| Container | A to Z | Z to A |

The button you used last stays highlighted.

## Sorting only selected tabs

1. Select the tabs you want sorted with Ctrl+click or Shift+click on the tab strip.
2. Open the popup and tick "Only selected tabs".
3. Click a sort button.

The selected tabs swap places with each other. The rest don't move.

* With fewer than two tabs selected, nothing happens, and the popup says so.
* The add-on sorts selected pinned tabs only if you also tick "Include pinned tabs".
* Selected tabs inside a tab group stay in that group. The add-on sorts them among themselves.

## Tab groups

When the window has tab groups, the popup shows two more controls.

"Sort within" chooses what the sort buttons apply to: all tabs, or the tabs of one group. Choose a group and the buttons sort only that group's tabs. If you also tick "Only selected tabs", they sort only the selected tabs in that group.

"Order groups" appears when there are two or more groups, and sorts the groups themselves by name. Groups swap places with each other, so any ungrouped tabs between them stay where they were. Groups without a name go last.

When you sort all tabs, groups stay where they are. The add-on sorts each group's tabs inside the group, and sorts each run of ungrouped tabs between groups on its own.

## Options

The popup has three checkboxes. "Only selected tabs" limits a sort to the tabs you've selected.

"Include pinned tabs" lets a sort move pinned tabs, which the add-on otherwise leaves alone. It always sorts them separately from the rest.

"Sort automatically" repeats the last sort you used whenever a tab opens or changes, and stays on after you restart Firefox. It pauses while "Only selected tabs" is ticked, so tabs you drag by hand stay put.

## Privacy

The add-on collects no data and makes no network requests. Firefox stores your settings locally.

## Development

It's plain JavaScript, so there's nothing to compile. To lint and package it:

```bash
npx web-ext lint --source-dir=src
```

```bash
npx web-ext build --source-dir=src --artifacts-dir=build --overwrite-dest
```

The tests run each sort mode against a simulated tab strip that moves tabs and groups the way Firefox does:

```bash
node test/sort.test.js
```

To try it in Firefox, open `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on" and choose `src/manifest.json`.

## Credits and license

Sort Selected Tabs is a fork of [Sort tabs advanced](https://github.com/monomon/sort-tabs-advanced) by Mois Moshev. It is a separate add-on with its own name and add-on ID, and is not affiliated with the original.

The license is the Mozilla Public License 2.0, the same as the original. See [LICENSE](LICENSE).
