// Create kmeans model
var kmeans, interval;
// Create related data for kmeans
var dataset, labels, N;
var means;
var k_cluster;
// D3 SVG drawing paramaters
var iter, maxIter, centroids, points;
var margin, width, height;
var w, h;
var colors, svg, group;

function random_data(num, dim, range) {

    if (!num) {
        num = 40;
    }
    if (!dim) {
        dim = 2;
    }

    if (!range) {
        range = [0, 1.0];
    }

    dataset = [];
    labels = [];
    for (var k = 0; k < num; k++) {
        var tmp = new easymljs.Vol([easymljs.randf(range[0], range[1]), easymljs.randf(range[0], range[1])]);
        dataset.push(tmp);
        labels.push(-1);
    }
    N = labels.length;
}


function updateKmeans() {
    var start = new Date().getTime();

    kmeans.assignLabels(dataset, labels);
    kmeans.moveMeans();

    var end = new Date().getTime();
    var time = end - start;

    console.log('K-means Loss = ' + kmeans.loss + ', one move in ' + time + 'ms');
}

function updateSVG() {

    var data = points.concat(centroids);
    // The data join
    var circle = group.selectAll("circle")
        .data(data);

    // Create new elements as needed
    circle.enter().append("circle")
        .attr("id", function (d) {
            return d.id;
        })
        .attr("class", function (d) {
            return d.type;
        })
        .attr("r", 5);

    // Update old elements as needed
    circle.transition().delay(100).duration(1000)
        .attr("cx", function (d) {
            return d.x;
        })
        .attr("cy", function (d) {
            return d.y;
        })
        .style("fill", function (d) {
            return d.fill;
        });

    // Remove old nodes
    circle.exit().remove();
}

function initializeSVG() {

    w = 500;
    h = 500;
    centroids = [];
    points = [];

    margin = {top: 30, right: 20, bottom: 30, left: 30};
    width = w - margin.left - margin.right;
    height = h - margin.top - margin.bottom;

    colors = d3.scale.category20().range();

    console.log(colors);

    d3.select("svg").remove();

    svg = d3.select('#kmeans').append("svg")
        .style("width", width + margin.left + margin.right)
        .style("height", height + margin.top + margin.bottom);

    group = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("g")
        .append("text")
        .attr("class", "label")
        .attr("transform", "translate(" + ( margin.left ) +
            "," + (height + margin.top + margin.bottom) + ")")
        .text("");
}


function vol_to_svgPoints(data, type) {

    function svgPoint(point, type, color) {
        return {
            x: Math.round(point.w[0] * width),
            y: Math.round(point.w[1] * height),
            type: type,
            fill: color
        };
    }

    var result = [];
    var num = data.length;
    for (var i = 0; i < num; i++) {
        var color = colors[i];
        if (type !== "centroid") {
            color = "#ccc";
        }
        var point = svgPoint(data[i], type, color);
        point.id = point.type + "-" + i;
        result.push(point);
    }
    return result;
}

function setText(text) {
    svg.selectAll(".label").text(text);
}

function colorizePoints(points, labels) {

    var tn = labels.length;
    for (var i = 0; i < tn; i++) {
        points[i].fill = colors[labels[i]];
    }
}

function iterate() {

    setText("Iteration " + iter + " of " + maxIter);

    colorizePoints(points, kmeans.labels);
    centroids = vol_to_svgPoints(kmeans.means, 'centroid');
    updateKmeans();
    updateSVG();

}

function initialize(iters) {

    initializeSVG();
    centroids = vol_to_svgPoints(kmeans.means, 'centroid');
    points = vol_to_svgPoints(dataset, 'point');

    updateSVG();

    iter = 1;
    maxIter = iters || 10;

    interval = setInterval(function () {
        if (iter < maxIter + 1) {
            iterate();
            iter++;
            console.log(iter, maxIter);
        }
        else {
            clearInterval(interval);
            setText("Done");
        }
    }, 1000);


}

function startKmeans() {
    clearInterval(interval);
    var num = parseInt(document.getElementById("n_input").value),
        dim = 2,
        k = parseInt(document.getElementById("k_input").value),
        iters = parseInt(document.getElementById("i_input").value);
    console.log(num, k, iters);
    random_data(num, dim);
    kmeans = new easymljs.kmeans();
    kmeans.initMeans(k, dim);

    initialize(iters);
}

$(function () {
    // note, globals
    startKmeans()
});
