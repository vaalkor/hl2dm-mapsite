'use strict';

google.charts.load("current", { packages: ["corechart", 'bar', 'calendar'] });
var _scrapeData = { MapInfo: [], MapRatingGraphData: [] };
var _dayPrettyPrint = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' }
var _ratingsPerWeekday = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
var _averageRatingPerDay = { 0: {count:0,totalRating:0}, 1: {count:0,totalRating:0}, 2: {count:0,totalRating:0}, 3: {count:0,totalRating:0}, 4: {count:0,totalRating:0}, 5: {count:0,totalRating:0}, 6: {count:0,totalRating:0} }

fetch("scrape_data.json")
.then((x) => x.json())
.then((data) => {
    _scrapeData = data;
    google.charts.setOnLoadCallback(drawCharts);
});

var charts = [];

function recalculateMapRatingProgress(){
    // Recalculate map rating progress data
    const counts = {};
    for(let map of _scrapeData.MapInfo){
        if(!map.InitialRatingTimestamp)
            continue;

        if(!(map.InitialRatingTimestamp in counts)){
            counts[map.InitialRatingTimestamp] = {
                timestamp: map.InitialRatingTimestamp,
                count: 1
            }
        }else{
            counts[map.InitialRatingTimestamp].count++
        }
    }
    _scrapeData.MapRatingGraphData = Object.values(counts);
    _scrapeData.MapRatingGraphData.sort((a,b) => a.timestamp <= b.timestamp ? -1 : 1);
    for(let i=1; i<_scrapeData.MapRatingGraphData.length; i++)
        _scrapeData.MapRatingGraphData[i].count += _scrapeData.MapRatingGraphData[i-1].count;
}

function drawCharts() {
    recalculateMapRatingProgress();
    computeGraphData();

    updateAverageRating();
    createLabelGraph();
    drawRatingProgress();
    drawRatingsPerWeekday();
    drawAverageRatingsPerWeekday();
    plotRatingLinearRegression();
    drawRatingsPerMonth();

    drawWeaponPopularity();
    drawRatingDistribution();
    drawRatingsPerYear();
    drawRatingCalendar();

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            charts.forEach((chart) => {
                if (chart.onResize) {
                    chart.onResize(chart);
                } else {
                    chart.chart.draw(chart.dataTable, chart.options);
                }
            });
        }, 100);
    });
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

    document.getElementById("average_rating").innerText = `${totalRating / count}`.substring(0, 4);
}

function createLabelGraph() {
    let tagRatings = {};
    let tagCounts = {};

    for (let map of _scrapeData.MapInfo) {
        if (!map.RobLabels)
            continue;

        for (let tag of map.RobLabels) {
            if (tag == "NoTripmines") continue;

            if (!(tag in tagRatings)) {
                tagRatings[tag] = 0;
                tagCounts[tag] = 0;
            }

            tagCounts[tag]++;

            if (map.RobRating != null)
                tagRatings[tag] += map.RobRating;
        }
    }

    let averageRatings = Object.keys(tagRatings).map((tag) => [tag, tagRatings[tag] / tagCounts[tag]]);
    let labelCounts = Object.keys(tagCounts).map((tag) => [tag, tagCounts[tag]]);

    averageRatings.sort((a, b) => b[1] - a[1]);
    labelCounts.sort((a, b) => b[1] - a[1]);

    var averageRatingDataTable = google.visualization.arrayToDataTable([['Tag', 'AverageRating']].concat(averageRatings));
    var labelCountDataTable = google.visualization.arrayToDataTable([['Tag', 'Label Count']].concat(labelCounts));


    let averageRatingOptions = {
        vAxis: { title: 'Tag' },
        hAxis: { title: 'Rating' },
        legend: 'none',
        chartArea: { left: 160, right: 30, top: 50, bottom: 50 }
    };

    let chart = new google.visualization.BarChart(document.getElementById('average_rating_per_label_chart'));
    chart.draw(averageRatingDataTable, averageRatingOptions);

    charts.push({
        chart: chart,
        dataTable: averageRatingDataTable,
        options: averageRatingOptions
    });

    let labelCountOptions = {
        vAxis: { title: 'Tag' },
        hAxis: { title: 'Count' },
        legend: 'none',
        chartArea: { left: 160, right: 30, top: 50, bottom: 50 }
    };

    chart = new google.visualization.BarChart(document.getElementById('label_counts_chart'));
    chart.draw(labelCountDataTable, labelCountOptions);

    charts.push({
        chart: chart,
        dataTable: labelCountDataTable,
        options: labelCountOptions
    });
}

