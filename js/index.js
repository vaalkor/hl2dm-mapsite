'use strict';

var CONSTANTS = {
    NO_RATING_MIN_RATING_VALUE: -0.5,
    PAGE_SIZE: 50
}
var IGNORE_LABELS = ['UT', 'Quake', 'MissingTextures', 'Incomplete', 'Indoors', 'Outdoors', 'HL1', 'NoTripmines'] // Labels to exclude from the filtering component
var ALL_WEAPONS = [
    "357",
    "alyxgun",
    "annabelle",
    "ar2",
    "assaultrifle",
    "awp",
    "brickbat",
    "bugbait",
    "crossbow",
    "crowbar",
    "deagle",
    "flashbang",
    "frag",
    "gauss",
    "glock",
    "grenade",
    "hegrenade",
    "HEGrenade",
    "knife",
    "m249",
    "m4a1",
    "mac10",
    "p228",
    "physcannon",
    "physgun",
    "pistol",
    "pistol_45acp",
    "pistol_50ae",
    "pistol_9mm",
    "revolver",
    "rpg",
    "sawnoff",
    "shotgun",
    "slam",
    "slamer",
    "smg1",
    "smokegrenade",
    "sniperrifle",
    "stunstick",
    "submachinegun",
    "xm1014"
];
// These are the standard map weapon entities. I only want to allow filtering based on these. The non standard entities would just clog up the filtering UI.
var FILTER_WEAPONS = [
    "357",
    "ar2",
    "crossbow",
    "frag",
    "rpg",
    "shotgun",
    "slam"
];
var ROUTES = {
    ratingsTable: "/",
    submittersTable: "/submitters",
    mapDetailsModal: "/mapdetails"
}
var _ratingsTableSortByProperties = [
    { propertyName: 'RobRating', friendlyName: 'Rating' },
    { propertyName: 'InitialRatingTimestamp', friendlyName: 'First Rated' },
    { propertyName: 'Added', friendlyName: 'First Submitted to Gamebanana' }
];

var _submittersTableSortByProperties = [
    { propertyName: 'averageRating', friendlyName: 'Average Rating' },
    { propertyName: 'totalRatedOrCrashedMaps', friendlyName: '# of maps rated' },
    { propertyName: 'totalMaps', friendlyName: '# of maps submitted' }
];
var _submitters = [];
var _toastMessages = {
    currentKey: 0,
    messages: [],
    addMessage: function (message, showLengthMilliseconds) {
        const key = this.currentKey;
        this.messages.push({ key: this.currentKey, message: message });
        setTimeout(() => {
            console.log(`Removing message with key: ${key} from messages list.`)
            let idx = this.messages.findIndex(toast => toast.key === key);
            this.messages.splice(idx, 1);
            m.redraw();
        }, showLengthMilliseconds);
        this.currentKey++;
    }
}
var _filteredMaps = [];

var _ratingsTableFilterTempValues = Object.assign({}, _storage); // Clone the stored values. This will be used to store temp values for the stateful

var _storage = {
    // Ratings table filter values
    currentPage: 1,
    nameFilter: '',
    submitterFilter: '',
    minRating: 0,
    includeLabels: [],
    excludeLabels: ['NeverLoads', 'CausesCrash'],
    includeWeapons: [],
    excludeWeapons: [],
    sortBy: _ratingsTableSortByProperties[0].propertyName,
    ratingsTableAscending: false,
    // Submitters table filter properties
    submitterSortBy: _submittersTableSortByProperties[0].propertyName,
    submittersTableAscending: false,
    // Other values
    ratingsTableVisible: true,
    submittersTableVisible: false,

    loadFromLocalStorage: function () {
        const savedData = localStorage.getItem('storage');
        if (savedData) {
            Object.assign(this, JSON.parse(savedData));
            _ratingsTableFilterTempValues = JSON.parse(savedData); // We clone the values so we can keep our temp filter object up to date. Now we have a 2 step filter application process we need a saved value and a stateful temp value. 
        }
    },
    save: function () {
        localStorage.setItem('storage', JSON.stringify(this));
        _ratingsTableFilterTempValues = JSON.parse(JSON.stringify(this)); // We clone the values so we can keep our temp filter object up to date. Now we have a 2 step filter application process we need a saved value and a stateful temp value. 
    },
    showRatingsTable: function () {
        this.ratingsTableVisible = true;
        this.submittersTableVisible = false;
        this.save();
    },
    showSubmittersTable: function () {
        this.ratingsTableVisible = false;
        this.submittersTableVisible = true;
        this.save();
    }
}

