google.charts.load("current", { packages: ["corechart"] });
var _scrapeData = {MapInfo: [], MapRatingGraphData: []};

fetch("scrape_data.json").then((x) => x.json()).then((data) => {
    _scrapeData = data;
    google.charts.setOnLoadCallback(drawCharts);
});

function drawCharts()
{
    drawRatingProgress();
}

function drawRatingProgress() {
    var data = google.visualization.arrayToDataTable(
        [["Date", "Total Rated"]].concat(
            _scrapeData.MapRatingGraphData.map((x) => [new Date(x[0] * 1000), x[1]])
        )
    );

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
