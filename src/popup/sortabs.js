/**
 * Sort tabs web extension
 */

/**
 * Sort criteria. Each one gets an ascending and a descending button,
 * with ids of the form "sort-by-<key>-asc" / "sort-by-<key>-desc"
 */
let sortDefs = [{
	key : "url",
	title : "URL",
	asc : "A to Z",
	desc : "Z to A"
}, {
	key : "domain",
	title : "Domain",
	asc : "A to Z",
	desc : "Z to A"
}, {
	key : "title",
	title : "Title",
	asc : "A to Z",
	desc : "Z to A"
}, {
	key : "last-access",
	title : "Last accessed",
	asc : "oldest first",
	desc : "newest first"
}, {
	key : "container",
	title : "Container",
	asc : "A to Z",
	desc : "Z to A"
}];

let settingsDefs = [{
	id : "settings-sort-selected",
	title : "Only selected tabs"
}, {
	id : "settings-sort-pinned",
	title : "Include pinned tabs"
}, {
	id : "settings-sort-auto",
	title : "Sort automatically"
}];


function onError(error) {
  console.trace(error);
}

function initializeSettings() {
    let defaultDict = settingsDefs.reduce(
        (acc, cur, idx, src) => Object.assign(acc, {[cur.id]: false}),
        {});

    // this is not part of the settingsDefs, but we want it here
    defaultDict["last-comparator"] = false;
    return browser.storage.local.get(defaultDict);
}

function clickHandler(button, settings) {
    let backgroundWindow = browser.runtime.getBackgroundPage();
    backgroundWindow.then(
        (w) => w.sortTabsComparatorName(button.id, settings))
		    .then(
            (tab) => {
                return browser.storage.local.set({
                    "last-comparator": button.id
                }).then(
				            () => {
                        document.querySelectorAll(".active").forEach(
                            (el) => {
                                el.classList.remove("active");
                                el.setAttribute("aria-pressed", "false");
                            });
                        button.classList.add("active");
                        button.setAttribute("aria-pressed", "true");
                    },
                    onError);
			      }, onError);
}

/**
 * Show a hint when "only selected tabs" is on
 * but fewer than two tabs are selected
 */
function updateSelectionHint(settings) {
  const hint = document.getElementById("selection-hint");

  if (!settings["settings-sort-selected"]) {
    hint.hidden = true;
    return Promise.resolve();
  }

  const scopeGroupId = settings["scope-group-id"];

  return browser.tabs.query({
    highlighted : true,
    currentWindow : true
  }).then(
    (tabs) => {
      if (scopeGroupId !== undefined) {
        tabs = tabs.filter((tab) => tab.groupId == scopeGroupId);
      }

      hint.hidden = false;
      hint.innerText = tabs.length > 1
        ? tabs.length.toString() + " tabs selected"
            + (scopeGroupId !== undefined ? " in this group" : "")
        : "Select two or more tabs"
            + (scopeGroupId !== undefined ? " in this group" : "")
            + " first (Ctrl+click or Shift+click)";
    }, onError);
}

function settingsClickHandler(evt, settings) {
  // keep the popup's copy of the settings current,
  // so that a toggle applies to the next sort without reopening the popup
  settings[evt.target.id] = evt.target.checked;
  updateSelectionHint(settings);
  let backgroundWindow = browser.runtime.getBackgroundPage();
  return backgroundWindow.then(
    (w) => w.settingChanged(evt));
}

function createDirectionButton(sortDef, direction, settings) {
  let button = document.createElement("button");
  let description = sortDef.title + ", "
      + (direction == "asc" ? "ascending" : "descending")
      + " (" + sortDef[direction] + ")";
  button.type = "button";
  button.id = "sort-by-" + sortDef.key + "-" + direction;
  button.className = "direction";
  button.innerText = direction == "asc" ? "↑" : "↓";
  button.title = description;
  button.setAttribute("aria-label", description);
  button.setAttribute("aria-pressed", "false");
  button.addEventListener(
    "click",
    (evt) => clickHandler(button, settings));

  if (button.id == settings["last-comparator"]) {
    button.classList.add("active");
    button.setAttribute("aria-pressed", "true");
  }

  return button;
}

function createSortRow(sortDef, settings) {
  let row = document.createElement("div");
  row.className = "row";
  let label = document.createElement("span");
  label.className = "row-label";
  label.innerText = sortDef.title;
  row.appendChild(label);
  row.appendChild(createDirectionButton(sortDef, "asc", settings));
  row.appendChild(createDirectionButton(sortDef, "desc", settings));
  return row;
}

