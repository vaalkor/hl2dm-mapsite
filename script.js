'use strict';
var _scrapeData = [];
var _filteredMaps = [];
var _foundLabels = {};
var _sortOrder = -1;
var _sortBy = undefined;
var LABEL_COLOURS = {
   Green: ['#1feb13', '#028012', '#000000'],
   Yellow: ['#1feb13', '#028012', '#000000'],
   Red: ['#1feb13', '#028012', '#000000'],
   Purple: ['#1feb13', '#028012', '#000000'],
   Blue:  ['#1feb13', '#028012', '#000000']
}
var _labelColourMap = {
    'CausesCrash': LABEL_COLOURS.Red,
    'NoTripmines': LABEL_COLOURS.Red,
    'NeverLoads': LABEL_COLOURS.Red,
    'Incomplete': LABEL_COLOURS.Yellow,
    'Small': LABEL_COLOURS.Green,
    'Medium': LABEL_COLOURS.Yellow,
    'Large': LABEL_COLOURS.Blue,
    'TooBig': LABEL_COLOURS.Red,
    'Outdoors': LABEL_COLOURS.Blue,
    'Indoors': LABEL_COLOURS.Blue,
    'Meme': LABEL_COLOURS.Purple,
    'LowGrav': LABEL_COLOURS.Blue,
    'Remake': LABEL_COLOURS.Blue,
    'VanillaStyle': LABEL_COLOURS.Blue,
    'UT': LABEL_COLOURS.Blue,
    'Quake': LABEL_COLOURS.Blue,
    'HL1': LABEL_COLOURS.Blue
}

var $   = (query) => document.querySelector(query);
var $$  = (query) => document.querySelectorAll(query);
var saveElemValue   = (query) => window.localStorage.setItem(query, $(query).value);
var saveElemValues  = (...queries) => queries.forEach(x => saveElemValue(x));
var getAndSetElemValues = (...keys) => keys.forEach(x => getAndSetElemValue(x))

function getAndSetElemValue(key){
    let val = window.localStorage.getItem(key);
    if(val !== null && val !== undefined) $(key).value = val;
}

function redraw(){
    let slider = $('#ratingSlider');
    let minRating = slider.value < 0 ? 'None selected' : slider.value;
    $('#ratingSliderText').innerText = `Minimum Rating: ${minRating}`

    saveElemValues('#sortBy', '#nameFilter', '#ratingSlider');
    m.redraw();
}

function sort(a, b) {
    if (_sortBy == null) return a;
    return (a[_sortBy] || 0) > (b[_sortBy] || 0) ? -1 * _sortOrder : 1 * _sortOrder;
}

function mapFilter(map, nameFilter, minRating) {
    if (nameFilter && !(map.Name.toLowerCase().includes(nameFilter.toLowerCase()))) return false;
    if (minRating >= 0 && (map.RobRating === undefined || map.RobRating === null)) return false;
    if (minRating >= 0 && map.RobRating < minRating) return false;
    return true;
}

function filterMaps() {
    _filteredMaps = _scrapeData.slice();
    _sortOrder = $('#sortAscending').checked ? -1 : 1;
    _sortBy = $('#sortBy').value;
    let nameFilter = $('#nameFilter').value;
    let minRating = $('#ratingSlider').value;
    _filteredMaps = _filteredMaps.filter(x => mapFilter(x, nameFilter, minRating));
    _filteredMaps.sort(sort);
}

function getLabels(map) {
    if (map.RobLabels === null || map.RobLabels === undefined || map.RobLabels.length === 0) return [];
    return map.RobLabels.map(x => m("span", { "class": "map-label" }, x));
}

function resetFilter(e) {
    $('#nameFilter').value = '';
    $('#sortBy option').selected = true
    $('#ratingSlider').value = -0.5;
    redraw();
}

function getRandomMap(e) {
    // alert('bollocks!');
}

function makeRow(map) {
    return m('tr', [
        m("th", { "scope": "row" }, m("a", { "class": "link-secondary", "href": map.Link }, map.Name)),
        m("td", map.ViewCount),
        m("td", map.LikeCount),
        m("td", map.RobRating == null ? "Unrated" : map.RobRating),
        m("td", getLabels(map))
    ]);
}

// var TagFiltering = {
//     view: function() {
//         return m('div', {'class': 'container'}, )
//     }
// }

var Table = {
    view: function () {
        filterMaps();

        return m("div", { "class": "container" },
            m("table", { "class": "table table-striped", "id": "fixed-table-header" }, [
                m("thead",
                    m("tr", [
                        m("th", { "scope": "col" }, "Name"),
                        m("th", { "scope": "col" }, "Views"),
                        m("th", { "scope": "col" }, "Likes"),
                        m("th", { "scope": "col" }, "Rating"),
                        m("th", { "scope": "col" }, "Labels")
                    ]
                    )),
                m("tbody", _filteredMaps.map(x => makeRow(x)))
            ])
        );
    }
}

function initialise() {
    $('#ratingSlider').addEventListener("input", redraw);

    ['#sortAscending', '#sortDescending', '#sortBy', '#nameFilter'].forEach(x => $(x).addEventListener("input", () => redraw()));

    $('#getRandomMapButton').addEventListener("click", getRandomMap);
    $('#resetFilterButton').addEventListener("click", resetFilter);

    m.mount($('#table'), Table);

    m.request({ method: 'GET', url: 'scrape_data.json' }).then(x => _scrapeData = x.MapInfo);

    getAndSetElemValues('#sortBy', '#nameFilter', '#ratingSlider');
    redraw();
}

window.addEventListener('load', initialise);