// [TODO] get rid of this global variable and clean up the modal code a bit. Now that we have routing it's a little bit tidier in general.
var _modalMapInfo = null; // The map info we have a modal open for.
var _scrapeData = { MapInfo: [], MapRatingGraphData: [] };
var _foundLabels = {};
var _defaultLabel = 'label-blue';
var _labelColourMap = {
    'NeverLoads': 'label-black',
    'CausesCrash': 'label-black',
    'NoTripmines': 'label-yellow',
    'Incomplete': 'label-yellow',
    'Small': 'label-green',
    'Medium': 'label-yellow',
    'Large': 'label-red',
    'TooBig': 'label-red',
    'Meme': 'label-purple'
}
var _foundLabels = [];
var _dayPrettyPrint = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' }
var _monthPrettyPrint = { 0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr', 4: 'May', 5: 'Jun', 6: 'Jul', 7: 'Aug', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec' }

var getLabelColour = label => (label in _labelColourMap) ? _labelColourMap[label] : _defaultLabel;

function getAndSetElemValue(key) {
    let val = window.localStorage.getItem(key);
    if (val !== null && val !== undefined) $(key).value = val;
}

function openModal(map) {
    let currentParams = m.route.param();
    currentParams.id = map.Id;
    m.route.set(ROUTES.mapDetailsModal, currentParams);
}

function closeModal() {
    if (!_modalMapInfo) return;

    let currentParams = m.route.param();
    delete currentParams.id; // If we have the model open, the current params will have a map id parameter.
    m.route.set(ROUTES.ratingsTable, currentParams);
}

function sortFilteredMaps(a, b) {
    if (_storage.sortBy == null) return a;
    let sortOrder = _storage.ratingsTableAscending ? -1 : 1;
    return (a[_storage.sortBy] || 0) > (b[_storage.sortBy] || 0) ? -1 * sortOrder : 1 * sortOrder;
}

function sortSubmitters(a, b) {
    if (_storage.submitterSortBy == null) return a;
    let sortOrder = _storage.submittersTableAscending ? -1 : 1;
    return (a[_storage.submitterSortBy] || 0) > (b[_storage.submitterSortBy] || 0) ? -1 * sortOrder : 1 * sortOrder;
}

function mapFilter(map) {
    if (_storage.nameFilter && !(map.Name.toLowerCase().includes(_storage.nameFilter.toLowerCase()))) return false;
    if (_storage.submitterFilter && !(map.Submitter.Name.toLowerCase().includes(_storage.submitterFilter.toLowerCase()))) return false;
    if (_storage.minRating >= 0 && (map.RobRating === undefined || map.RobRating === null)) return false;
    if (_storage.minRating >= 0 && map.RobRating < _storage.minRating) return false;
    if (map.RobLabels == null && _storage.includeLabels.length !== 0) return false;
    if (map.RobLabels) {

        if (map.RobLabels.length < _storage.includeLabels.length)
            return false;

        for (let label of _storage.includeLabels) {
            if (!map.RobLabels.includes(label))
                return false;
        }

        for (let label of map.RobLabels) {
            if (_storage.excludeLabels.includes(label))
                return false;
        }
    }

    // If we are filtering maps with weapons, and a map has no weapon information extracted, do not show it.
    if (map.Weapons == null && (_storage.includeWeapons.length > 0 || _storage.excludeWeapons.length > 0)) {
        return false;
    }
    if (map.Weapons) {

        if (map.Weapons.length < _storage.includeWeapons.length)
            return false;

        for (let weapon of _storage.includeWeapons) {
            if (!map.Weapons.includes(weapon))
                return false;
        }

        for (let weapon of map.Weapons) {
            if (_storage.excludeWeapons.includes(weapon))
                return false;
        }
    }
    return true;
}

function filterMaps() {
    if (_scrapeData.MapInfo.length == 0) return;

    _scrapeData.MapInfo.sort(sortFilteredMaps);
    _filteredMaps = _scrapeData.MapInfo.filter(x => mapFilter(x));
}

function filterSubmitters() {
    _submitters.sort(sortSubmitters);
}

function getLabels(map) {
    if (map.RobLabels === null || map.RobLabels === undefined || map.RobLabels.length === 0) return [];
    return map.RobLabels.map(x => m("span", { class: `map-label ${getLabelColour(x)}` }, x));
}

