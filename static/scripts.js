// Google Map
let map;

// Markers for map
let markers = [];

// Info window
let info = new google.maps.InfoWindow();

// Execute when the DOM is fully loaded
$(document).ready(function() {

    // Styles for map
    // https://developers.google.com/maps/documentation/javascript/styling
    let styles = [

        // Hide Google's labels
        {
            featureType: "all",
            elementType: "labels",
            stylers: [
                {visibility: "off"}
            ]
        },

        // Hide roads
        {
            featureType: "road",
            elementType: "geometry",
            stylers: [
                {visibility: "off"}
            ]
        }

    ];

    // Options for map
    // https://developers.google.com/maps/documentation/javascript/reference#MapOptions
    let options = {
        center: {lat: 40.6974881, lng: -73.979681}, // New York, NY
        disableDefaultUI: true,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        maxZoom: 14,
        panControl: true,
        styles: styles,
        zoom: 13,
        zoomControl: true
    };

    // Get DOM node in which map will be instantiated
    let canvas = $("#map-canvas").get(0);

    // Instantiate map
    map = new google.maps.Map(canvas, options);

    // Configure UI once Google Map is idle (i.e., loaded)
    google.maps.event.addListenerOnce(map, "idle", configure);

});

// Add marker for place to map
function addMarker(place)
{
    // extract the place latitude and longitude
    var myLatLng = new google.maps.LatLng(place["latitude"], place["longitude"]);

    // icon for the marker
    var image = "http://maps.google.com/mapfiles/kml/pal2/icon31.png";

    // instantiate marker
    var marker = new google.maps.Marker({
        position: myLatLng,
        map: map,
        title: place["place_name"] +", "+ place["admin_name1"],
        label: place["place_name"] +", "+ place["admin_name1"],
        icon : image
    });

    // get articles
    $.getJSON(Flask.url_for("articles"), {geo: place.postal_code}, function(articles) {

        // Only display infowindow if articles exist
        if (!$.isEmptyObject(articles))
        {
            var articlesContent = "<ul>";
            for (var i = 0; i < articles.length; i++)
            {
            	articlesContent += "<li><a target='_NEW' href='" + articles[i].link
            	+ "'>" + articles[i].title + "</a></li>";
            }
        }

		articlesContent += "</ul>";

		// listen for clicks
        google.maps.event.addListener(marker, 'click', function() {
            showInfo(marker, articlesContent);
		});
    });

    // add marker to map
    markers.push(marker);
}


// Configure application
function configure()
{
    // Update UI after map has been dragged
    google.maps.event.addListener(map, "dragend", function() {

        // If info window isn't open
        // http://stackoverflow.com/a/12410385
        if (!info.getMap || !info.getMap())
        {
            update();
        }
    });

    // Update UI after zoom level changes
    google.maps.event.addListener(map, "zoom_changed", function() {
        update();
    });

    // Configure typeahead
    $("#q").typeahead({
        highlight: false,
        minLength: 1
    },
    {
        display: function(suggestion) { return null; },
        limit: 10,
        source: search,
        templates: {
            suggestion: Handlebars.compile(
                "<div>" +
                "{{place_name}}, {{admin_name1}}, {{postal_code}}" +
                "</div>"
            )
        }
    });

    // Re-center map after place is selected from drop-down
    $("#q").on("typeahead:selected", function(eventObject, suggestion, name) {

        // Set map's center
        map.setCenter({lat: parseFloat(suggestion.latitude), lng: parseFloat(suggestion.longitude)});

        // Update UI
        update();
    });

    // Hide info window when text box has focus
    $("#q").focus(function(eventData) {
        info.close();
    });

    // Re-enable ctrl- and right-clicking (and thus Inspect Element) on Google Map
    // https://chrome.google.com/webstore/detail/allow-right-click/hompjdfbfmmmgflfjdlnkohcplmboaeo?hl=en
    document.addEventListener("contextmenu", function(event) {
        event.returnValue = true;
        event.stopPropagation && event.stopPropagation();
        event.cancelBubble && event.cancelBubble();
    }, true);

    // Update UI
    update();

    // Give focus to text box
    $("#q").focus();
}

// Remove markers from map
function removeMarkers()
{
    // remove all markers from the map
    for (var i = 0, n = markers.length; i < n; i++)
    {
	    markers[i].setMap(null);
    }
}

// Search database for typeahead's suggestions
function search(query, syncResults, asyncResults)
{
    // Get places matching query (asynchronously)
    let parameters = {
        q: query
    };
    $.getJSON("/search", parameters, function(data, textStatus, jqXHR) {

        // Call typeahead's callback with search results (i.e., places)
        asyncResults(data);
    });
}

// Show info window at marker with content
function showInfo(marker, content)
{
    // Start div
    let div = "<div id='info'>";
    if (typeof(content) == "undefined")
    {
        // http://www.ajaxload.info/
        div += "<img alt='loading' src='/static/ajax-loader.gif'/>";
    }
    else
    {
        div += content;
    }

    // End div
    div += "</div>";

    // Set info window's content
    info.setContent(div);

    // Open info window (if not already open)
    info.open(map, marker);
}

// Update UI's markers
function update()
{
    // Get map's bounds
    let bounds = map.getBounds();
    let ne = bounds.getNorthEast();
    let sw = bounds.getSouthWest();

    // Get places within bounds (asynchronously)
    let parameters = {
        ne: `${ne.lat()},${ne.lng()}`,
        q: $("#q").val(),
        sw: `${sw.lat()},${sw.lng()}`
    };
    $.getJSON("/update", parameters, function(data, textStatus, jqXHR) {

       // Remove old markers from map
       removeMarkers();

       // Add new markers to map
       for (let i = 0; i < data.length; i++)
       {
           addMarker(data[i]);
       }
    });
};
