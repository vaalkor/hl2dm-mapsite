'use strict';
var _scrapeData = [];
var _filteredMaps = [];
var _staticHtml = undefined;
var _labels = {};
var _sortOrder = -1;
var _sortBy = undefined;

function sort(a,b)
{
    if(_sortBy == null) return a;
    return (a[_sortBy]||0) > (b[_sortBy]||0) ? -1*_sortOrder : 1*_sortOrder;
}

function mapFilter(map, nameFilter, minRating){
    if(nameFilter && !(map.Name.toLowerCase().includes(nameFilter.toLowerCase()))) return false;
    if(minRating >= 0 && (map.RobRating === undefined || map.RobRating === null)) return false;
    if(minRating >= 0 && map.RobRating < minRating) return false;
    return true;
}

function filterMaps(){
    _filteredMaps = _scrapeData.slice();
    
    if(!_staticHtml) return;
    _sortOrder = document.querySelector('#sortAscending').checked ? -1 : 1;
    _sortBy = [...document.querySelectorAll('#sortBy option')].find(x=>x.selected).value;
    let nameFilter = document.querySelector('#nameFilter').value;
    let minRating = document.querySelector('#ratingSlider').value;
    _filteredMaps = _filteredMaps.filter(x => mapFilter(x, nameFilter, minRating));
    _filteredMaps.sort(sort);
}

function handleRatingSlider(e){
    let slider = document.querySelector('#ratingSlider');
    let minRating = slider.value < 0 ? 'None selected' : slider.value;
    document.querySelector('#ratingSliderText').innerText = `Minimum Rating: ${minRating}`
    m.redraw();
}

function getLabels(map){
    if(map.RobLabels === null || map.RobLabels === undefined || map.RobLabels.length === 0) return [];
    return map.RobLabels.map(x => m("div", {"class":"map-label"}, m("span", x)));
}

function resetFilter(e){
    document.querySelector('#nameFilter').value = '';
    document.querySelector('#sortBy option').selected = true
    document.querySelector('#ratingSlider').value = -0.5;
    handleRatingSlider();
    m.redraw();
}

function getRandomMap(e){
    // alert('bollocks!');
}

function makeRow(map) {
    return m('tr', [
        m("th", {"scope":"row"}, m("a", {"class":"link-secondary","href":map.Link}, map.Name)),
        m("td", map.ViewCount),
        m("td", map.LikeCount),
        m("td", map.RobRating == null ? "Unrated" : map.RobRating),
        m("td", getLabels(map))
    ]);
}

var Table = {
    view: function(){
        filterMaps();

        return m("div", {"class":"container"}, 
            m("table", {"class":"table table-striped","id":"fixed-table-header"}, [
                m("thead", 
                    m("tr",[ 
                        m("th", {"scope":"col"}, "Name"),
                        m("th", {"scope":"col"}, "Views"),
                        m("th", {"scope":"col"}, "Likes"),
                        m("th", {"scope":"col"}, "Rating"),
                        m("th", {"scope":"col"}, "Labels")
                    ]
                    )),
                m("tbody", _filteredMaps.map(x => makeRow(x)))
            ])
        );
    }
}

var StaticHtml = {
    view: function(){
        return m.trust(_staticHtml);
    },
    oncreate: function(){
        initialiseStatic();
    }
}

var App = {
    view: function(){
        let pieces = [];
        if(_staticHtml) pieces.push(m(StaticHtml));
        if(_scrapeData) pieces.push(m(Table))
        return pieces;
    }
}

m.mount(document.body, App);

fetch('index-static.html').then(x=>x.text()).then(x => {
    _staticHtml = x;
    m.redraw();
});

m.request({method: 'GET',url: 'scrape_data.json'}).then((x) => {
    _scrapeData = x.MapInfo;
});


function initialiseStatic(){
    document.querySelector('#ratingSlider').addEventListener("input", handleRatingSlider);

    ['#sortAscending', '#sortDescending', '#sortBy', '#nameFilter'].forEach(x => document.querySelector(x).addEventListener("input", () => m.redraw()));

    document.querySelector('#getRandomMapButton').addEventListener("click", getRandomMap);
    document.querySelector('#resetFilterButton').addEventListener("click", resetFilter);
}
