google.charts.load("current", { packages: ["corechart", 'bar'] });
var _scrapeData = {MapInfo: [], MapRatingGraphData: []};
var _dayPrettyPrint = {0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat'}
var _ratingsPerWeekday = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0}

fetch("scrape_data.json").then((x) => x.json()).then((data) => {
    _scrapeData = data;
    google.charts.setOnLoadCallback(drawCharts);
});

function drawCharts()
{
    drawRatingProgress();

    computeGraphData();

    drawRatingsPerWeekday();
}

function drawRatingProgress() {
    let graphData =
    [["Date", "Total Rated"]].concat(
        _scrapeData.MapRatingGraphData.map((x) => [new Date(x[0] * 1000), x[1]])
    );
    let lastDataPoint = _scrapeData.MapRatingGraphData[_scrapeData.MapRatingGraphData.length-1];
    // push a datapoint with the current date to get a flat line at the end.
    graphData.push([new Date(), lastDataPoint[1]]);
    var data = google.visualization.arrayToDataTable(graphData);

    var options = {
        title: "Map rating progress over time",
        curveType: "function",
        legend: { position: "bottom" },
    };

    var chart = new google.visualization.LineChart(
        document.getElementById("rating_progress")
    );

    chart.draw(data, options);
}

function computeGraphData(){
    debugger;
    let total = 0;
    for (let map of _scrapeData.MapInfo.filter(x => x.InitialRatingTimestamp)){
        total++;
        _ratingsPerWeekday[new Date(map.InitialRatingTimestamp*1000).getDay()]++
    }
    for(const key in _ratingsPerWeekday){
        _ratingsPerWeekday[key] = _ratingsPerWeekday[key] / total * 100;
    }
}
function drawRatingsPerWeekday(){

    let data = [['Day', '% Rated', { role: 'annotation' } ]]
    .concat(
        Object.keys(_ratingsPerWeekday).map(x => [_dayPrettyPrint[x], _ratingsPerWeekday[x], `${_ratingsPerWeekday[x].toFixed(2)}%`])
    );

    let dataTable = new google.visualization.arrayToDataTable(data);

    let options = {
        title: '% of ratings given per day',
        hAxis: { title: 'Day' },
        vAxis: { title: '% Rated' }
    };

    let chart = new google.visualization.ColumnChart(document.getElementById('rating_per_weekday'));

    chart.draw(dataTable, options);
}
