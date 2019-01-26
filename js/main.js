/* ATTRIBUTIONS */

// call initialize function after page ready
$(document).ready(initialize);

// starting point for script
function initialize() {

    // // enable bootstrap tooltips
    // $(function () {
    //     $('[data-toggle="tooltip"]').tooltip();
    //
    // });



    // resize function wraps the main function to allow responsive sizing
    resize(map());

    // show splash screen on page load
    //$("#splashModal").modal('show');

};

// Main script. All functions except "resize" are within map(). This main function returns the map object to allow the
// resize function to work.

function map() {
    // do stuff

    var map;

    require(["esri/map", "dojo/domReady!"], function(Map) {
        var map = new Map("map", {
            center: [-89.9926, 44.7318],
            zoom: 6,
            basemap: "gray"
        });
    });




    // return map object
    return map;
}

function resize(map) {
    // window resize listener
    $(window).on("resize", function () {

        // make map height responsive to available space
        //   get heights
        let navbarHeight = $("#header1").outerHeight();
        let footerHeight = $("#footer1").outerHeight();
        let windowHeight = $(window).outerHeight();

        // set new map height
        let newMapHeight = windowHeight - navbarHeight - footerHeight - (.03*windowHeight);
        $("#mainCard").css({"height": newMapHeight});

        // adjust body padding
        //$('body').css({"padding-top": navbarHeight});

        //force Leaflet redraw
        //map.resize();

    }).trigger("resize");
}