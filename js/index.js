'use strict';

var _sortByProperties = [
    { propertyName: 'RobRating', friendlyName: 'Rating' },
    { propertyName: 'InitialRatingTimestamp', friendlyName: 'First Rated' }
];
var _toastMessages = {
    currentKey: 0,
    messages: [],
    addMessage: function(message, showLengthMilliseconds){
        const key = this.currentKey;
        this.messages.push({key: this.currentKey, message: message});
        setTimeout(() => {
            console.log(`Removing message with key: ${key} from messages list.`)
            let idx = this.messages.findIndex(toast => toast.key === key );
            this.messages.splice(idx, 1);
            m.redraw();
        }, showLengthMilliseconds);
        this.currentKey++;
    }
}
var _filteredMaps = []
var _storage = {
    sortBy: _sortByProperties[0].propertyName,
    ascending: false,
    nameFilter: '',
    minRating: 0,
    includeLabels: [],
    excludeLabels: [],
    loadFromLocalStorage: function () {
        const savedData = localStorage.getItem('storage');
        if (savedData) {
            Object.assign(this, JSON.parse(savedData));
        }
    },
    save: function () {
        localStorage.setItem('storage', JSON.stringify(this));
    }
}
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

function redraw() {
    m.redraw();
}

function sort(a, b) {
    if (_storage.sortBy == null) return a;
    let sortOrder = _storage.ascending ? -1 : 1;
    return (a[_storage.sortBy] || 0) > (b[_storage.sortBy] || 0) ? -1 * sortOrder : 1 * sortOrder;
}

function mapFilter(map, nameFilter, minRating) {
    if (nameFilter && !(map.Name.toLowerCase().includes(nameFilter.toLowerCase()))) return false;
    if (minRating >= 0 && (map.RobRating === undefined || map.RobRating === null)) return false;
    if (minRating >= 0 && map.RobRating < minRating) return false;
    if (map.RobLabels == null && _storage.includeLabels.length !== 0) return false;
    if (map.RobLabels && map.RobLabels.reduce((a, b) => _storage.includeLabels.includes(b) ? a + 1 : a, 0) !== _storage.includeLabels.length) return false;
    if (map.RobLabels && map.RobLabels.filter(x => _storage.excludeLabels.includes(x)).length !== 0) return false;
    return true;
}

function filterMaps() {
    _scrapeData.MapInfo.sort(sort);
    _filteredMaps = _scrapeData.MapInfo.filter(x => mapFilter(x, _storage.nameFilter, _storage.minRating));
}

function getLabels(map) {
    if (map.RobLabels === null || map.RobLabels === undefined || map.RobLabels.length === 0) return [];
    return map.RobLabels.map(x => m("span", { class: `map-label ${getLabelColour(x)}` }, x));
}

function includeLabel(label) {
    if (_storage.excludeLabels.includes(label)) _storage.excludeLabels = _storage.excludeLabels.filter(x => x !== label);
    if (_storage.includeLabels.includes(label)) _storage.includeLabels = _storage.includeLabels.filter(x => x !== label);
    else _storage.includeLabels.push(label);

    _storage.save();
}

function excludeLabel(label) {
    if (_storage.includeLabels.includes(label)) _storage.includeLabels = _storage.includeLabels.filter(x => x !== label);
    if (_storage.excludeLabels.includes(label)) _storage.excludeLabels = _storage.excludeLabels.filter(x => x !== label);
    else _storage.excludeLabels.push(label);

    _storage.save();
}

//Get the list of tag elements for the include/exlude tag filters. Include param determines what the onclick listener does.
function getLabelFilterList(include) {
    var getColorClass = (label) => {
        if (include && _storage.includeLabels.includes(label)) return getLabelColour(label);
        if (!include && _storage.excludeLabels.includes(label)) return getLabelColour(label);
        return '';
    }
    return _foundLabels.map(x => m("span", { class: `a-self-center map-label ${getColorClass(x)}`, onclick: include ? () => includeLabel(x) : () => excludeLabel(x) }, x));
}

function resetFilter() {
    _storage.nameFilter = '';
    _storage.ascending = false;
    _storage.sortBy = _sortByProperties[0].propertyName;
    _storage.minRating = 0;
    _storage.includeLabels = [];
    _storage.excludeLabels = [];
    _storage.save();
}

function getRandomMap() {
    let map = _filteredMaps[Math.floor(Math.random() * _filteredMaps.length)];
    navigator.clipboard.writeText(map.Name);
    _toastMessages.addMessage(`Copied map '${map.Name}' to clipboard`, 2000);
}

function makeRow(map) {
    return m('tr', { key: map.Name }, [
        m("th", { scope: "row" }, m("a", { class: "link-secondary", href: map.Link }, map.Name)),
        m("td", formatDate(new Date(map.InitialRatingTimestamp * 1000))),
        m("td", map.RobRating == null ? "Unrated" : map.RobRating),
        m("td", getLabels(map))
    ]);
}

