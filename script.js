'use strict';

var _scrapeData = [];
var _filteredMaps = [];
var _foundLabels = {};
var _sortOrder = -1;
var _sortBy = undefined;
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
var _includeLabels = [];
var _excludeLabels = [];

var $   = (query) => document.querySelector(query);
var $$  = (query) => document.querySelectorAll(query);
var saveElemValue   = (query) => window.localStorage.setItem(query, $(query).value);
var saveElemValues  = (...queries) => queries.forEach(x => saveElemValue(x));
var getAndSetElemValues = (...keys) => keys.forEach(x => getAndSetElemValue(x))
var getLabelColour = label => (label in _labelColourMap) ? _labelColourMap[label] : _defaultLabel;

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
    return map.RobLabels.map(x => m("span", { "class": `map-label ${getLabelColour(x)}` }, x));
}

function includeLabel(label){
    if(_excludeLabels.includes(label)) _excludeLabels = _excludeLabels.filter(x => x !== label);
    if(_includeLabels.includes(label)) _includeLabels = _includeLabels.filter(x => x !== label);    
    else _includeLabels.push(label);
}

function excludeLabel(label){
    if(_includeLabels.includes(label)) _includeLabels = _includeLabels.filter(x => x !== label);
    if(_excludeLabels.includes(label)) _excludeLabels = _excludeLabels.filter(x => x !== label);
    else _excludeLabels.push(label);   
}

//Get the list of tag elements for the include/exlude tag filters. Include param determines what the onclick listener does.
function getLabelFilterList(include) {
    var getColorClass = (label) => {
        if(include && _includeLabels.includes(label)) return getLabelColour(label);
        if(!include && _excludeLabels.includes(label)) return getLabelColour(label);
        return '';
    }
    return _foundLabels.map(x => m("span", { "class": `map-label ${getColorClass(x)}`, onclick: include ? ()=>includeLabel(x) : ()=>excludeLabel(x)}, x) );
}

function resetFilter(e) {
    $('#nameFilter').value = '';
    $('#sortBy option').selected = true
    $('#ratingSlider').value = -0.5;
    _includeLabels = [];
    _excludeLabels = [];
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

var TagFiltering = {
    view: function() {
        return [
            m('div', {'class': 'container'}, m('h5', 'Include Labels', getLabelFilterList(true))),
            m('div', {'class': 'container'}, m('h5', 'Exclude Labels', getLabelFilterList(false)))
        ]
    }
}

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

var DynamicContent = {
    view: function(){
        let pieces = [];
        // pieces.push(m(TagFiltering));
        pieces.push(m(Table));
        return pieces;
    }
}

function findAllLabels(data){
    _foundLabels = [];
    data.forEach(x => {
        if(!x.RobLabels) return;
        x.RobLabels.forEach(label => {if(!_foundLabels.includes(label)) _foundLabels.push(label)});
    });
    console.log(_foundLabels);
}

async function initialise() {
    $('#ratingSlider').addEventListener("input", redraw);

    ['#sortAscending', '#sortDescending', '#sortBy', '#nameFilter'].forEach(x => $(x).addEventListener("input", () => redraw()));

    $('#getRandomMapButton').addEventListener("click", getRandomMap);
    $('#resetFilterButton').addEventListener("click", resetFilter);

    m.mount($('#dynamic-content'), DynamicContent);

    _scrapeData = (await m.request({ method: 'GET', url: 'scrape_data.json' })).MapInfo;

    findAllLabels(_scrapeData);

    getAndSetElemValues('#sortBy', '#nameFilter', '#ratingSlider');
    redraw();
}

window.addEventListener('load', initialise);