function createSettingsToggle(settingDef, settings) {
  let label = document.createElement("label");
  label.className = "row toggle";
  let checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = settingDef.id;
  checkbox.name = settingDef.id;
  checkbox.checked = settings[settingDef.id];
  let text = document.createElement("span");
  text.innerText = settingDef.title;

  label.appendChild(checkbox);
  label.appendChild(text);
  checkbox.addEventListener(
    "click",
    (evt) => settingsClickHandler(evt, settings));
  return label;
}

/**
 * The tab groups of the current window in strip order,
 * as { id, title, color, count }. Empty if there are none.
 */
function loadGroups() {
  if (!browser.tabGroups) {
    return Promise.resolve([]);
  }

  return browser.tabs.query({
    currentWindow : true
  }).then(
    (tabs) => {
      const counts = new Map();
      tabs.sort((a, b) => a.index - b.index);

      for (const tab of tabs) {
        if (tab.groupId !== undefined && tab.groupId != -1) {
          counts.set(tab.groupId, (counts.get(tab.groupId) || 0) + 1);
        }
      }

      if (counts.size == 0) {
        return [];
      }

      return browser.tabGroups.query({
        windowId : tabs[0].windowId
      }).then(
        (groups) => Array.from(counts.keys()).map(
          (id) => {
            const group = groups.find((g) => g.id == id) || {};
            return {
              id : id,
              title : (group.title || "").trim(),
              color : group.color || "",
              count : counts.get(id)
            };
          }));
    }).catch(
      (error) => {
        onError(error);
        return [];
      });
}

function groupLabel(group) {
  const name = group.title
      || ("Unnamed " + group.color + " group").replace("  ", " ");
  return name + " (" + group.count.toString()
      + (group.count == 1 ? " tab)" : " tabs)");
}

/**
 * Dropdown choosing what the sort buttons apply to:
 * all tabs, or the tabs of one group
 */
function createScopePicker(groups, settings) {
  let row = document.createElement("label");
  row.className = "row scope";
  let text = document.createElement("span");
  text.innerText = "Sort within";
  let select = document.createElement("select");
  select.id = "scope-group";

  let all = document.createElement("option");
  all.value = "";
  all.innerText = "All tabs";
  select.appendChild(all);

  groups.forEach(
    (group) => {
      let option = document.createElement("option");
      option.value = group.id.toString();
      option.innerText = groupLabel(group);
      select.appendChild(option);
    });

  select.addEventListener(
    "change",
    (evt) => {
      settings["scope-group-id"] = select.value === ""
        ? undefined
        : Number(select.value);
      updateSelectionHint(settings);
    });

  row.appendChild(text);
  row.appendChild(select);
  return row;
}

/**
 * Row for sorting the groups themselves by name
 */
function createGroupsRow() {
  let row = document.createElement("div");
  row.className = "row";
  let label = document.createElement("span");
  label.className = "row-label";
  label.innerText = "By name";
  row.appendChild(label);

  [["asc", "\u2191", "A to Z"], ["desc", "\u2193", "Z to A"]].forEach(
    ([direction, arrow, meaning]) => {
      let button = document.createElement("button");
      let description = "Order groups by name, "
          + (direction == "asc" ? "ascending" : "descending")
          + " (" + meaning + ")";
      button.type = "button";
      button.id = "sort-groups-" + direction;
      button.className = "direction";
      button.innerText = arrow;
      button.title = description;
      button.setAttribute("aria-label", description);
      button.addEventListener(
        "click",
        (evt) => browser.runtime.getBackgroundPage().then(
          (w) => w.sortGroupsByName(direction), onError));
      row.appendChild(button);
    });

  return row;
}

function createGroupControls(groups, settings) {
  if (groups.length == 0) {
    return;
  }

  document.getElementById("scope").appendChild(
    createScopePicker(groups, settings));

  if (groups.length > 1) {
    let cont = document.getElementById("groups");
    let heading = document.createElement("h1");
    heading.innerText = "Order groups";
    cont.appendChild(heading);
    cont.appendChild(createGroupsRow());
  }
}

function createPopup(settings) {
  let cont = document.getElementById("options");
  sortDefs.forEach(
    (sortDef) => cont.appendChild(createSortRow(sortDef, settings)));

  let settingsCont = document.getElementById("settings");
  settingsDefs.forEach(
    (def) => settingsCont.appendChild(createSettingsToggle(def, settings)));

  const hint = document.createElement("div");
  hint.id = "selection-hint";
  hint.hidden = true;
  settingsCont.appendChild(hint);
  updateSelectionHint(settings);
}

/**
 * init
 */
document.addEventListener(
  "DOMContentLoaded",
  (evt) => {
    initializeSettings().then(
      (settings) => {
          createPopup(settings);
          return loadGroups().then(
            (groups) => createGroupControls(groups, settings));

      }, onError);
  });