var Filtering = {
    view: function () {
        return m("div", { style: { "display": "flex", "justify-content": "space-between", "gap": "1rem" } },
            [
                m("div", { style: { "flex-grow": "1" } },
                    m("label", { class: "form-label", id: "ratingSliderText" }, "Minimum Rating: ", _storage.minRating < 0 ? 'None selected' : _storage.minRating),
                    m("input", {
                        class: "form-range",
                        type: "range",
                        min: "-0.5",
                        max: "5",
                        step: "0.5",
                        value: _storage.minRating,
                        id: "ratingSlider",
                        oninput: (event) => { _storage.minRating = event.target.value; _storage.save(); }
                    })
                ),
                m("div", { style: { "flex-grow": "1" } },
                    m("label", { class: "form-label" }, "Name filter"),
                    m("input", {
                        class: "form-control",
                        type: "text",
                        value: _storage.nameFilter,
                        id: "nameFilter",
                        oninput: (event) => { _storage.nameFilter = event.target.value; _storage.save(); }
                    }
                    )
                ),
                m("div", { style: { "flex-grow": "1" } },
                    m("label", { class: "form-label" }, "Sort By"),
                    m("div", { class: "form-check form-check-inline" },
                        m("input", {
                            class: "form-check-input",
                            type: "radio",
                            name: "ascDescRadio",
                            id: "sortAscending",
                            checked: _storage.ascending,
                            oninput: (event) => { _storage.ascending = event.target.checked; _storage.save(); }
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
                            checked: !_storage.ascending,
                            oninput: (event) => { _storage.ascending = !event.target.checked; _storage.save(); }
                        }
                        ),
                        m("label", { class: "form-check-label", for: "sortDescending" }, " Desc ")
                    ),
                    m("select",
                        {
                            class: "form-select",
                            id: "sortBy",
                            "aria-label": "Sort by a property",
                            oninput: (event) => { _storage.sortBy = event.target.value; _storage.save(); },
                            value: _storage.sortBy

                        },
                        _sortByProperties.map(x => m("option", { value: x.propertyName }, x.friendlyName))
                    )
                )
            ]
        );
    }
}

var Buttons = {
    view: function () {
        return m("div", { class: "container d-flex mt-2", style: { "justify-content": "center" } },
            m("div", { style: { "display": "inline-block", "margin": "0 4px 0 4px" } },
                m("button", { class: "btn btn-primary", type: "submit", id: "resetFilterButton", onclick: resetFilter }, "Reset filters")
            ),
            m("div", { class: "ml-2", style: { "display": "inline-block", "margin": "0 4px 0 4px" } },
                m("button", { class: "btn btn-primary", type: "submit", id: "getRandomMapButton", onclick: getRandomMap }, "Get Random")
            ),
            m("div", { class: "ml-2", style: { "display": "inline-block", "margin": "0 4px 0 4px" } },
                m("a", { class: "btn btn-info", href: "/stats.html" }, "View statistics")
            )
        );
    }
}

var TagFiltering = {
    view: function () {
        return [
            m('div', { class: 'container d-flex justify-content-around flex-wrap b-bottom mb-2 pt-2 pb-2' }, [m('h5', { class: 'mr-2' }, 'Include Labels'), ...getLabelFilterList(true)]),
            m('div', { class: 'container d-flex justify-content-around flex-wrap b-bottom mb-2 pb-2' }, [m('h5', { class: 'mr-2' }, 'Exclude Labels'), ...getLabelFilterList(false)])
        ]
    }
}

var Table = {
    view: function () {
        filterMaps();

        return m("div", { class: "container" },
            m("table", { class: "table table-striped", id: "fixed-table-header" }, [
                m("thead",
                    m("tr", [
                        m("th", { scope: "col" }, `Name (#${_filteredMaps.length} total)`),
                        m("th", { scope: "col" }, "First Rated"),
                        m("th", { scope: "col" }, "Rating"),
                        m("th", { scope: "col" }, "Labels")
                    ]
                    )),
                m("tbody", _filteredMaps.map(x => makeRow(x)))
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
    onbeforeremove: function(vnode) {
        vnode.dom.classList.add("fade-out");
        return new Promise(function(resolve) {
            vnode.dom.addEventListener("animationend", resolve);
        })
    },
    view: function({ attrs }){

        return m("div.fade-in", 
                    {
                        "class": 'toast align-items-center show text-white bg-primary',
                        "role":"alert",
                        "aria-live":"assertive",
                        "aria-atomic":"true",
                        "style": 'pointer-events:all'
                    }, 
                    m("div", {"class":"d-flex"},
                        m("div", {"class":"toast-body"}, attrs.message )
                    )
      )
    }
}

var ErrorOverlay = {
    view: function(){
        return m('div.error-container', { style: 'pointer-events:none' },
            m('div.errors', _toastMessages.messages.map(x => m(ToastComponent, {key: x.key, message: x.message})))
        );
    }
}

var Header = {
    view: function() {
        return m("div", {"class":"container"}, 
        m("header",
            m("h2", "Rob's Half Life 2 Map Ratings."),
            m("p", "An attempt to rate and categorise over 1600 Half Life 2 Deathmatch maps. "),
            m("p", m("i", "Extremely subjective!"))
        )
      );
    }
}

var DynamicContent = {
    view: function () {
        return [
            m(ErrorOverlay),
            m('div.container',
                m(Header),
                m(Filtering),
                m(Buttons),
                m(TagFiltering),
                m(Table)
            )
        ];
    }
}

function findAllLabels(data) {
    _foundLabels = [];
    data.forEach(x => {
        if (!x.RobLabels) return;
        x.RobLabels.forEach(label => { if (!_foundLabels.includes(label)) _foundLabels.push(label) });
    });
    console.log(_foundLabels);
}

function formatDate(date) {
    return `${_dayPrettyPrint[date.getDay()]} ${date.getDate()} ${_monthPrettyPrint[date.getMonth()]}, ${date.getYear() - 100}`
}

async function initialise() {
    _storage.loadFromLocalStorage();

    m.mount(document.querySelector('#dynamic-content'), DynamicContent);
    _scrapeData = (await m.request({ method: 'GET', url: 'scrape_data.json' }));
    findAllLabels(_scrapeData.MapInfo);

    m.redraw();
}

window.addEventListener('load', initialise);