function includeWeapon(weapon) {
    if (_ratingsTableFilterTempValues.excludeWeapons.includes(weapon)) _ratingsTableFilterTempValues.excludeWeapons = _ratingsTableFilterTempValues.excludeWeapons.filter(x => x !== weapon);
    if (_ratingsTableFilterTempValues.includeWeapons.includes(weapon)) _ratingsTableFilterTempValues.includeWeapons = _ratingsTableFilterTempValues.includeWeapons.filter(x => x !== weapon);
    else _ratingsTableFilterTempValues.includeWeapons.push(weapon);
}

function excludeWeapon(weapon) {
    if (_ratingsTableFilterTempValues.includeWeapons.includes(weapon)) _ratingsTableFilterTempValues.includeWeapons = _ratingsTableFilterTempValues.includeWeapons.filter(x => x !== weapon);
    if (_ratingsTableFilterTempValues.excludeWeapons.includes(weapon)) _ratingsTableFilterTempValues.excludeWeapons = _ratingsTableFilterTempValues.excludeWeapons.filter(x => x !== weapon);
    else _ratingsTableFilterTempValues.excludeWeapons.push(weapon);
}

function includeLabel(label) {
    if (_ratingsTableFilterTempValues.excludeLabels.includes(label)) _ratingsTableFilterTempValues.excludeLabels = _ratingsTableFilterTempValues.excludeLabels.filter(x => x !== label);
    if (_ratingsTableFilterTempValues.includeLabels.includes(label)) _ratingsTableFilterTempValues.includeLabels = _ratingsTableFilterTempValues.includeLabels.filter(x => x !== label);
    else _ratingsTableFilterTempValues.includeLabels.push(label);
}

function excludeLabel(label) {
    if (_ratingsTableFilterTempValues.includeLabels.includes(label)) _ratingsTableFilterTempValues.includeLabels = _ratingsTableFilterTempValues.includeLabels.filter(x => x !== label);
    if (_ratingsTableFilterTempValues.excludeLabels.includes(label)) _ratingsTableFilterTempValues.excludeLabels = _ratingsTableFilterTempValues.excludeLabels.filter(x => x !== label);
    else _ratingsTableFilterTempValues.excludeLabels.push(label);
}

//Get the list of tag elements for the include/exlude tag filters. Include param determines what the onclick listener does.
function getLabelFilterList(include) {
    var getColorClass = (label) => {
        if (include && _ratingsTableFilterTempValues.includeLabels.includes(label)) return getLabelColour(label);
        if (!include && _ratingsTableFilterTempValues.excludeLabels.includes(label)) return getLabelColour(label);
        return '';
    }
    return _foundLabels.map(x => m("span", { class: `a-self-center map-label ${getColorClass(x)}`, onclick: include ? () => includeLabel(x) : () => excludeLabel(x) }, x));
}

function resetFilter() {
    let queryParams = {
        page: 1,
        rating: 0,
        name: "",
        submitter: "",
        sort: _ratingsTableSortByProperties[0].propertyName,
        asc: false,
        // The filtering lists (included/excluded weapons/labels) will be exluded from the string completely because
        // Mithril doesn't do anything to indicate empty lists in query strings. They just end up undefined in the route that consumes them.
    }
    m.route.set(ROUTES.ratingsTable, queryParams);
}

function applyFilter() {
    let queryParams = {
        page: 1,
        rating: _ratingsTableFilterTempValues.minRating,
        name: _ratingsTableFilterTempValues.nameFilter,
        submitter: _ratingsTableFilterTempValues.submitterFilter,
        sort: _ratingsTableFilterTempValues.sortBy,
        asc: _ratingsTableFilterTempValues.ratingsTableAscending,
        il: _ratingsTableFilterTempValues.includeLabels,
        el: _ratingsTableFilterTempValues.excludeLabels,
        iw: _ratingsTableFilterTempValues.includeWeapons,
        ew: _ratingsTableFilterTempValues.excludeWeapons,
    }
    m.route.set(ROUTES.ratingsTable, queryParams);
}

function getRandomMap() {
    let map = _filteredMaps[Math.floor(Math.random() * _filteredMaps.length)];
    navigator.clipboard.writeText(map.Name);

    openModal(map);

    _toastMessages.addMessage(`Copied map '${map.Name}' to clipboard`, 2000);
}
function makeMapLink(id) {
    return `https://gamebanana.com/mods/${id}`;
}

function makeSubmitterLink(id) {
    return `https://gamebanana.com/members/${id}`;
}

