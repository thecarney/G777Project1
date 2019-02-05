/* ATTRIBUTIONS */

// call initialize function after page ready
$(document).ready(initialize);

// starting point for script
function initialize() {
    // initialize all tooltips
    $(function () {$('[data-toggle="tooltip"]').tooltip({ trigger: "hover" })});

    // resize function wraps the main function to allow responsive sizing
    resize(map());
}

// Main script. All functions except "resize" are within map(). This main function returns the map object to allow the
// resize function to work.
function map() {
    require(["esri/map",  "dojo/dom",  "dojo/on",  "dojo/dom-class",  "dojo/_base/json",  "esri/config",  "esri/request",
        "esri/graphic",  "esri/layers/FeatureLayer",  "esri/tasks/FeatureSet",  "esri/geometry/jsonUtils",
        "esri/symbols/SimpleMarkerSymbol",  "esri/dijit/PopupTemplate", "esri/geometry/Point", "dojo/_base/array",
        "esri/layers/Field",  "esri/renderers/SimpleRenderer",  "esri/dijit/Legend", "esri/geometry/Polygon",
        "esri/geometry/Extent", "esri/InfoTemplate", "esri/Color", "esri/symbols/SimpleFillSymbol",
        "esri/symbols/SimpleLineSymbol", "esri/dijit/BasemapGallery", "esri/dijit/HomeButton", "esri/dijit/Scalebar",
        "esri/dijit/LayerList", "esri/dijit/LayerSwipe", "dijit/layout/BorderContainer", "dijit/layout/ContentPane", "dojo/domReady!"],
        function(Map,  dom,  on,  domClass,  dojoJson,  esriConfig,  esriRequest,  Graphic,  FeatureLayer,  FeatureSet,
                 geometryJsonUtils,  SimpleMarkerSymbol, PopupTemplate, Point, arrayUtils, Field, SimpleRenderer, Legend,
                 Polygon, Extent, InfoTemplate, Color, SimpleFillSymbol, SimpleLineSymbol, BasemapGallery, HomeButton,
                 Scalebar, LayerList, LayerSwipe) {

        // vars
        var map;
        //var finalLayerWells;
        //var finalLayerCancer;

        // make map with basic buttons/functions  --------------------------------------------------------------------------------------------------  Make blank map
        map = new Map("map", {basemap: "gray", center: [-89.9926, 44.7318], zoom: 7 });
        // scalebar
        var scalebar = new Scalebar({map: map, scalebarUnit: "dual"});
        // reset extent
        $( "#HomeButton" ).click(function() {map.centerAndZoom([-89.9926, 44.7318],7);});
        // switch basemaps within a popover
        $("#basemapToggle").popover({
            html: true,
            content: function(){  // set the correct button to "active" when popover opens
                if (map.getBasemap() == "gray"){
                    $("#bm1").addClass("active").siblings().removeClass("active");
                } else if (map.getBasemap() == "hybrid") {
                    $("#bm2").addClass("active").siblings().removeClass("active");
                } else if (map.getBasemap() == "streets") {
                    $("#bm3").addClass("active").siblings().removeClass("active");
                } else {
                    $("#bm4").addClass("active").siblings().removeClass("active");
                }
                var content = $(this).attr("data-popover-content");
                return $(content).children(".popover-body").html();
            },
            title: function(){
                var title = $(this).attr("data-popover-content");
                return $(title).children(".popover-heading").html();
            }
        });
        // set listeners to change basemap on button click
        $(document).on("click","#basemapSelectorButtons button", function(){
           if (this.id == "bm1") {
               map.setBasemap("gray");
               $(this).addClass("active").siblings().removeClass("active");
           } else if (this.id == "bm2") {
               map.setBasemap("hybrid");
               $(this).addClass("active").siblings().removeClass("active");
           } else if (this.id == "bm3") {
               map.setBasemap("streets");
               $(this).addClass("active").siblings().removeClass("active");
           } else {
               map.setBasemap("topo");
               $(this).addClass("active").siblings().removeClass("active");
           }
        });


        // flow for loading default data  -------------------------------------------------------------------------------------  Function call chain on map load
        map.on("load", function () {
            console.log("call WELL functions");
            getDataWellPoints()
                .then(createGraphicsWellPoints)
                .then(createLayerWellPoints)
                .otherwise(errback);
            getDataCancer()
                 .then(createGraphicsCancer)
                 .then(createLayerCancer)
                 //.then(createLegend)
                 .then(createLayerWidget)
                 .then(createLayerSwipeWidget)
                 .then(runUserAnalysis)
                 .otherwise(errback);
        });


        // load well points json
        function getDataWellPoints() {
            var request = esriRequest({
                //location of data  (TEMPORARY LOCAL FILE.) ------------------------------------------------------------------------TEMP
                url: "data/wellNitrate_wm.geojson", //https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/1.0_day.geojson
                handleAs: "json"
            });
            console.log("got WELL json");
            return request;
        }

        // load cancer json
        function getDataCancer() {
            var request = esriRequest({
                //location of data  (TEMPORARY LOCAL FILE.) ------------------------------------------------------------------------TEMP
                url: "data/hex50cancer.geojson", //https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/1.0_day.geojson
                handleAs: "json"
            });
            console.log("got CANCER json");
            return request;
        }

        //make graphics for well points
        function createGraphicsWellPoints(response){
            // Create an array of Graphics from each GeoJSON feature
            var graphics = arrayUtils.map(response.features, function(feature, i) {
                return new Graphic(
                    new Point({
                        x: feature.geometry.coordinates[0],
                        y: feature.geometry.coordinates[1]
                    }), null,
                    {
                        FID: i,
                        title: feature.properties.FID,
                        nitr_ran: feature.properties.nitr_ran
                    }
                );
            });
            console.log("made WELL graphics");
            return graphics;
        }

        // make graphics for cancer
        function createGraphicsCancer(response){
            var geoJson = response.data;
            var graphics = arrayUtils.map(response.features, function(feature,i){
                return new Graphic (
                    new Polygon({
                        rings: feature.geometry.coordinates
                    }), null,
                    {
                        OBJECTID: i,
                        cancerToHexTable_MEAN: feature.properties.cancerToHexTable_MEAN
                    }
                );
            });
            console.log("made CANCER graphcics");
            return graphics;
        }

        // make layer for well points
        function createLayerWellPoints(graphics) {
            var featureCollection = {
                "layerDefinition": null,
                "featureSet": {
                    "features": graphics,
                    "geometryType": "esriGeometryPoint"
                }
            };

            featureCollection.layerDefinition = {
                "geometryType": "esriGeometryPoint",
                "objectIdField": "FID",
                "drawingInfo": {
                    "renderer": {
                        "type": "simple",
                        "symbol": {
                            "color": [80,80,80,255],
                            "size": 4,
                            "angle": 0,
                            "xoffset": 0,
                            "yoffset": 0,
                            "type": "esriSMS",
                            "style": "esriSMSCircle",
                            "outline": {
                                "color": [130,130,130,255],
                                "width": .5,
                                "type": "esriSLS",
                                "style": "esriSLSSolid"
                            }
                        },
                    }
                },
                "fields": [{
                    name: "FID",
                    alias: "FID",
                    type: "oid"
                }, {
                    name: "TARGET_FID",
                    alias: "TARGET_FID",
                    type: "double"
                }, {
                    name: "nitr_ran",
                    alias: "nitr_ran",
                    type: "double"
                }]
            };

            var popupTemplate = new PopupTemplate({
                title: "FID: {FID}",
                description: "Nitrate: {nitr_ran}"
            });

            var layerWells = new FeatureLayer(featureCollection, {
                infoTemplate: popupTemplate,
                id: "Well_Points"
            });

            map.addLayer(layerWells);
            console.log("made WELLS layer");
            //finalLayerWells = layerWells;
            return layerWells;

        }  // end featureCollection function

        // make layer for cancer
        function createLayerCancer(graphics){
            var featureCollection = {
                "layerDefinition": null,
                "featureSet": {
                    "features": graphics,
                    "geometryType": "esriGeometryPolygon"
                }
            };

            var rendererCancer = new SimpleRenderer(new SimpleFillSymbol().setOutline(new SimpleLineSymbol().setWidth(0.25).setColor(new Color([128,128,128]))));
            rendererCancer.setColorInfo({
                field: "cancerToHexTable_MEAN",
                minDataValue: 0,
                maxDataValue: 1,
                colors: [
                    new Color([255,247,236]),
                    new Color([254,232,200]),
                    new Color([252,212,158]),
                    new Color([253,187,132]),
                    new Color([252,141,89]),
                    new Color([239,101,72]),
                    new Color([215,48,31]),
                    new Color([179,0,0]),
                    new Color([127,0,0]),
                ]
            });

            featureCollection.layerDefinition = {
                "geometryType": "esriGeometryPolyon",
                "objectIdField": "OBJECTID",
                "drawingInfo": {
                    "renderer": {}
                },
                "fields": [{
                    name: "OBJECTID",
                    alias: "OBJECTID",
                    type: "oid"
                }, {
                    name: "cancerToHexTable_MEAN",
                    alias: "MEAN",
                    type: "double"
                }]
            };

            var popupTemplate = new PopupTemplate({
                title: "ID: {OBJECTID}",
                description: "Mean Cancer Rate: {cancerToHexTable_MEAN}"
            });

            var layerCancer = new FeatureLayer(featureCollection, {
                infoTemplate: popupTemplate,
                id: "Cancer_Rate"
            });

            layerCancer.setRenderer(rendererCancer);
            layerCancer.setOpacity(.75);

            //layerCancer.on("load",console.log("hmmm"));

            console.log("made CANCER layer");
            //finalLayerCancer = layerCancer;
            map.addLayer(layerCancer);
            return layerCancer;
        }

        // create and update legend
        // function createLegend(layer){
        //
        //     legend = new Legend({
        //         map: map,
        //         layerInfos: [{
        //             layer: finalLayerWells,
        //             title: "Wells"
        //         },{
        //             layer: finalLayerCancer,
        //             title: "Cancer"
        //         }]
        //     }, "legendDiv");
        //     legend.startup();
        //
        //     $("#legendToggle").popover({
        //         html: true,
        //         content: function(){
        //             var content = $(this).attr("data-popover-content");
        //             return $(content).children(".popover-body").html();
        //         },
        //         title: function(){
        //             var title = $(this).attr("data-popover-content");
        //             return $(title).children(".popover-heading").html();
        //         }
        //     });
        // }

        // create layer visibilty toggle widget
        function createLayerWidget(){
            // special array format to pass to Layer List Widget
            let layers = [
                {
                layer: map.getLayer("Well_Points"), // required unless featureCollection.
                //featureCollection: featureCollection, // required unless layerObject. If the layer is a feature collection, should match AGOL feature collection response and not have a layerObject.
                showSubLayers: true, // optional, show sublayers for this layer. Defaults to the widget's 'showSubLayers' property.
                showLegend: true, // optional, display a legend for the layer items.
                //content: <domNode>, // optional, custom node to insert content. It appears below the title.
                showOpacitySlider: true, // optional, display the opacity slider for layer items.
                //button: <domNode>, // optional, custom button node that will appear within the layer title.
                visibility: true, // optionally set the default visibility
                //id: "Well_Points" // optionally set the layer's id
                },
                {
                //additional layer
                layer: map.getLayer("Cancer_Rate"), // required unless featureCollection.
                //featureCollection: featureCollection, // required unless layerObject. If the layer is a feature collection, should match AGOL feature collection response and not have a layerObject.
                showSubLayers: true, // optional, show sublayers for this layer. Defaults to the widget's 'showSubLayers' property.
                showLegend: true, // optional, display a legend for the layer items.
                //content: <domNode>, // optional, custom node to insert content. It appears below the title.
                showOpacitySlider: true, // optional, display the opacity slider for layer items.
                //button: <domNode>, // optional, custom button node that will appear within the layer title.
                visibility: true, // optionally set the default visibility
                //id: "Well_Points" // optionally set the layer's id
                }
            ];

            // make Layer List Widget
            var layerList = new LayerList({
                map: map,
                layers: layers,
                showLegend: true,
                showSubLayers: true,
                showOpacitySlider: true
            }, "layerList");
            layerList.startup();
        }

        function createLayerSwipeWidget(){
            let sliderPosition = parseInt($("#map").width()/2);
            var layerSwipe = new LayerSwipe({
                type: "vertical",
                top: 0,
                left: sliderPosition,
                map: map,
                layers: [ map.getLayer("Cancer_Rate").id]
            }, "layerSwipeWidgetDIV");
            layerSwipe.startup();
        }


        function runUserAnalysis(){
            let specifiedPower = 0;
            let baseURL = "https://geog777proj1.localtunnel.me/idw/";

            // get user param
            $("#runButton").click(function(){
               specifiedPower = $("#userEnteredPower").val();
               console.log(specifiedPower);


               if (specifiedPower == 0) {  // need val 1 or greater
                   requestSend = 0;
                   alert("Please enter an interger greater than or equal to 1")

               } else { // do request
                   requestSend = 1;

                   // open simple loading modal
                   $("#modalLoadingData").modal({backdrop:"static", keyboard:false});
                   $("#modalLoadingData").modal("show");

                   // make request and await response
                   fetch(toString(baseURL+specifiedPower)).then(function(response) {
                       // on response, close modal
                       console.log("got a response");
                       console.log(toString(response));
                       $("#modalLoadingData").modal("hide");

                       // use response to make new layers



                    });

               }
               console.log(requestSend);
            });
        }






        // Executes if data retrieval was unsuccessful.
        function errback(error) {
            console.error("Something went wrong:  ", error);
        }


    });  // end main REQUIRE function



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
        $("#panelCard").css({"height": newMapHeight});

        // adjust body padding
        //$('body').css({"padding-top": navbarHeight});

        //force Leaflet redraw
        //map.resize();

    }).trigger("resize");
}