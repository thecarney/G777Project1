/* ATTRIBUTIONS */

// call initialize function after page ready
$(document).ready(initialize);

// starting point for script
function initialize() {
    // initialize all tooltips
    $(function () {
        $('[data-toggle="tooltip"]').tooltip({trigger: "hover"})
    });

    // resize function wraps the main function to allow responsive sizing
    resize(map());
}

// Main script. All functions except "resize" are within map(). This main function returns the map object to allow the
// resize function to work.
function map() {
    require(["esri/map", "dojo/dom", "dojo/on", "dojo/dom-class", "dojo/_base/json", "esri/config", "esri/request",
            "esri/graphic", "esri/layers/FeatureLayer", "esri/tasks/FeatureSet", "esri/geometry/jsonUtils",
            "esri/symbols/SimpleMarkerSymbol", "esri/dijit/PopupTemplate", "esri/geometry/Point", "dojo/_base/array",
            "esri/layers/Field", "esri/renderers/SimpleRenderer", "esri/dijit/Legend", "esri/geometry/Polygon",
            "esri/geometry/Extent", "esri/InfoTemplate", "esri/Color", "esri/symbols/SimpleFillSymbol",
            "esri/symbols/SimpleLineSymbol", "esri/dijit/BasemapGallery", "esri/dijit/HomeButton", "esri/dijit/Scalebar",
            "esri/dijit/LayerList", "esri/dijit/LayerSwipe", "esri/renderers/ClassBreaksRenderer",
            "dijit/layout/BorderContainer", "dijit/layout/ContentPane", "dojo/domReady!"],
        function (Map, dom, on, domClass, dojoJson, esriConfig, esriRequest, Graphic, FeatureLayer, FeatureSet,
                  geometryJsonUtils, SimpleMarkerSymbol, PopupTemplate, Point, arrayUtils, Field, SimpleRenderer, Legend,
                  Polygon, Extent, InfoTemplate, Color, SimpleFillSymbol, SimpleLineSymbol, BasemapGallery, HomeButton,
                  Scalebar, LayerList, LayerSwipe, ClassBreaksRenderer) {

            // store some key info
            var map;
            var lastRequestedPower;
            var layerLegendWidget;
            var layerIdList = [];
            var legendCounter = 0;

            // make map
            map = new Map("map", {basemap: "gray", center: [-89.9926, 44.7318], zoom: 7});

            // add scalebar
            let scalebar = new Scalebar({map: map, scalebarUnit: "dual"});

            // reset extent listener
            $("#HomeButton").click(function () {
                map.centerAndZoom([-89.9926, 44.7318], 7);
            });

            // switch basemaps within a popover
            $("#basemapToggle").popover({
                html: true,
                content: function () {  // set the correct button to "active" when popover opens
                    if (map.getBasemap() == "gray") {
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
                title: function () {
                    var title = $(this).attr("data-popover-content");
                    return $(title).children(".popover-heading").html();
                }
            });
            // set listeners to change basemap on button click
            $(document).on("click", "#basemapSelectorButtons button", function () {
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

            // promise chain for loading default data
            map.on("load", function () {
                console.log("call WELL functions");
                getDataCancer()
                    .then(createGraphicsCancer)
                    .then(createLayerCancer)
                    .then(getDataWellPoints)
                    .then(createGraphicsWellPoints)
                    .then(createLayerWellPoints)
                    .then(createLayerWidget)
                    .then(runUserAnalysis)
                    .otherwise(errback);
            });

            // load well points json -- data is static and so loaded as a resource of the website
            function getDataWellPoints() {
                let request = esriRequest({
                    url: "data/wellNitrate_wm.geojson",
                    handleAs: "json"
                });
                console.log("got WELL json");
                return request;
            }

            //make graphics for well points
            function createGraphicsWellPoints(response) {
                // Create an array of Graphics from each GeoJSON feature
                let graphics = arrayUtils.map(response.features, function (feature, i) {
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

            // make layer for well points
            function createLayerWellPoints(graphics) {
                // make feature collection with graphics array
                let featureCollection = {
                    "layerDefinition": null,
                    "featureSet": {
                        "features": graphics,
                        "geometryType": "esriGeometryPoint"
                    }
                };

                // layer definition required to make layer from feature collection
                featureCollection.layerDefinition = {
                    "geometryType": "esriGeometryPoint",
                    "objectIdField": "FID",
                    "drawingInfo": {
                        "renderer": {}
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


                // popup specs
                let popupTemplate = new PopupTemplate({
                    title: "Well ID: {FID}",
                    fieldInfos: [
                        {fieldName: "nitr_ran", label: "Nitrate Measurement: ", visible: true, format: {places: 2}}
                    ]
                });

                // make the layer
                let layerWells = new FeatureLayer(featureCollection, {
                    infoTemplate: popupTemplate,
                    id: "Inputs  |  Well Sample Data"
                });

                let thisRenderer = new SimpleRenderer(new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 7, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([200, 200, 200]), 0.5), new Color([80, 80, 80])));

                layerWells.setRenderer(thisRenderer);


                // add to map
                map.addLayer(layerWells);
                // store layer id
                layerIdList.push("Inputs  |  Well Sample Data");

                console.log("made WELLS layer");
                return layerWells;
            }

            // load cancer json -- data is static and so loaded as a resource of the website
            function getDataCancer() {
                let request = esriRequest({
                    //location of data
                    url: "data/resultsTemplate_simple.json",
                    handleAs: "json"
                });
                console.log("got CANCER json");
                return request;
            }

            // make graphics for cancer
            function createGraphicsCancer(response) {

                let graphics = arrayUtils.map(response.features, function (feature, i) {
                    return new Graphic(
                        new Polygon({
                            rings: feature.geometry.coordinates
                        }), null,
                        {
                            OBJECTID: i,
                            meanCancerRate: feature.properties.meanCancerRate
                        }
                    );
                });
                console.log("made CANCER graphics");
                return graphics;
            }

            // make layer for cancer
            function createLayerCancer(graphics) {
                let featureCollection = {
                    "layerDefinition": null,
                    "featureSet": {
                        "features": graphics,
                        "geometryType": "esriGeometryPolygon"
                    }
                };

                let rendererCancer = new SimpleRenderer(new SimpleFillSymbol().setOutline(new SimpleLineSymbol().setWidth(0.25).setColor(new Color([128, 128, 128]))));
                rendererCancer.setColorInfo({
                    field: "meanCancerRate",
                    minDataValue: 0,
                    maxDataValue: 1,
                    colors: [
                        new Color([255, 247, 236]),
                        new Color([254, 232, 200]),
                        new Color([252, 212, 158]),
                        new Color([253, 187, 132]),
                        new Color([252, 141, 89]),
                        new Color([239, 101, 72]),
                        new Color([215, 48, 31]),
                        new Color([179, 0, 0]),
                        new Color([127, 0, 0]),
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
                        name: "meanCancerRate",
                        alias: "Mean",
                        type: "double"
                    }]
                };

                let popupTemplate = new PopupTemplate({
                    title: "Bin ID: {OBJECTID}",
                    fieldInfos: [
                        {fieldName: "meanCancerRate", label: "Mean Cancer Rate: ", visible: true, format: {places: 2}}
                    ]
                });

                let layerCancer = new FeatureLayer(featureCollection, {
                    infoTemplate: popupTemplate,
                    id: "Inputs  |  Mean Cancer Rate by Bin"
                });

                // apply renderer
                layerCancer.setRenderer(rendererCancer);
                layerCancer.setOpacity(.99);

                // store layer id
                layerIdList.push("Inputs  |  Mean Cancer Rate by Bin");

                // add to map
                map.addLayer(layerCancer);

                console.log("made CANCER layer");
                return layerCancer;
            }

            // make graphics for new user-defined layers
            function createGraphicsCustom([lyrType, response]) {
                //let geoJson = response.data;

                // store min and max values for each field to be passed to renderer for color ramp scaling
                let meanCancerRateMIN = Infinity;
                let meanCancerRateMAX = -Infinity;
                let predictedMIN = Infinity;
                let predictedMAX = -Infinity;
                let residualMIN = Infinity;
                let residualMAX = -Infinity;
                let stdresidMIN = Infinity;
                let stdresidMAX = -Infinity;

                let graphics = arrayUtils.map(response.features, function (feature, i) {

                    if (feature.properties.meanCancerRate < meanCancerRateMIN) {
                        meanCancerRateMIN = feature.properties.meanCancerRate;
                    }
                    if (feature.properties.meanCancerRate > meanCancerRateMAX) {
                        meanCancerRateMAX = feature.properties.meanCancerRate;
                    }

                    if (feature.properties.PREDICTED < predictedMIN) {
                        predictedMIN = feature.properties.PREDICTED;
                    }
                    if (feature.properties.PREDICTED > predictedMAX) {
                        predictedMAX = feature.properties.PREDICTED;
                    }

                    if (feature.properties.RESIDUAL < residualMIN) {
                        residualMIN = feature.properties.RESIDUAL;
                    }
                    if (feature.properties.RESIDUAL > residualMAX) {
                        residualMAX = feature.properties.RESIDUAL;
                    }

                    if (feature.properties.STDRESID < stdresidMIN) {
                        stdresidMIN = feature.properties.STDRESID;
                    }
                    if (feature.properties.STDRESID > stdresidMAX) {
                        stdresidMAX = feature.properties.STDRESID;
                    }

                    return new Graphic(
                        new Polygon({
                            rings: feature.geometry.coordinates
                        }), null,
                        {
                            OBJECTID: i,
                            meanCancerRate: feature.properties.meanCancerRate,
                            meanNitrateCon: feature.properties.meanNitrateCon,
                            PREDICTED: feature.properties.PREDICTED,
                            RESIDUAL: feature.properties.RESIDUAL,
                            STDRESID: feature.properties.STDRESID
                        }
                    );
                });
                console.log("made CUSTOM graphcics");

                console.log(meanCancerRateMIN);
                console.log(meanCancerRateMAX);
                console.log(predictedMIN);
                console.log(predictedMAX);
                console.log(residualMIN);
                console.log(residualMAX);
                console.log(stdresidMIN);
                console.log(stdresidMAX);


                createLayerCustom([lyrType, graphics, meanCancerRateMIN, meanCancerRateMAX, predictedMIN, predictedMAX, residualMIN, residualMAX, stdresidMIN, stdresidMAX]);
                // return [lyrType,graphics,meanCancerRateMIN,meanCancerRateMAX,predictedMIN,predictedMAX,residualMIN,residualMAX,stdresidMIN,stdresidMAX];
            }

            // make layer for new user-defined layers
            function createLayerCustom([lyrType, graphics, min1, max1, min2, max2, min3, max3, min4, max4]) {
                // makes a Feature Collection based on array of graphic objects
                let featureCollection = {
                    "layerDefinition": null,
                    "featureSet": {
                        "features": graphics,
                        "geometryType": "esriGeometryPolygon"
                    }
                };

                // defines a layer definition (necessary to make a Feature Layer from the Feature Collection)
                featureCollection.layerDefinition = {
                    "geometryType": "esriGeometryPolyon",
                    "objectIdField": "OBJECTID",
                    "drawingInfo": {
                        "renderer": {}
                    },
                    "fields": [{
                        name: "OBJECTID",
                        alias: "ID",
                        type: "oid"
                    }, {
                        name: "meanCancerRate",
                        alias: "Mean Cancer Rate",
                        type: "double"
                    }, {
                        name: "meanNitrateCon",
                        alias: "Mean Nitrate Concentration",
                        type: "double"
                    }, {
                        name: "PREDICTED",
                        alias: "Predicted Cancer Rate",
                        type: "double"
                    }, {
                        name: "RESIDUAL",
                        alias: "Residuals",
                        type: "double"
                    }, {
                        name: "STDRESID",
                        alias: "Standardized Residuals",
                        type: "double"
                    }]
                };

                // defines popop on click for this layer
                let popupTemplate = new PopupTemplate({
                    title: "Bin ID: {OBJECTID}",
                    fieldInfos: [
                        {fieldName: "meanCancerRate", label: "Mean Cancer Rate", visible: true, format: {places: 2}},
                        {
                            fieldName: "meanNitrateCon",
                            label: "Mean Nitrate Concentration",
                            visible: true,
                            format: {places: 2}
                        },
                        {fieldName: "PREDICTED", label: "Predicted Cancer Rate", visible: true, format: {places: 2}},
                        {fieldName: "RESIDUAL", label: "Raw Residual", visible: false, format: {places: 2}},
                        {fieldName: "STDRESID", label: "Standardized Residual", visible: true, format: {places: 2}},
                    ]
                });

                // name (id) for new layer in map
                let thisCustomLayerName = "Result  |  Power:" + lastRequestedPower + "  |  Layer:" + lyrType;

                // make the Feature Layer
                let layerCustom = new FeatureLayer(featureCollection, {
                    infoTemplate: popupTemplate,
                    id: thisCustomLayerName
                });

                // defines a renderer (symbology) for the layer
                let thisRenderer;

                if (new String(lyrType).valueOf() == new String("Predicted Cancer Rate").valueOf()) {
                    console.log("make a prediction layer");
                    console.log(min2);
                    console.log(max2);
                    // PURPLE color ramp renderer for predicted cancer rates
                    thisRenderer = new SimpleRenderer(new SimpleFillSymbol().setOutline(new SimpleLineSymbol().setWidth(0.25).setColor(new Color([128, 128, 128]))));
                    thisRenderer.setColorInfo({
                        field: "PREDICTED",
                        minDataValue: min2,
                        maxDataValue: max2,
                        colors: [
                            new Color([252, 251, 253]),
                            new Color([239, 237, 245]),
                            new Color([218, 218, 235]),
                            new Color([188, 189, 220]),
                            new Color([158, 154, 200]),
                            new Color([128, 125, 186]),
                            new Color([106, 81, 163]),
                            new Color([84, 39, 143]),
                            new Color([63, 0, 125]),
                        ]
                    });
                } else {
                    console.log("make a standard residuals layer");
                    // RED-WHITE-BLUE class breaks renderer for standard residuals
                    let simpleSymbol = new SimpleFillSymbol().setOutline(new SimpleLineSymbol().setWidth(0.25).setColor(new Color([128, 128, 128])));
                    //thisRenderer = new ClassBreaksRenderer(simpleSymbol);
                    thisRenderer = new ClassBreaksRenderer(simpleSymbol, "STDRESID");
                    thisRenderer.addBreak(-Infinity, -2.5, new SimpleFillSymbol().setOutline(new SimpleLineSymbol().setWidth(0.25)).setColor(new Color([95, 135, 193])));
                    thisRenderer.addBreak(-2.5, -1.5, new SimpleFillSymbol().setOutline(new SimpleLineSymbol().setWidth(0.25)).setColor(new Color([153, 173, 198])));
                    thisRenderer.addBreak(-1.5, -0.5, new SimpleFillSymbol().setOutline(new SimpleLineSymbol().setWidth(0.25)).setColor(new Color([202, 213, 202])));
                    thisRenderer.addBreak(-0.5, 0.5, new SimpleFillSymbol().setOutline(new SimpleLineSymbol().setWidth(0.25)).setColor(new Color([249, 254, 204])));
                    thisRenderer.addBreak(0.5, 1.5, new SimpleFillSymbol().setOutline(new SimpleLineSymbol().setWidth(0.25)).setColor(new Color([249, 198, 151])));
                    thisRenderer.addBreak(1.5, 2.5, new SimpleFillSymbol().setOutline(new SimpleLineSymbol().setWidth(0.25)).setColor(new Color([240, 138, 100])));
                    thisRenderer.addBreak(2.5, Infinity, new SimpleFillSymbol().setOutline(new SimpleLineSymbol().setWidth(0.25)).setColor(new Color([224, 70, 53])));
                }

                // set the layer's renderer (symbology)
                layerCustom.setRenderer(thisRenderer);

                // set starting opacity
                layerCustom.setOpacity(.99);

                // add to map
                map.addLayer(layerCustom);

                // store layer id
                layerIdList.push(thisCustomLayerName);

                // make new legend
                createLayerWidget();

                console.log("made CUSTOM layer");
                //return layerCustom;
            }


            // create layer visibilty toggle widget
            function createLayerWidget() {
                if (legendCounter == 0) { // first run
                    // make widget
                    let newLayersForLegend = arrayUtils.map(layerIdList, function (layer) {
                        return {
                            layer: map.getLayer(layer),
                            showLegend: true,
                            showOpacitySlider: true,
                            visibility: true
                        };
                    });

                    console.log(newLayersForLegend);

                    // make Layer List Widget
                    let layerList = new LayerList({
                        map: map,
                        layers: newLayersForLegend,
                        showLegend: true,
                        showSubLayers: false,
                        removeUnderscores: true,
                        showOpacitySlider: true,
                    }, "layerList" + legendCounter);

                    // start widget
                    layerList.startup();

                    // store widget reference
                    layerLegendWidget = layerList;

                    // change var to show first run complete
                    legendCounter += 1;
                    console.log('legend first run attempt');
                } else {                 // subsequent calls
                    // push new layer list to widget
                    let newLayersForLegend = arrayUtils.map(layerIdList, function (layer) {
                        return {
                            layer: map.getLayer(layer),
                            showLegend: true,
                            showOpacitySlider: true,
                            visibility: true
                        };
                    });

                    layerLegendWidget.layers = newLayersForLegend;
                    layerLegendWidget.refresh();

                    console.log('legend subsequent call attempt');
                }
            }

            // widget for swiping the cancer prediction surface
            function createLayerSwipeWidget() {
                let sliderPosition = parseInt($("#map").width() / 2);
                let layerSwipe = new LayerSwipe({
                    type: "vertical",
                    top: 0,
                    left: sliderPosition,
                    map: map,
                    layers: [map.getLayer("Cancer_Rate").id]
                }, "layerSwipeWidgetDIV");
                layerSwipe.startup();
            }

            // process user request for new analysis
            function runUserAnalysis() {
                // based on localtunnel url
                let baseURL = "https://geog777proj01.localtunnel.me/idw/";

                // get user param
                $("#runButton").click(function () {
                    let specifiedPower = $("#userEnteredPower").val();
                    let urlWithPower = baseURL + specifiedPower;
                    let requestSend = 0;
                    console.log(specifiedPower);

                    if (new String(specifiedPower).valueOf() == "0") {  // need val 1 or greater
                        requestSend = 0;
                        alert("Please enter an interger greater than or equal to 1")

                    } else { // do request
                        requestSend = 1;
                        let dummyResource = urlWithPower + ".txt";
                        lastRequestedPower = specifiedPower;
                        let modalTracker = 1;

                        console.log(dummyResource);

                        // open simple loading modal
                        //$("#modalLoadingData").modal({backdrop: "static", keyboard: false});
                        $("#modalLoadingData").modal("show");


                        // setTimeout(function () {
                        //     $("#modalLoadingData").modal("hide");
                        // }, 5000);


                        // THIS BLOCK WORKS   :-)    :-)    :-)    :-)    :-)    :-)    :-)    :-)    :-)    :-)    :-)    :-)
                        // //  request and await response
                        //     fetch(dummyResource).then(function (response) { return response.json();})
                        //         .then(function(newJSON){
                        //             //let newJSON = response.data();
                        //             let newLayerJSON = JSON.parse(newJSON);
                        //             // call layer builders
                        //             createGraphicsCustom(["Predicted Cancer Rate", newLayerJSON]);
                        //             createGraphicsCustom(["Standardized Residuals", newLayerJSON]);
                        //             // close loader modal
                        //             $("#modalLoadingData").modal("hide");
                        //             console.log("got response");
                        //         });
                        // THIS BLOCK WORKS   :-)    :-)    :-)    :-)    :-)    :-)    :-)    :-)    :-)    :-)    :-)    :-)


                        //  request and await response
                        fetch(dummyResource).then(function (response) {
                            if (response.ok) {
                                return response.json();
                            }
                            throw new Error("Network response was not ok.");
                        }).then(function (newJSON) {
                            //let newJSON = response.data();
                            let newLayerJSON = JSON.parse(newJSON);
                            // call layer builders
                            createGraphicsCustom(["Predicted Cancer Rate", newLayerJSON]);
                            createGraphicsCustom(["Standardized Residuals", newLayerJSON]);
                            // close loader modal
                            $("#modalLoadingData").modal("hide");
                            console.log("got response");
                        }).catch(function (error) {
                            // timeout to improve user feedback experience
                            setTimeout(function () {
                                $("#modalLoadingData").modal("toggle");
                                $("#modalServerError").modal("show");
                            }, 1000);
                            console.log("There was a problem with the fetch operation.", error.message);
                        });
                    }
                });
            }

            // Catch erros on initial layer load
            function errback(error) {
                console.error("Something went wrong loading the default layers:  ", error);
            }

        });  // end main function
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

        // set new map height and right panel height
        let newMapHeight = windowHeight - navbarHeight - footerHeight - (.03 * windowHeight);
        $("#mainCard").css({"height": newMapHeight});
        $("#panelCard").css({"height": newMapHeight});

    }).trigger("resize");
}