var MapRatingsFiltering = {
    view: function () {
        return m("div", {
            style: { "display": "flex", "justify-content": "space-between", "gap": "1rem" },
            onkeypress: function (e) { if (e.key === "Enter") applyFilter() }
        },
            [
                m("div", { style: { "flex-grow": "1" } },
                    m("label", { class: "form-label", id: "ratingSliderText" }, "Minimum Rating: ", _ratingsTableFilterTempValues.minRating < 0 ? 'None selected' : _ratingsTableFilterTempValues.minRating),
                    m("input", {
                        class: "form-range",
                        type: "range",
                        min: "-0.5",
                        max: "5",
                        step: "0.5",
                        value: _ratingsTableFilterTempValues.minRating,
                        id: "ratingSlider",
                        oninput: (event) => { _ratingsTableFilterTempValues.minRating = event.target.value }
                    })
                ),
                m("div", { style: { "flex-grow": "1" } },
                    m("label", { class: "form-label" }, "Name filter"),
                    m("input", {
                        class: "form-control",
                        type: "text",
                        value: _ratingsTableFilterTempValues.nameFilter,
                        id: "nameFilter",
                        oninput: (event) => { _ratingsTableFilterTempValues.nameFilter = event.target.value }
                    }
                    )
                ),
                m("div", { style: { "flex-grow": "1" } },
                    m("label", { class: "form-label" }, "Submitter filter"),
                    m("input", {
                        class: "form-control",
                        type: "text",
                        value: _ratingsTableFilterTempValues.submitterFilter,
                        id: "submitterFilter",
                        oninput: (event) => { _ratingsTableFilterTempValues.submitterFilter = event.target.value }
                    }
                    )
                ),
                m("div", { style: { "flex-grow": "1" } },
                    m("label", { class: "form-label", style: "margin-right:.5rem" }, "Sort By"),
                    m("div", { class: "form-check form-check-inline" },
                        m("input", {
                            class: "form-check-input",
                            type: "radio",
                            name: "ascDescRadio",
                            id: "sortAscending",
                            checked: _ratingsTableFilterTempValues.ratingsTableAscending,
                            oninput: (event) => { _ratingsTableFilterTempValues.ratingsTableAscending = event.target.checked }
                        }
                        ),
                        m("label", { class: "form-check-label", for: "sortAscending" }, " Asc ")
                    ),
                    m("div", { class: "form-check form-check-inline" },
                        m("input", {
                            class: "form-check-input",
                            type: "radio",
                            name: "ascDescRadio",
                            id: "sortDescending",
                            checked: !_ratingsTableFilterTempValues.ratingsTableAscending,
                            oninput: (event) => { _ratingsTableFilterTempValues.ratingsTableAscending = !event.target.checked }
                        }
                        ),
                        m("label", { class: "form-check-label", for: "sortDescending" }, " Desc ")
                    ),
                    m("select",
                        {
                            class: "form-select",
                            id: "sortBy",
                            "aria-label": "Sort by a property",
                            oninput: (event) => { _ratingsTableFilterTempValues.sortBy = event.target.value },
                            value: _ratingsTableFilterTempValues.sortBy

                        },
                        _ratingsTableSortByProperties.map(x => m("option", { value: x.propertyName }, x.friendlyName))
                    )
                )
            ]
        );
    }
}

var SubmitterAverageRatingsFiltering = {
    view: function () {
        return m("div", { style: { "display": "flex", "justify-content": "center", "gap": "1rem" } },
            [
                m("div",
                    m("label", { class: "form-label", style: "margin-right:.5rem" }, "Sort By"),
                    m("div", { class: "form-check form-check-inline" },
                        m("input", {
                            class: "form-check-input",
                            type: "radio",
                            name: "ascDescRadio",
                            id: "sortAscending",
                            checked: _storage.submittersTableAscending,
                            oninput: (event) => { _storage.submittersTableAscending = event.target.checked; _storage.save(); }
                        }
                        ),
                        m("label", { class: "form-check-label", for: "sortAscending" }, " Asc ")
                    ),
                    m("div", { class: "form-check form-check-inline" },
                        m("input", {
                            class: "form-check-input",
                            type: "radio",
                            name: "ascDescRadio",
                            id: "sortDescending",
                            checked: !_storage.submittersTableAscending,
                            oninput: (event) => { _storage.submittersTableAscending = !event.target.checked; _storage.save(); }
                        }
                        ),
                        m("label", { class: "form-check-label", for: "sortDescending" }, " Desc ")
                    ),
                    m("select",
                        {
                            class: "form-select",
                            id: "sortBy",
                            "aria-label": "Sort by a property",
                            oninput: (event) => { _storage.submitterSortBy = event.target.value; _storage.save(); },
                            value: _storage.submitterSortBy

                        },
                        _submittersTableSortByProperties.map(x => m("option", { value: x.propertyName }, x.friendlyName))
                    )
                )
            ]
        );
    }
}

