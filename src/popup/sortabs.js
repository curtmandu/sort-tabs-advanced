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

  return browser.tabs.query({
    highlighted : true,
    currentWindow : true
  }).then(
    (tabs) => {
      hint.hidden = false;
      hint.innerText = tabs.length > 1
        ? tabs.length.toString() + " tabs selected"
        : "Select two or more tabs first (Ctrl+click or Shift+click)";
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

      }, onError);
  });
