/**
 * Comparison functions
 */
function compareByUrlAsc(a, b) {
    return a.url.localeCompare(b.url);
}

function compareByUrlDesc(a, b) {
    return b.url.localeCompare(a.url);
}

function compareByDomainAsc(a, b) {
    let url1 = new URL(a.url);
    let url2 = new URL(b.url);

    let domain1 = url1.hostname
        .split(".")
        .slice(-2)
        .join(".");
    let domain2 = url2.hostname
        .split(".")
        .slice(-2)
        .join(".");

    return domain1.localeCompare(domain2);
}

function compareByDomainDesc(a, b) {
    let url1 = new URL(a.url);
    let url2 = new URL(b.url);

    let domain1 = url1.hostname
        .split(".")
        .slice(-2)
        .join(".");
    let domain2 = url2.hostname
        .split(".")
        .slice(-2)
        .join(".");

    return domain2.localeCompare(domain1);
}

function compareByTitleAsc(a, b) {
    return a.title.localeCompare(b.title);
}

function compareByTitleDesc(a, b) {
    return b.title.localeCompare(a.title);
}

function compareByLastAccessAsc(a, b) {
    if (a.lastAccessed < b.lastAccessed) {
        return -1;
    } else if (a.lastAccessed > b.lastAccessed) {
        return 1;
    } else {
        return 0;
    }
}

function compareByLastAccessDesc(a, b) {
    if (b.lastAccessed < a.lastAccessed) {
        return -1;
    } else if (b.lastAccessed > a.lastAccessed) {
        return 1;
    } else {
        return 0;
    }
}

function compareByContainerAsc(a, b) {
    if (a.cookieStoreId < b.cookieStoreId) {
        return -1;
    } else if (a.cookieStoreId > b.cookieStoreId) {
        return 1;
    } else {
        return 0;
    }
}

function compareByContainerDesc(a, b) {
    if (b.cookieStoreId < a.cookieStoreId) {
        return -1;
    } else if (b.cookieStoreId > a.cookieStoreId) {
        return 1;
    } else {
        return 0;
    }
}

function onSettingsSortAuto(evt) {
  if (evt.target.checked) {
    browser.tabs.onUpdated.addListener(settingsSortAutoHandler);
    browser.tabs.onCreated.addListener(settingsSortAutoHandler);
  } else {
    browser.tabs.onUpdated.removeListener(settingsSortAutoHandler);
    browser.tabs.onCreated.removeListener(settingsSortAutoHandler);
  }

  return Promise.resolve();
}

function onSettingsSortPinned(evt) {
  return Promise.resolve();
}

function onSettingsSortSelected(evt) {
  return Promise.resolve();
}

let menuIdToComparator = {
    "sort-by-url-asc" : compareByUrlAsc,
    "sort-by-url-desc" : compareByUrlDesc,
    "sort-by-domain-asc" : compareByDomainAsc,
    "sort-by-domain-desc" : compareByDomainDesc,
    "sort-by-last-access-asc" : compareByLastAccessAsc,
    "sort-by-last-access-desc" : compareByLastAccessDesc,
    "sort-by-title-asc" : compareByTitleAsc,
    "sort-by-title-desc" : compareByTitleDesc,
    "sort-by-container-asc" : compareByContainerAsc,
    "sort-by-container-desc" : compareByContainerDesc,
};

let settingsMenuIdToHandler = {
  "settings-sort-auto": onSettingsSortAuto,
  "settings-sort-pinned": onSettingsSortPinned,
  "settings-sort-selected": onSettingsSortSelected
};

function sortTabsComparatorName(compName, settings) {
  return sortTabs(menuIdToComparator[compName], settings);
}

const defaultSettings = {
    "last-comparator": undefined,
    "settings-sort-auto": false,
    "settings-sort-pinned": false,
    "settings-sort-selected": false
}

function settingsSortAutoHandler(tabId, changeInfo, tabInfo) {
  browser.storage.local.get(defaultSettings).then(
    (settings) => {
      // sorting a selection is a one-off action: never repeat it automatically,
      // otherwise tabs dragged by hand would snap back while a selection is active
      if (settings["settings-sort-selected"]) {
        return;
      }

      if (menuIdToComparator[settings["last-comparator"]] !== undefined) {
        return sortTabs(menuIdToComparator[settings["last-comparator"]], settings);
      }
    }, onError);
}

const NO_GROUP = -1;

