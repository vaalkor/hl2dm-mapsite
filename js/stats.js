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
    updateAverageRating();

    createLabelGraph();
    
    drawRatingProgress();

    computeGraphData();

    drawRatingsPerWeekday();

    plotRatingLinearRegression();
}

function updateAverageRating() {
    let totalRating = 0;
    let count = 0;

    for (let map of _scrapeData.MapInfo) {
        if (map.RobRating) {
            totalRating += map.RobRating;
            count++;
        }
    }

    document.getElementById("average_rating").innerText = `${totalRating / count}`.substring(0,4);
}

function createLabelGraph() {
    let tagRatings = {};
    let tagCounts = {};

    for (let map of _scrapeData.MapInfo) {
        if (!map.RobLabels)
            continue;

        for (let tag of map.RobLabels) {
            if(tag == "NoTripmines") continue;

            if (!(tag in tagRatings)) {
                tagRatings[tag] = 0;
                tagCounts[tag] = 0;
            }

            tagCounts[tag]++;

            if(map.RobRating != null)
                tagRatings[tag] += map.RobRating;
        }
    }

    let averageRatings = Object.keys(tagRatings).map((tag) => [tag, tagRatings[tag] / tagCounts[tag]]);
    let labelCounts = Object.keys(tagCounts).map((tag) => [tag, tagCounts[tag]]);

    averageRatings.sort((a,b) => b[1] - a[1]);
    labelCounts.sort((a,b) => b[1] - a[1]);

    var averageRatingDataTable = google.visualization.arrayToDataTable([['Tag', 'AverageRating']].concat(averageRatings));
    var labelCountDataTable = google.visualization.arrayToDataTable([['Tag', 'Label Count']].concat(labelCounts));


    let averageRatingOptions = {
        title: 'Average Rating per Tag',
        vAxis: { title: 'Tag' },
        hAxis: { title: 'Rating' },
        legend: 'none'
    };

    let chart = new google.visualization.BarChart(document.getElementById('average_rating_per_label'));
    chart.draw(averageRatingDataTable, averageRatingOptions);

    window.addEventListener('resize', () => chart.draw(averageRatingDataTable, averageRatingOptions));

    let labelCountOptions = {
        title: 'Label Counts',
        vAxis: { title: 'Tag' },
        hAxis: { title: 'Count' },
        legend: 'none'
    };

    chart = new google.visualization.BarChart(document.getElementById('label_counts'));
    chart.draw(labelCountDataTable, labelCountOptions);
    window.addEventListener('resize', () => chart.draw(labelCountDataTable, labelCountOptions));
}

function drawRatingProgress() {
    let graphData =
    [["Date", "Total Rated"]].concat(
        _scrapeData.MapRatingGraphData.map((x) => [new Date(x[0] * 1000), x[1]])
    );
    let lastDataPoint = _scrapeData.MapRatingGraphData[_scrapeData.MapRatingGraphData.length-1];
    // push a datapoint with the current date to get a flat line at the end.
    graphData.push([new Date(), lastDataPoint[1]]);
    var dataTable = google.visualization.arrayToDataTable(graphData);

    var options = {
        title: "Map rating progress over time",
        curveType: "function",
        legend: { position: "bottom" }
    };

    var chart = new google.visualization.LineChart(
        document.getElementById("rating_progress")
    );

    chart.draw(dataTable, options);

    window.addEventListener('resize', () => {
        chart.draw(dataTable, options);
    });
}

function plotRatingLinearRegression(){
    let data = _scrapeData.MapInfo
        .filter(x => x.RobRating);
    data.sort((a,b) => a.InitialRatingTimestamp - b.InitialRatingTimestamp);
    var regressionData = data.map((x, idx) => [idx, x.RobRating])

    let graphData = [["Index", "Rating"]].concat(regressionData);
    let dataTable = google.visualization.arrayToDataTable(graphData);

    let options = {
        title: "Linear Regression of Ratings",
        hAxis: { title: "Index", viewWindowMode: 'maximized' },
        vAxis: { title: "Rating"},
        legend: "none",
        trendlines: { 0: {} }    // Draw a trendline for data series 0.
    };

    let chart = new google.visualization.ScatterChart(document.getElementById("linear_regression"));
    chart.draw(dataTable, options);

    window.addEventListener('resize', () => {
        chart.draw(dataTable, options);
    });
}

function computeGraphData(){
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

    window.addEventListener('resize', () => chart.draw(dataTable, options));
}