function drawRatingsPerMonth() {
    let currentDate = new Date();
    let monthCounts = Array(12).fill(0);

    for (let map of _scrapeData.MapInfo) {
        if (map.InitialRatingTimestamp) {
            let ratingDate = new Date(map.InitialRatingTimestamp * 1000);
            let monthDiff = (currentDate.getFullYear() - ratingDate.getFullYear()) * 12 + (currentDate.getMonth() - ratingDate.getMonth());
            if (monthDiff < 12) {
                monthCounts[11 - monthDiff]++;
            }
        }
    }

    let data = [['Month', 'Maps Rated']].concat(
        monthCounts.map((count, index) => {
            let date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 11 + index, 1);
            return [date.toLocaleString('default', { month: 'short' }), count];
        })
    );

    let dataTable = new google.visualization.arrayToDataTable(data);

    let options = {
        hAxis: { title: 'Month' },
        vAxis: { title: 'Maps Rated' },
        legend: 'none',
        chartArea: { width: '85%', height: '75%' }
    };

    let chart = new google.visualization.ColumnChart(document.getElementById('rating_per_month_chart'));
    chart.draw(dataTable, options);

    charts.push({
        chart: chart,
        dataTable: dataTable,
        options: options
    });
}

function drawRatingProgress() {
    let graphData =
        [["Date", "Total Rated"]].concat(
            _scrapeData.MapRatingGraphData.map((x) => [new Date(x.timestamp * 1000), x.count])
        );
    let lastDataPoint = _scrapeData.MapRatingGraphData[_scrapeData.MapRatingGraphData.length - 1];
    // push a datapoint with the current date to get a flat line at the end.
    graphData.push([new Date(), lastDataPoint[1]]);
    var dataTable = google.visualization.arrayToDataTable(graphData);

    var options = {
        curveType: "function",
        legend: { position: "bottom" },
        chartArea: { width: '85%', height: '75%' }
    };

    var chart = new google.visualization.LineChart(
        document.getElementById("rating_progress_chart")
    );

    chart.draw(dataTable, options);
    charts.push({
        chart: chart,
        dataTable,
        options
    });

}

function plotRatingLinearRegression() {
    let regressionData = _scrapeData.MapInfo
        .filter(x => x.RobRating)
        .sort((a, b) => a.InitialRatingTimestamp - b.InitialRatingTimestamp)
        .map((x, idx) => [idx, x.RobRating])

    let graphData = [["Index", "Rating"]].concat(regressionData);
    let dataTable = google.visualization.arrayToDataTable(graphData);

    let options = {
        hAxis: { title: "Maps rated", viewWindowMode: 'maximized' },
        vAxis: { title: "Rating" },
        legend: "none",
        trendlines: { 0: {} },    // Draw a trendline for data series 0.
        chartArea: { width: '85%', height: '75%' }
    };

    let chart = new google.visualization.ScatterChart(document.getElementById("linear_regression_chart"));
    chart.draw(dataTable, options);

    charts.push({
        chart: chart,
        dataTable,
        options
    });
}

function computeGraphData() {
    let total = 0;
    for (let map of _scrapeData.MapInfo.filter(x => x.InitialRatingTimestamp)) {
        total++;
        const day = new Date(map.InitialRatingTimestamp * 1000).getDay();
        _ratingsPerWeekday[day]++;
        if(map.RobRating != null){
            _averageRatingPerDay[day].count++;
            _averageRatingPerDay[day].totalRating+=map.RobRating;
        }
    }
    for(var day of Object.keys(_averageRatingPerDay)){
        _averageRatingPerDay[day] = _averageRatingPerDay[day].totalRating / _averageRatingPerDay[day].count;
    }
    for (const key in _ratingsPerWeekday) {
        _ratingsPerWeekday[key] = _ratingsPerWeekday[key] / total * 100;
    }
}
function drawRatingsPerWeekday() {

    let data = [['Day', '% Rated', { role: 'annotation' }]]
        .concat(
            Object.keys(_ratingsPerWeekday).map(x => [_dayPrettyPrint[x], _ratingsPerWeekday[x], `${_ratingsPerWeekday[x].toFixed(2)}%`])
        );

    let dataTable = new google.visualization.arrayToDataTable(data);

    let options = {
        hAxis: { title: 'Day' },
        vAxis: { title: '% Rated' },
        legend: 'none',
        chartArea: { width: '85%', height: '75%' }
    };

    let chart = new google.visualization.ColumnChart(document.getElementById('rating_per_weekday_chart'));

    chart.draw(dataTable, options);

    charts.push({
        chart: chart,
        dataTable,
        options
    });
}

function drawAverageRatingsPerWeekday() {
    let data = [['Day', 'Average rating', { role: 'annotation' }]]
        .concat(
            Object.keys(_ratingsPerWeekday).map(x => [_dayPrettyPrint[x], _averageRatingPerDay[x], `${_averageRatingPerDay[x].toFixed(2)}`])
        );

    let dataTable = new google.visualization.arrayToDataTable(data);

    let options = {
        hAxis: { title: 'Day' },
        vAxis: { title: 'Average rating' },
        legend: 'none',
        chartArea: { width: '85%', height: '75%' }
    };

    let chart = new google.visualization.ColumnChart(document.getElementById('average_rating_per_weekday_chart'));

    chart.draw(dataTable, options);

    charts.push({
        chart: chart,
        dataTable,
        options
    });
}