/**
 * All tabs of the current window in strip order, split into pinned and normal
 */
function queryWindowTabs() {
    return browser.tabs.query({
        currentWindow : true
    }).then(
        (ts) => {
            ts.sort((a, b) => a.index - b.index);
            ts.forEach((t) => {
                // older Firefox versions have no tab groups
                if (t.groupId === undefined) {
                    t.groupId = NO_GROUP;
                }
            });

            return {
                pinned : ts.filter((t) => t.pinned),
                normal : ts.filter((t) => !t.pinned)
            };
        });
}

/**
 * Reorder some of the tabs, leaving the rest where they are.
 * The tabs picked by isMovable trade places among the positions they already
 * occupy. Tabs only trade places within the same tab group,
 * so groups are preserved.
 * Takes tabs in strip order and returns them in the new order.
 */
function arrangeMovable(tabs, comparator, isMovable) {
    const byGroup = new Map();

    tabs.forEach((tab, position) => {
        if (!isMovable(tab)) {
            return;
        }

        if (!byGroup.has(tab.groupId)) {
            byGroup.set(tab.groupId, { positions : [], tabs : [] });
        }

        byGroup.get(tab.groupId).positions.push(position);
        byGroup.get(tab.groupId).tabs.push(tab);
    });

    const result = tabs.slice();

    for (const bucket of byGroup.values()) {
        bucket.tabs.sort(comparator);
        bucket.positions.forEach((position, i) => {
            result[position] = bucket.tabs[i];
        });
    }

    return result;
}

/**
 * Move tabs so that the strip goes from the order in current to the order
 * in wanted. Both hold the same tabs, with every group contiguous.
 * base is the strip index of the first tab.
 *
 * Tabs are placed one by one, left to right, so every move is to the left
 * and everything before the tab being placed is already final.
 * Firefox puts a moved tab into the group of the tab it lands in front of,
 * so the moves are chosen to keep each tab's group:
 * - the first tab of a group brings the whole group along (tabGroups.move)
 * - other grouped tabs always land in front of a tab of their own group
 * - an ungrouped tab landing in front of a group is taken out of it again;
 *   being first in the group, it ends up just before the group
 */
async function applyOrder(current, wanted, base) {
    const cur = current.slice();

    for (let i = 0; i < wanted.length; i++) {
        const tab = wanted[i];

        if (cur[i].id == tab.id) {
            continue;
        }

        const startsGroup = tab.groupId != NO_GROUP
              && (i == 0 || wanted[i - 1].groupId != tab.groupId);

        if (startsGroup) {
            const first = cur.findIndex((t) => t.groupId == tab.groupId);

            if (first != i) {
                const members = cur.filter((t) => t.groupId == tab.groupId);
                await browser.tabGroups.move(tab.groupId, { index : base + i });
                cur.splice(first, members.length);
                cur.splice(i, 0, ...members);
            }

            if (cur[i].id == tab.id) {
                continue;
            }
        }

        const landsInGroup = cur[i].groupId != NO_GROUP;
        await browser.tabs.move(tab.id, { index : base + i });

        if (tab.groupId == NO_GROUP && landsInGroup) {
            await browser.tabs.ungroup(tab.id);
        }

        cur.splice(cur.findIndex((t) => t.id == tab.id), 1);
        cur.splice(i, 0, tab);
    }
}

/**
 * Sort only part of the tabs: the selected (highlighted) ones,
 * the ones in a given group, or the selected ones in a given group
 */
function sortSomeTabs(comparator, settings) {
    const scopeGroupId = settings["scope-group-id"];
    const onlySelected = settings["settings-sort-selected"];
    const isMovable = (tab) =>
          (scopeGroupId === undefined || tab.groupId == scopeGroupId)
          && (!onlySelected || tab.highlighted);

    return queryWindowTabs().then(
        (ts) => {
            // the active tab always counts as selected,
            // so a single movable tab means there is nothing to sort
            if (ts.pinned.concat(ts.normal).filter(isMovable).length < 2) {
                console.log("Fewer than two tabs to sort, not sorting");
                return;
            }

            const newPinned = settings["settings-sort-pinned"]
                  ? arrangeMovable(ts.pinned, comparator, isMovable)
                  : ts.pinned;
            const newNormal = arrangeMovable(ts.normal, comparator, isMovable);

            return applyOrder(ts.pinned, newPinned, 0).then(
                () => applyOrder(ts.normal, newNormal, ts.pinned.length));
        }).catch(onError);
}