var Buttons = {
    view: function () {
        return m("div", { class: "container d-flex mt-2", style: { "justify-content": "center", "gap": "0.5rem" } },
            m("div", { style: { "display": "inline-block" } },
                m("a", { class: "btn btn-info", href: "/stats.html" }, "View statistics")
            ),
            _storage.submittersTableVisible && m("div", { style: {} },
                m("a", { class: "btn btn-primary", type: "submit", id: "showRatingsButton", href: `/` }, "Show Ratings")
            ),
            _storage.ratingsTableVisible && m("div", { style: { "display": "inline-block" } },
                m("a", { class: "btn btn-primary", id: "showSubmittersButton", href: `#!${ROUTES.submittersTable}` }, "Show Submitters")
            ),
            _storage.ratingsTableVisible && m("div", { style: { "display": "inline-block" } },
                m("button", { class: "btn btn-primary", type: "submit", id: "resetFilterButton", onclick: resetFilter }, "Reset filters")
            ),
            _storage.ratingsTableVisible && m("div", { style: { "display": "inline-block" } },
                m("button", { class: "btn btn-primary", type: "submit", id: "getRandomMapButton", onclick: getRandomMap }, "Get Random")
            ),
            m("div", { style: { "display": "inline-block" } },
                m("button", { class: "btn btn-success", onclick: applyFilter }, "Apply Filter")
            ),
        );
    }
}

var WeaponFiltering = {
    view: function () {
        return [
            m('div', { class: 'container d-flex justify-content-around flex-wrap b-bottom mb-2 pt-2 pb-2' }, m('h5', 'Include Weapons'), FILTER_WEAPONS.map(x =>
                m("span", { class: `a-self-center map-label ${_ratingsTableFilterTempValues.includeWeapons.includes(x) ? "label-blue" : ""}`, onclick: () => includeWeapon(x) }, x)
            )),
            m('div', { class: 'container d-flex justify-content-around flex-wrap b-bottom mb-2 pb-2' }, [m('h5', 'Exclude Weapons'), , FILTER_WEAPONS.map(x =>
                m("span", { class: `a-self-center map-label ${_ratingsTableFilterTempValues.excludeWeapons.includes(x) ? "label-blue" : ""}`, onclick: () => excludeWeapon(x) }, x)
            )])
        ]
    }
}

// , m(CopyToClipboardIcon, {onclick: () => copyToClipboard(map.Name)}) Copy to clipboard icon... Removed from the table rows because it was a bit slow... Nice one...