function drawWeaponPopularity() {
    let weaponCounts = {};

    for (let map of _scrapeData.MapInfo) {
        if (!map.Weapons) continue;
        for (let w of map.Weapons) {
            if (!(w in weaponCounts)) {
                weaponCounts[w] = 0;
            }
            weaponCounts[w]++;
        }
    }

    let popData = [['Weapon', 'Count']];
    let sortedPop = Object.keys(weaponCounts)
        .filter(w => weaponCounts[w] >= 20)
        .sort((a,b) => weaponCounts[a] - weaponCounts[b]);
    for (let w of sortedPop) popData.push([w, weaponCounts[w]]);

    let popTable = google.visualization.arrayToDataTable(popData);
    let popOptions = { legend: 'none', chartArea: { width: '85%', height: '75%' } };
    let popChart = new google.visualization.ColumnChart(document.getElementById('weapon_popularity_chart'));
    popChart.draw(popTable, popOptions);
    charts.push({ chart: popChart, dataTable: popTable, options: popOptions });
}

function drawRatingDistribution() {
    let data = [["Map", "Rating"]];
    for (let map of _scrapeData.MapInfo) {
        if (map.RobRating != null) {
            data.push([map.Name, map.RobRating]);
        }
    }

    let table = google.visualization.arrayToDataTable(data);
    let options = {
        legend: { position: 'none' },
        histogram: { bucketSize: 0.5 },
        hAxis: { title: "Rating" },
        vAxis: { title: "Number of Maps" },
        chartArea: { width: '85%', height: '75%' }
    };

    let chart = new google.visualization.Histogram(document.getElementById('rating_distribution_chart'));
    chart.draw(table, options);
    charts.push({ chart: chart, dataTable: table, options: options });
}

function drawRatingsPerYear() {
    let yearCounts = {};

    for (let map of _scrapeData.MapInfo.filter(x => x.InitialRatingTimestamp)) {
        let year = new Date(map.InitialRatingTimestamp * 1000).getFullYear();
        if (!yearCounts[year]) {
            yearCounts[year] = 0;
        }
        yearCounts[year]++;
    }

    let data = [['Year', 'Maps Rated']];
    let sortedYears = Object.keys(yearCounts).sort((a,b) => parseInt(a) - parseInt(b));
    for (let y of sortedYears) {
        data.push([y, yearCounts[y]]);
    }

    let table = google.visualization.arrayToDataTable(data);
    let options = {
        legend: 'none',
        chartArea: { width: '85%', height: '75%' },
        hAxis: { title: 'Year' },
        vAxis: { title: 'Maps Rated' }
    };

    let chart = new google.visualization.ColumnChart(document.getElementById('ratings_per_year_chart'));
    chart.draw(table, options);
    charts.push({ chart: chart, dataTable: table, options: options });
}

function drawRatingCalendar() {
    let dayCounts = {};

    for (let map of _scrapeData.MapInfo.filter(x => x.InitialRatingTimestamp)) {
        let d = new Date(map.InitialRatingTimestamp * 1000);
        // Normalize to midnight to group by day
        let dateKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        
        if (!dayCounts[dateKey]) {
            dayCounts[dateKey] = 0;
        }
        dayCounts[dateKey]++;
    }

    let data = new google.visualization.DataTable();
    data.addColumn({ type: 'date', id: 'Date' });
    data.addColumn({ type: 'number', id: 'Maps Rated' });

    for (let dateKey in dayCounts) {
        data.addRow([new Date(parseInt(dateKey)), dayCounts[dateKey]]);
    }

    // Google Calendar charts stack years vertically. Calculate approximate height needed.
    let years = new Set();
    for (let dateKey in dayCounts) {
        years.add(new Date(parseInt(dateKey)).getFullYear());
    }
    let numYears = years.size || 1;
    let chartHeight = numYears * 170; 

    let options = {
        height: chartHeight,
        width: 1050,
        calendar: {
            cellSize: 16,
            cellColor: { stroke: '#e0e0e0', strokeOpacity: 0.5, strokeWidth: 1 },
            focusedCellColor: { stroke: '#d3362d', strokeOpacity: 1, strokeWidth: 1 },
            monthOutlineColor: { stroke: '#981b48', strokeOpacity: 0.8, strokeWidth: 2 },
            unusedMonthOutlineColor: { stroke: '#bc5679', strokeOpacity: 0.8, strokeWidth: 1 },
            underMonthSpace: 16,
        },
        colorAxis: {
            colors: ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127']
        }
    };

    let chartObj = {
        chart: new google.visualization.Calendar(document.getElementById('rating_calendar_chart')),
        dataTable: data,
        options: options
    };
    
    chartObj.chart.draw(chartObj.dataTable, chartObj.options);
    charts.push(chartObj);
}

