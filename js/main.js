var map;
var infoWindow;
var bounds;

// Google Maps initial information.
function initMap() {
  var Chicago = {
    lat: 41.8755616,
    lng: -87.6244212
  };
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 3,
    center: Chicago,
    mapTypeControl: false
  });

  infoWindow = new google.maps.InfoWindow();

  bounds = new google.maps.LatLngBounds();

  ko.applyBindings(new ViewModel());
}

// Handle an error in the map.
function googleMapsError() {
  alert('An error occurred with Google Maps!');
}

var LocationMarker = function(data) {
  var self = this;

  this.title = data.title;
  this.position = data.location;
  this.street = '',
  this.city = '',
  this.phone = '';

  this.visible = ko.observable(true);

  // Call the default map marker icon.
  var defaultIcon = "https://img.icons8.com/color/48/000000/place-marker.png";
  // Call a highlighted location marker on mouseover.
  var highlightedIcon = "https://img.icons8.com/color/48/000000/marker.png";

  var clientID = 'LFWWKA43YHTJJT3LUMXTKWUVAYGJFG0D1HNIRTXPE0JDLWXE';
  var clientSecret = '0ZMCLQH2U1WLJT1R5IC4RW5IQYFVSX0ZMYOGAP3B5S1KZ3ZR';

  // Get JSON request of Foursquare data.
  var reqURL = 'https://api.foursquare.com/v2/venues/search?ll=' + this.position.lat + ',' + this.position.lng + '&client_id=' + clientID + '&client_secret=' + clientSecret + '&v=20160118' + '&query=' + this.title;

  $.getJSON(reqURL).done(function(data) {
	var results = data.response.venues[0];
    self.street = results.location.formattedAddress[0] ? results.location.formattedAddress[0]: 'N/A';
    self.city = results.location.formattedAddress[1] ? results.location.formattedAddress[1]: 'N/A';
    self.phone = results.contact.formattedPhone ? results.contact.formattedPhone : 'N/A';
  }).fail(function() {
      alert('Something went wrong with foursquare');
  });

  // Create a marker for each location and put into markers array.
  this.marker = new google.maps.Marker({
    position: this.position,
    title: this.title,
    animation: google.maps.Animation.DROP,
    icon: defaultIcon
  });

  self.filterMarkers = ko.computed(function () {
    // Set the marker and extend bounds (showListings).
    if(self.visible() === true) {
      self.marker.setMap(map);
      bounds.extend(self.marker.position);
      map.fitBounds(bounds);
    } else {
      self.marker.setMap(null);
    }
  });

  // Create an on-click event to open an infowindow at each marker.
  this.marker.addListener('click', function() {
    populateInfoWindow(this, self.street, self.city, self.phone, infoWindow);
    toggleBounce(this);
    map.panTo(this.getPosition());
  });

  // Event listeners for mouseover and mouseout to switch between icons.
  this.marker.addListener('mouseover', function() {
    this.setIcon(highlightedIcon);
  });
  this.marker.addListener('mouseout', function() {
    this.setIcon(defaultIcon);
  });

  // Show the location info when selected from list.
  this.show = function(location) {
    google.maps.event.trigger(self.marker, 'click');
  };

  // Creates bounce effect when marker is selected.
  this.bounce = function(place) {
	google.maps.event.trigger(self.marker, 'click');
	};

};

var ViewModel = function() {
  var self = this;

  this.searchItem = ko.observable('');

  this.mapList = ko.observableArray([]);

  // Add location markers for each location.
  locations.forEach(function(location) {
    self.mapList.push( new LocationMarker(location) );
  });

  // Locations listed on map.
  this.locationList = ko.computed(function() {
    var searchFilter = self.searchItem().toLowerCase();
    if (searchFilter) {
      return ko.utils.arrayFilter(self.mapList(), function(location) {
        var str = location.title.toLowerCase();
        var result = str.includes(searchFilter);
        location.visible(result);
			  return result;
			});
    }
    self.mapList().forEach(function(location) {
      location.visible(true);
    });
    return self.mapList();
  }, self);
};

// Populates the infowindow when the marker is clicked.
function populateInfoWindow(marker, street, city, phone, infowindow) {
  // Check that the infowindow is not already opened on this marker.
  if (infowindow.marker != marker) {
    // Clear the infowindow content to give the streetview time to load.
    infowindow.setContent('');
    infowindow.marker = marker;

    // Check that the marker property is cleared when the infowindow is closed.
    infowindow.addListener('closeclick', function() {
      infowindow.marker = null;
    });
    var streetViewService = new google.maps.StreetViewService();
    var radius = 50;

    var windowContent = '<h5>' + marker.title + '</h5>' +
      '<p>' + street + "<br>" + city + '<br>' + phone + "</p>";

    // Compute the position of streetview image, calculate the heading, get
    // a panorama and set the options.
    var getStreetView = function (data, status) {
      if (status == google.maps.StreetViewStatus.OK) {
        var nearStreetViewLocation = data.location.latLng;
        var heading = google.maps.geometry.spherical.computeHeading(
          nearStreetViewLocation, marker.position);
          infowindow.setContent(windowContent + '<div id="pano"></div>');
          var panoramaOptions = {
            position: nearStreetViewLocation,
            pov: {
              heading: heading,
              pitch: 20
            }
          };
          var panorama = new google.maps.StreetViewPanorama(
            document.getElementById('pano'), panoramaOptions);
      } else {
        infowindow.setContent(windowContent + '<div style="color: red">No Street View Found</div>');
      }
    };
    // Use streetview service to get the closest streetview image within
    // 50 meters of the markers position
    streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
    // Open the infowindow on the correct marker.
    infowindow.open(map, marker);
  }
}

function toggleBounce(marker) {
  if (marker.getAnimation() !== null) {
    marker.setAnimation(null);
  } else {
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(function() {
      marker.setAnimation(null);
    }, 1400);
  }
}
