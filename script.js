'use strict';
var _scrapeData = [];
var _staticHtml = undefined;

function sort(a,b)
{
    return (a.RobRating||0)>(b.RobRating||0)?-1:1;
}

function filterMaps(){
   return _scrapeData.slice();
}

function getLabels(map){
    if(map.RobLabels === null || map.RobLabels === undefined || map.RobLabels.length === 0) return [];
    return map.RobLabels.map(x => m("div", {"class":"map-label"}, m("span", x)));
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
        let filteredMaps = filterMaps();
        filteredMaps.sort(sort);

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
                m("tbody", filteredMaps.map(x => makeRow(x)))
            ])
        );
    }
}

var App = {
    view: function(){
        let pieces = [];
        if(_staticHtml) pieces.push(m.trust(_staticHtml));
        if(_scrapeData) pieces.push(m(Table))
        return pieces;
    }
}

m.mount(document.body, App);

fetch('/index-static.html').then(x=>x.text()).then(x => {
    _staticHtml = x;
    m.redraw();
}); 

m.request({method: 'GET',url: '/scrape_data.json'}).then((x) => {
    _scrapeData = x.MapInfo;
});
