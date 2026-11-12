# Sort Selected Tabs

A Firefox add-on for sorting tabs. It can sort the whole window, but it can also sort only the tabs you've selected, only the tabs in one group, or the groups themselves.

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
* Selected pinned tabs are sorted only if "Include pinned tabs" is also ticked.
* Selected tabs inside a tab group are sorted within that group and stay in it.

## Tab groups

When the window has tab groups, the popup shows two more controls.

**Sort within** chooses what the sort buttons apply to: all tabs, or the tabs of one group. With a group chosen, only that group's tabs are sorted. If "Only selected tabs" is also ticked, only the selected tabs in that group are sorted.

**Order groups** appears when there are two or more groups, and sorts the groups themselves by name. Groups swap places with each other, so any ungrouped tabs between them stay where they were. Groups without a name go last.

When sorting all tabs, groups stay where they are. Each group's tabs are sorted inside the group, and each run of ungrouped tabs between groups is sorted on its own.

## Options

* **Only selected tabs**: described above.
* **Include pinned tabs**: pinned tabs are left alone unless this is ticked. Pinned tabs are always sorted separately from the rest.
* **Sort automatically**: repeats the last sort you used whenever a tab is opened or changes. The setting survives browser restarts. It is paused while "Only selected tabs" is ticked, so tabs you drag by hand stay put.

## Privacy

The add-on collects no data and makes no network requests. Your settings are stored locally in Firefox.

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

Licensed under the Mozilla Public License 2.0, the same license as the original. See [LICENSE](LICENSE).