var TagFiltering = {
    view: function () {
        return [
            m('div', { class: 'container d-flex justify-content-around flex-wrap b-bottom mb-2 pt-2 pb-2' }, m('h5', 'Include Labels'), ...getLabelFilterList(true)),
            m('div', { class: 'container d-flex justify-content-around flex-wrap b-bottom mb-2 pb-2' }, m('h5', 'Exclude Labels'), ...getLabelFilterList(false))
        ]
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    _toastMessages.addMessage(`Copied '${text}' to clipboard`, 2000);
}

function handleTableClickEvent(event, map) {
    if (window.getSelection().toString().length > 0) return; // Ignore the click if some text was selected.
    if (event.target.tagName.toLowerCase() == 'a') return; //Allow clicks on links 

    openModal(map);
}

function makeRatingsTableRow(map) {
    return m('tr', {
        key: map.Id,
        onclick: (clickEvent) => handleTableClickEvent(clickEvent, map)
    }, // TODO: figure out why this was breaking when we used Name as the key... That's a bit weird...
        m("th", { scope: "row" }, m("a", { class: "link-secondary", target: "_blank", href: makeMapLink(map.Id) }, map.Name)),
        m("td", m("a", { class: "link-secondary", target: "_blank", href: makeSubmitterLink(map.Submitter.Id) }, map.Submitter.Name)),
        m("td", formatDate(map.Added)),
        m("td", formatDate(map.InitialRatingTimestamp)),
        m("td", map.RobRating == null ? "Unrated" : map.RobRating),
        m("td", getLabels(map))
    );
}

function onPageChanged(newPageNumber) {
    const currentRoute = m.route.get();
    const [path, _] = currentRoute.split('?');

    const params = m.route.param();
    params.page = newPageNumber;

    m.route.set(path, params);
}

// Vnode<{ totalItems: number, pageSize: number, currentPage: number, onPageChanged: (page: number) => void }>
var PaginationFooter = {
    view: function ({ attrs }) {
        let currentStartItem = (attrs.currentPage - 1) * attrs.pageSize + 1;
        let currentEndItem = Math.min(attrs.currentPage * attrs.pageSize, attrs.totalItems);
        let endPage = Math.ceil(attrs.totalItems / attrs.pageSize);
        return m('div.card-footer', { style: 'display: flex; gap:0.5rem; bottom: 0; position: sticky;' },
            m('p', `Page ${attrs.currentPage} (${currentStartItem} to ${currentEndItem}/${attrs.totalItems})`),
            m("button.btn.btn-primary", {
                style: 'flex-grow:1;',
                onclick: attrs.currentPage > 1 ? () => attrs.onPageChanged(attrs.currentPage - 1) : null,
                disabled: attrs.currentPage <= 1
            },
                "Previous"),
            m("button.btn.btn-primary", {
                style: 'flex-grow:1;',
                onclick: attrs.currentPage < endPage ? () => attrs.onPageChanged(attrs.currentPage + 1) : null,
                disabled: attrs.currentPage >= endPage
            },
                "Next")
        )
    }
}

var RatingsTable = {
    view: function () {
        filterMaps();

        return m("div", { class: "container" },
            m("table", { class: "table table-striped", id: "fixed-table-header" }, [
                m("thead",
                    m("tr", [
                        m("th", { scope: "col" }, `Name (#${_filteredMaps.length} total)`),
                        m("th", { scope: "col" }, "Submitter"),
                        m("th", { scope: "col" }, "First Submitted"),
                        m("th", { scope: "col" }, "First Rated"),
                        m("th", { scope: "col" }, "Rating"),
                        m("th", { scope: "col" }, "Labels")
                    ]
                    )),
                m("tbody", _filteredMaps.slice((_storage.currentPage - 1) * CONSTANTS.PAGE_SIZE, (_storage.currentPage - 1) * CONSTANTS.PAGE_SIZE + CONSTANTS.PAGE_SIZE).map(x => makeRatingsTableRow(x)))
            ]),
            m(PaginationFooter, { onPageChanged: onPageChanged, totalItems: _filteredMaps.length, currentPage: _storage.currentPage, pageSize: CONSTANTS.PAGE_SIZE })
        );
    }
}

var FilterIcon = {
    view: function ({ attrs }) {
        return m('svg.config-button', {
            viewBox: "0 0 16 16",
            onclick: attrs.onclick
        },
            m('path', { d: "M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5" })
        )
    }
}

var CopyToClipboardIcon = {
    view: function ({ attrs }) {
        return m('svg.config-button', {
            viewBox: "0 0 16 16",
            onclick: () => copyToClipboard(attrs.copyText)
        },
            m('path', { d: "M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z" })
        )
    }
}

var MapInfoModal = {
    view: function () {
        return m('div.modal-container',
            {
                onkeydown: (event) => {
                    if (event.key == 'Escape') closeModal();
                },
                onclick: (event) => {
                    if (event.target === event.currentTarget)
                        closeModal();
                }
            },
            m('div.card',
                m('div.card-header',
                    m('p', { style: 'margin:0;' }, `Map details`),
                    m("button.btn-close[type=button][aria-label=Close]", { onclick: () => closeModal() })),
                m('div.card-body',
                    m('h3',
                        m('a', { target: "_blank", href: makeMapLink(_modalMapInfo['Id']) }, _modalMapInfo['Name']),
                        m(CopyToClipboardIcon, { copyText: _modalMapInfo['Name'] })
                    ),
                    m('h5',
                        'Submitter: ',
                        m('a', { target: "_blank", href: makeSubmitterLink(_modalMapInfo['Submitter']['Id']) }, _modalMapInfo['Submitter']['Name']),
                        m(CopyToClipboardIcon, { copyText: _modalMapInfo['Submitter']['Name'] }),
                        m(FilterIcon, { onclick: () => filterBySubmitter(_modalMapInfo['Submitter']['Name']) })
                    ),
                    'RobLabels' in _modalMapInfo ? [m('h5', 'Labels'), getLabels(_modalMapInfo)] : m('h5', 'No map labels'),

                    _modalMapInfo['BspFiles'] && _modalMapInfo['BspFiles'].length
                        ? [
                            m('h5', 'bsp files'),
                            m('p', m('ul', _modalMapInfo['BspFiles'].map(x => m('li', x, m(CopyToClipboardIcon, { copyText: x })))))
                        ]
                        : m('h5', 'No bsp files found for map'),

                    _modalMapInfo['Weapons'] != null
                        ? [
                            m('h5', 'Weapons spawns on map'),
                            m('p', m('ul', _modalMapInfo['Weapons'].map(x => m('li', x))))
                        ]
                        : m('h5', 'No weapons found for map'),
                    'HasTeleport' in _modalMapInfo ? m('h5', 'Map has teleports') : m('h5', 'No teleports'),
                    'HasPushes' in _modalMapInfo ? m('h5', 'Map has jump pads') : m('h5', 'No jump pads')
                )
            )
        )
    }
}


function filterBySubmitter(submitterName) {
    let queryParams = {
        page: 1,
        rating: CONSTANTS.NO_RATING_MIN_RATING_VALUE, // Minimum rating
        name: "", // Name substring
        submitter: submitterName, // Submitter subtring
        il: [], // Include labels
        el: [], // Exclude labels
        iw: [], // Include weapons
        ew: [], // Exclude weapons,
    }
    m.route.set(ROUTES.ratingsTable, queryParams);
}

function makeSubmittersTableRow(playerRating) {
    return m('tr', { key: playerRating.id }, [
        m("th", { scope: "row" }, m("a", { class: "link-secondary", href: makeSubmitterLink(playerRating.id) }, playerRating.name), m(FilterIcon, { onclick: () => filterBySubmitter(playerRating.name) })),
        m("td", playerRating.totalRatedOrCrashedMaps),
        m("td", playerRating.totalMaps),
        m("td", isNaN(playerRating.averageRating) ? 'No rating' : playerRating.averageRating)
    ]);
}

var SubmittersTable = {
    view: function () {
        filterSubmitters();

        return m("div", { class: "container" },
            m("table", { class: "table table-striped", id: "fixed-table-header" }, [
                m("thead",
                    m("tr", [
                        m("th", { scope: "col" }, `Name `),
                        m("th", { scope: "col" }, "Maps Rated"),
                        m("th", { scope: "col" }, "Maps Submitted"),
                        m("th", { scope: "col" }, "Average Rating")
                    ]
                    )),
                m("tbody", _submitters.map(x => makeSubmittersTableRow(x)))
            ])
        );
    }
}

function DrawRatingGraph(graphElement) {
    var data = google.visualization.arrayToDataTable(
        [['Date', 'Total Rated']].concat(_scrapeData.MapRatingGraphData.map(x => [new Date(x[0] * 1000), x[1]]))
    );

    var options = {
        title: 'Map rating progress over time',
        curveType: 'function',
        legend: { position: 'bottom' }
    };

    var chart = new google.visualization.LineChart(graphElement);

    chart.draw(data, options);
}

var ToastComponent = {
    onbeforeremove: function (vnode) {
        vnode.dom.classList.add("fade-out");
        return new Promise(function (resolve) {
            vnode.dom.addEventListener("animationend", resolve);
        })
    },
    view: function ({ attrs }) {

        return m("div.fade-in",
            {
                "class": 'toast align-items-center show text-white bg-primary',
                "role": "alert",
                "aria-live": "assertive",
                "aria-atomic": "true",
                "style": 'pointer-events:all'
            },
            m("div", { "class": "d-flex" },
                m("div", { "class": "toast-body" }, attrs.message)
            )
        )
    }
}

var ErrorOverlay = {
    view: function () {
        return m('div.error-container', { style: 'pointer-events:none' },
            m('div.errors', _toastMessages.messages.map(x => m(ToastComponent, { key: x.key, message: x.message })))
        );
    }
}

var Header = {
    view: function () {
        return m("div", { "class": "container" },
            m("header",
                m("h2", "Rob's Half Life 2 Map Ratings."),
                m("p", `An attempt to rate and categorise ${_scrapeData.MapInfo.length || 'a few'} Half Life 2 Deathmatch maps.`),
                m("p", m("i", "Extremely subjective!"))
            )
        );
    }
}

var App = {
    view: function () {
        return [
            m(ErrorOverlay),
            _modalMapInfo && m(MapInfoModal),
            m('div.container',
                m(Header),
                _storage.ratingsTableVisible ? m(MapRatingsFiltering) : m(SubmitterAverageRatingsFiltering),
                m(Buttons),
                _storage.ratingsTableVisible && m(TagFiltering),
                _storage.ratingsTableVisible && m(WeaponFiltering),
                _storage.ratingsTableVisible ? m(RatingsTable) : m(SubmittersTable)
            )
        ]
    }
}

function findAllLabels(data) {
    _foundLabels = [];
    data.forEach(x => {
        if (!x.RobLabels) return;
        x.RobLabels.forEach(label => { if (!_foundLabels.includes(label)) _foundLabels.push(label) });
    });
    _foundLabels = _foundLabels.filter(x => !IGNORE_LABELS.includes(x));
}

function formatDate(unixTimestamp) {
    if (unixTimestamp == null) return '';
    let date = new Date(unixTimestamp * 1000);
    return `${_dayPrettyPrint[date.getDay()]} ${date.getDate()} ${_monthPrettyPrint[date.getMonth()]}, ${(date.getYear() - 100).toString().padStart(2, '0')}`
}

function getAverageRatingData() {
    // I want to count how many maps have been rated, or determined that they do not load/crash for each submitter.
    // But I do not want a crashed map to reduce the average map score, which is why I maintain a 2 different count variables.
    for (let map of _scrapeData.MapInfo.filter(x => x.RobRating || x.RobLabels)) {
        if (map.Submitter.Name in _submitters) {
            _submitters[map.Submitter.Name].numRatings += map.RobRating != null ? 1 : 0;
            _submitters[map.Submitter.Name].totalRatedOrCrashedMaps += 1;
            _submitters[map.Submitter.Name].totalRating += map.RobRating || 0;
        } else {
            _submitters[map.Submitter.Name] = {
                name: map.Submitter.Name,
                id: map.Submitter.Id,
                numRatings: map.RobRating != null ? 1 : 0,
                totalRatedOrCrashedMaps: 1,
                totalRating: map.RobRating || 0,
                totalMaps: 0 // Add up total number of maps later...
            }
        }
    }

    for (let map of _scrapeData.MapInfo) {
        if (map.Submitter.Name in _submitters)
            _submitters[map.Submitter.Name].totalMaps++;
    }
    for (let playerRating of Object.values(_submitters)) {
        playerRating.averageRating = playerRating.totalRating / playerRating.numRatings;
    }

    // [TODO]: There's something weird going on here with submitters... What is it...
    _submitters = Object.values(_submitters);
}

function handleCommonRouteParameters(attrs) {
    let parsedMinRating = attrs.rating ? parseFloat(attrs.rating) : NaN;
    if (!isNaN(parsedMinRating) && [-0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].includes(parsedMinRating)) {
        _storage.minRating = parsedMinRating;
    }
    let parsedPageNumber = attrs.page ? parseInt(attrs.page) : NaN;
    if (!isNaN(parsedPageNumber)) {
        _storage.currentPage = parsedPageNumber;
    }
    _storage.includeLabels = attrs.il || [];
    _storage.excludeLabels = attrs.el || [];
    _storage.includeWeapons = attrs.iw || [];
    _storage.excludeWeapons = attrs.ew || [];
    if (attrs.name != null) _storage.nameFilter = attrs.name;
    if (attrs.submitter != null) _storage.submitterFilter = attrs.submitter;
    if (attrs.sort && _ratingsTableSortByProperties.map(x => x.propertyName).includes(attrs.sort)) _storage.sortBy = attrs.sort;
    if (attrs.asc != null) _storage.ratingsTableAscending = attrs.asc;

    _storage.save();
}

var RoutingConfiguration = {
    "/": {
        // I use onmatch here because I want to clone the current filter parameters into _ratingsTableFilterTempValues, 
        // because we now have a 2 step filter edit/application process. There needs to be a current value and temp value.
        onmatch: function (attrs) {
            handleCommonRouteParameters(attrs);

            _modalMapInfo = null; // Make sure the modal is closed.
            _storage.showRatingsTable();
            return App;
        },
        render: function (vnode) { return [vnode] }
    },
    [ROUTES.mapDetailsModal]: {
        render: function ({ attrs }) {
            handleCommonRouteParameters(attrs);

            if (attrs.id != null && !isNaN(parseInt(attrs.id))) {
                let id = parseInt(attrs.id);
                let foundMap = _scrapeData['MapInfo'].find(x => x.Id == id);
                if (foundMap) _modalMapInfo = foundMap;
            }
            return m(App);
        }
    },
    [ROUTES.submittersTable]: {
        render: function () {
            _modalMapInfo = null; // Make sure the modal is closed.
            _storage.showSubmittersTable();
            return m(App);
        }
    }
}

async function initialise() {
    _storage.loadFromLocalStorage();

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            closeModal();
            m.redraw()
        }
    });

    m.route(document.querySelector('#dynamic-content'), "/", RoutingConfiguration);
    _scrapeData = (await m.request({ method: 'GET', url: 'scrape_data.json' }));
    findAllLabels(_scrapeData.MapInfo);
    getAverageRatingData();
    m.redraw();
}

window.addEventListener('load', initialise);