/**
 * Sort the tab groups themselves by name.
 * The groups trade places among the spots that groups already occupy,
 * ungrouped tabs stay between the same groups as before.
 * Unnamed groups go last.
 */
function sortGroupsByName(direction) {
    return queryWindowTabs().then(
        (ts) => {
            const groupIds = [];

            for (const tab of ts.normal) {
                if (tab.groupId != NO_GROUP && !groupIds.includes(tab.groupId)) {
                    groupIds.push(tab.groupId);
                }
            }

            if (groupIds.length < 2) {
                console.log("Fewer than two groups, not sorting");
                return;
            }

            return browser.tabGroups.query({
                windowId : ts.normal[0].windowId
            }).then(
                (groups) => {
                    const titles = new Map(
                        groups.map((g) => [g.id, (g.title || "").trim()]));
                    const sign = direction == "desc" ? -1 : 1;
                    const sortedIds = groupIds.slice().sort(
                        (a, b) => {
                            const titleA = titles.get(a) || "";
                            const titleB = titles.get(b) || "";

                            if (!titleA || !titleB) {
                                return (titleA ? 0 : 1) - (titleB ? 0 : 1);
                            }

                            return sign * titleA.localeCompare(
                                titleB,
                                undefined,
                                { numeric : true, sensitivity : "base" });
                        });

                    const wanted = [];
                    let spot = 0;

                    ts.normal.forEach((tab, i) => {
                        if (tab.groupId == NO_GROUP) {
                            wanted.push(tab);
                        } else if (i == 0 || ts.normal[i - 1].groupId != tab.groupId) {
                            const groupId = sortedIds[spot++];
                            wanted.push(...ts.normal.filter((t) => t.groupId == groupId));
                        }
                    });

                    return applyOrder(ts.normal, wanted, ts.pinned.length);
                });
        }).catch(onError);
}

function sortTabs(comparator, settings) {
    if (settings["settings-sort-selected"]
        || settings["scope-group-id"] !== undefined) {
        return sortSomeTabs(comparator, settings);
    }

    let num_pinned = 0;
    return browser.tabs.query({
        pinned : true,
        currentWindow : true
    }).then(
        (pinnedTabs) => {
            num_pinned = pinnedTabs.length;

            if (settings["settings-sort-pinned"]) {
                console.log("Sorting pinned: " + num_pinned.toString());
                pinnedTabs.sort(comparator);
                return browser.tabs.move(
                    pinnedTabs.map((tab) => { return tab.id; }),
                    { index : 0 });
            } else {
                return [];
            }
        }, onError).then(

            (_) => {
                return browser.tabs.query({
                    pinned : false,
                    currentWindow : true
                }).then(
                    (ts) => {
                        // Chunk all tabs from given groups together
                        // Sort each chunk
                        // Then move the tabs

                        console.log("Sorting normal " + ts.length.toString());
                        const groupBoundaries = [0];

                        for (let i = 1; i < ts.length; i++) {
                            if (ts[i].groupId != ts[i - 1].groupId) {
                                groupBoundaries.push(i);
                            }
                        }

                        // Add end - slice range is non-inclusive
                        groupBoundaries.push(ts.length);
                        const groupChunks = [];

                        for (let i = 1; i < groupBoundaries.length; i++) {
                            groupChunks.push(ts.slice(groupBoundaries[i - 1], groupBoundaries[i]));
                        }

                        for (chunk of groupChunks) {
                            chunk.sort(comparator);
                        }

                        const newTabIds = groupChunks.flat().map((t) => t.id);

                        return browser.tabs.move(
                            newTabIds,
                            { index : num_pinned });
                    }, onError);

            }, onError);
}

function settingChanged(evt) {
    return settingsMenuIdToHandler[evt.target.id](evt)
        .then(
            (e) => {
                return browser.storage.local.set({
                    [evt.target.id]: evt.target.checked
                });
            }, onError);
}

function onError(error) {
  console.trace(error);
}

function startup() {
    browser.storage.local.get(defaultSettings).then(
        (settings) => {
            if (settings["settings-sort-auto"]) {
                console.log("Turning on autosort on startup");
                browser.tabs.onUpdated.addListener(settingsSortAutoHandler);
                browser.tabs.onCreated.addListener(settingsSortAutoHandler);
            }
        });
}

browser.runtime.onStartup.addListener(startup);
