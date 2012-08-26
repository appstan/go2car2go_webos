function MapAssistant(numberOfMarkers, command, listItem) {
	this.myMarker = false;
	this.map;
	this.numberOfMarkers = numberOfMarkers;
	this.command = command;
	this.listItem = listItem;
	
	if (this.command == 'vehicles'){
		this.markerIcon = "images/map-pin-car.png";
	} 
	else if (this.command == 'gas'){
		this.markerIcon = "images/map-pin-gas.png";		
	}
	else if (this.command == 'parking'){
		this.markerIcon = "images/map-pin-parking.png";		
	}
	else {
		this.markerIcon = "images/map-pin.png";		
	}

	Mojo.Log.info("numberOfmarkers %i", this.numberOfMarkers);
}

MapAssistant.prototype.setup = function() {

	Go2Car2Go.onCurrentLocationUpdate = function(location) {
		this.onCurrentLocationChanged(location);
	}.bind(this);

	// --> setup application menu
	Go2Car2Go.initAppMenu(this);

	// --> Map & Boundary Variables
	this.map = null;
	this.maxLat = -100000;
	this.minLat = 100000;
	this.maxLon = -100000;
	this.minLon = 100000;

	this.menuModel = {
			visible:true,
			items: [
					{},
						{label:$L('Views'), 
						toggleCmd:this.command, 
						items:[
								{label:$L('Vehicles'), icon: 'menu-car', command:'vehicles'}, 
								{label:$L('Parking'), icon: 'menu-parking', command:'parking'}, 
								{label:$L('Gas Stations'), icon: 'menu-gas', command:'gas'},
								{label:$L('Booking'), icon: 'menu-booking', command:'bookings'}
						 ]},
					{},
					]};


	this.controller.setupWidget(Mojo.Menu.commandMenu, undefined,
			this.menuModel);
	

	// --> Setup the Map/List Toggle button
	this.map_Button = {};
	this.controller.setupWidget("map.button", this.map_Button,
			this.map_Button_Model = {
				buttonLabel : $L("List"),
				buttonClass : "primary green mini",
				disabled : false
			});

            this.ScreenRoughRatio = 1;

            if(this.isPre3()){
                Mojo.Log.info("*** Detected device is Pre3 ***");
                this.ScreenRoughRatio = 1.5;
            };


            // --> Toggling the Map
            Mojo.Event.listen(this.controller.get("map.button"), Mojo.Event.tap,
                              this.mapToggle.bindAsEventListener(this));

	// --> Scene Scroller (tpo keep map focused)
	Mojo.Event.listen(this.controller.sceneScroller, Mojo.Event.dragEnd,
			this.handleScroll.bindAsEventListener(this));

            // --> Map Pinch to Zoom
            Mojo.Event.listen(this.controller.get("results.map"), "gesturestart",
                              this.handleGestureStart.bindAsEventListener(this));
            Mojo.Event.listen(this.controller.get("results.map"), "gesturechange",
                              this.handleGestureChange.bindAsEventListener(this));
            Mojo.Event.listen(this.controller.get("results.map"), "gestureend",
                              this.handleGestureEnd.bindAsEventListener(this));

            // --> setup dragging listeners
            this.dragStartHandler = this.dragStart.bindAsEventListener(this);
            this.draggingHandler = this.dragging.bindAsEventListener(this);

	// --> Keeping Map Full Screen
	this.controller.window.onresize = this.handleResize.bind(this);

	// --> Setup our map (UI, then initialization of the map)
	// this.mapUI("launch");
	this.mapInitialize();

	// --> Calculate our bounds based on POI
	for (m = 0; m < this.numberOfMarkers; m++) {
		this.maxLat = Math.max(this.maxLat, this.listItem[m].latitude);
		this.minLat = Math.min(this.minLat, this.listItem[m].latitude);
		this.maxLon = Math.max(this.maxLon, this.listItem[m].longitude);
		this.minLon = Math.min(this.minLon, this.listItem[m].longitude);
	}

	// --> Enable Map & Set Bounds
	this.mapUI("enable-map");
	this.mapUI("set-bounds");
	// show map
	this.mapUI("animate-in");


	//--> Listen for prefrences changes
	this.controller.listen(Mojo.Controller.stageController.document, "location-changed", this.locationChangedHandler.bind(this));
	
};

MapAssistant.prototype.activate = function(event) {

            this.WebOS2Events('start');

            if (this.WebOS22) {
                this.overlay = new google.maps.OverlayView();
                this.overlay.draw = function() {};
                this.overlay.setMap(this.map);
            };

        };

MapAssistant.prototype.deactivate = function(event) {
	/*
	 * remove any event handlers you added in activate and do any other cleanup
	 * that should happen before this scene is popped or another scene is pushed
	 * on top
	 */
};

MapAssistant.prototype.cleanup = function(event) {

	Mojo.Event.stopListening(this.controller.get("map.button"), Mojo.Event.tap,
			this.mapToggle.bindAsEventListener(this));
	Mojo.Event.stopListening(this.controller.sceneScroller, Mojo.Event.dragEnd,
			this.handleScroll.bindAsEventListener(this));
	Mojo.Event.stopListening(this.controller.get("results.map"),
			"gesturestart", this.handleGestureStart.bindAsEventListener(this));
	Mojo.Event
			.stopListening(this.controller.get("results.map"), "gesturechange",
					this.handleGestureChange.bindAsEventListener(this));
	Mojo.Event.stopListening(this.controller.get("results.map"), "gestureend",
			this.handleGestureEnd.bindAsEventListener(this));

            if (this.WebOS22) {
                Mojo.Event.stopListening(this.controller.stageController.document, Mojo.Event.dragStart, this.dragStartHandler);
                Mojo.Event.stopListening(this.controller.stageController.document, Mojo.Event.dragging, this.draggingHandler);
            };

            this.controller.window.onresize = null;
            this.controller.stopListening(Mojo.Controller.stageController.document, "location-changed", this.locationChangedHandler);

};

MapAssistant.prototype.handleCommand = function(event) {
            if (event.type == Mojo.Event.back) {
                event.stop();
                if (this.command == 'vehicles'){
                    this.handleVehicleView();
                }
                else if (this.command == 'gas'){
                    this.handleGasstationView();
                }
                else if (this.command == 'parking'){
                    this.handleParkingView();
                }
            }
            if (event.type == Mojo.Event.command) {
                switch (event.command) {
                case "do-nothing":
                    // --> Seriously, do nothing
                    break;
                case "parking":
                    this.handleParkingView();
                    break;
                case "gas":
                    this.handleGasstationView();
                    break;
                case "vehicles":
                    this.handleVehicleView();
                    break;
                case "preferences":
                    this.showPreferences();
                    break;
                case "logout":
                    this.logout();
                    break;
                case "bookings":
                    this.handleBookingsView();
                    break;

		default:
			break;
		}
	}
};

MapAssistant.prototype.mapUI = function(which) {
	// Mojo.Log.info("*** mapUI: " + which);
	if (which == "launch") {
		// --> Set the hidden className
		this.controller.get("results.map").className = "map-hide-animation";

		// --> Hide the button at first
		this.controller.get("map.button").style.display = "none";

		// --> Now size it propery
		this.mapUI("ui-size");
	} else if (which == "ui-size") {
		// --> Ensure the map is full screen, minus the header
		var pageHeader = 50;
		this.mapWidth = this.controller.window.innerWidth;
		this.mapHeight = this.controller.window.innerHeight - pageHeader;

		// --> Setup the map height/width
		this.controller.get("results.map").style.width = this.mapWidth + "px";
		this.controller.get("results.map").style.height = this.mapHeight + "px";
		this.controller.get("map_canvas").style.width = this.mapWidth + "px";
		this.controller.get("map_canvas").style.height = this.mapHeight + "px";

	} else if (which == "enable-map") {
		// --> Enable all mapping options
		this.controller.get("map.button").style.display = "";
		this.controller.get("results.map").style.display = "";
	} else if (which == "disable-map") {
		// --> Disable all mapping options
		this.controller.get("map.button").style.display = "none";
		this.controller.get("results.map").style.display = "none";
	} else if (which == "set-bounds") {
		// --> Use out max/min lat/lon to set the bounds for the map
		var boundsMax = new google.maps.LatLng(this.maxLat, this.maxLon);
		var boundsMin = new google.maps.LatLng(this.minLat, this.minLon);
		this.bounds = new google.maps.LatLngBounds(boundsMin, boundsMax);
		this.map.fitBounds(this.bounds);
	} else if (which == "animate-in") {
		// --> Scroll to the top
		// Mojo.View.getScrollerForElement(this.controller.sceneElement).mojo.scrollTo(0,
		// 0, true, false);
		// --> Customize our Page Title
		this.controller.get("page.title").innerHTML = $L(this.command);
		// --> Hide our bottom fader
		// this.controller.get("my-scene-fade-bottom").style.display = "none";
		// --> Change the Map button
		// this.map_Button_Model.buttonLabel = $L("List");
		// this.controller.modelChanged(this.map_Button_Model);

		// --> The animate-in class
		// this.controller.get("results.map").className = "map-show-animation";

		// --> NOW populate the map... (but wait for map animate-in to finish)

		(function() {
			this.mapPopulate();
		}).bind(this).delay(0.55);
	} else if (which == "animate-out") {
		// --> Change back our title and map button, re-show the fader
		this.controller.get("page.title").innerHTML = $L("List View");
		// this.controller.get("my-scene-fade-bottom").style.display = "";
		this.map_Button_Model.buttonLabel = $L("Map");
		this.controller.modelChanged(this.map_Button_Model);

		// --> The animate-out class (delaying for a millisec to give overlays a
		// chance to clear)
		this.controller.get("results.map").className = "map-hide-animation";

		// --> Clear out overlays after animating out as it seems to work around
		// the "stuck" map issue by repainting the scene
		(function() {
			this.mapClearOverlays();
		}).bind(this).delay(0.55);
		// --> The above code is very important for 2.0.1 and 1.4.5 devices...

	} else if (which == "toggle-map") {
		// --> Toggles the map display on/off
		if (this.mapUI("is-map-viewable") == false) {
			this.mapUI("animate-in");
		} else {
			this.mapUI("animate-out");
		}
	} else if (which == "is-map-viewable") {
		// --> T/F return whether the map is being displayed right now or not
		if (this.controller.get("results.map").className == "map-show-animation") {
			return true;
		} else {
			return false;
		}
	}
};

MapAssistant.prototype.mapToggle = function(event) {
	this.handleMapToogle(this.command);
};

MapAssistant.prototype.mapInitialize = function() {
	this.latlng = new google.maps.LatLng(_globals.latitude, _globals.longitude);

	// --> Define the map options
	var mapOptions = {
		'zoom' : 3,
		'center' : this.latlng,
		'mapTypeId' : google.maps.MapTypeId.ROADMAP,
		'draggable' : true,
		'mapTypeControl' : false,
		'scaleControl' : false,
		'navigationControl' : true,
		'streetViewControl' : false,
		'zoomControlOptions': {
			'style': google.maps.ZoomControlStyle.LARGE,
			'position': google.maps.ControlPosition.RIGHT_CENTER
		  } 
	};

            // --> Setup the Map
            this.map = new google.maps.Map(this.controller.get("map_canvas"), mapOptions);

	// --> Setup arrays to hold our markers and infoBubbles
	this.markers = [];
	this.infoBubbles = [];

};

MapAssistant.prototype.handleResize = function(event) {
	// --> Call the map-ui-sizing function
	this.mapUI("ui-size");
}

MapAssistant.prototype.mapClearOverlays = function() {
	// --> Deletes ALL Markers
	for (e = 0; e < this.markers.length; e++) {
		this.markers[e].setMap(null);
	}
	this.markers.length = 0;

	// --> Deletes ALL infoBubbles
	for (e = 0; e < this.infoBubbles.length; e++) {
		this.infoBubbles[e].setMap(null);
	}
	this.infoBubbles.length = 0;
};

MapAssistant.prototype.hideInfoBubbles = function() {
	// --> Simply hides all info bubbles
	for (b = 0; b < this.infoBubbles.length; b++) {
		this.infoBubbles[b].close();
	}
};

MapAssistant.prototype.mapPopulate = function() {
	Mojo.Log.info(" In mapPopulate()");

	this.displayMyLocation(_globals);

	// --> Plot all our current Markers
	for (m = 0; m < this.numberOfMarkers; m++) {
		// --> Only plot it is values != 0 (aka no bad lat/lon)
		if (this.listItem[m].latitude != 0 && this.listItem[m].longitude != 0) {
			this.mapAddMarker.bind(this, this.listItem[m]).delay(m * 0.20);
		}
	}

	// --> Ensure bounds are set
	this.mapUI("set-bounds");
};

MapAssistant.prototype.mapAddMarker = function(params) {
	// --> Google version of lat/lon
	var thisLatlng = new google.maps.LatLng(params.latitude, params.longitude);

	// --> Define the iOS style Marker
	var marker = new google.maps.Marker({
		position : thisLatlng,
		map : this.map,
		animation : google.maps.Animation.DROP,
		title : params.name,
		icon : this.markerIcon
	});

	// --> Define the iOS style infoBubble
	var infoBubleText = "";
	if (this.command == 'vehicles'){
		infoBubleText = '<div id="bubble" class="phoneytext">' + params.name
		+ '<div class="phoneytext2">' + params.address
		+ '</div></div>';
	} else {
		infoBubleText = '<div id="bubble" class="phoneytext">' + params.name
		+ '</div>';
	}

	
	var infoBubble = new InfoBubble(
			{
				map : this.map,
				content : infoBubleText,
				shadowStyle : 1,
				padding : 0,
				backgroundColor : 'rgb(57,57,57)',
				borderRadius : 4,
				arrowSize : 10,
				borderWidth : 1,
				borderColor : '#2c2c2c',
				disableAutoPan : true,
				hideCloseButton : true,
				arrowPosition : 30,
				backgroundClassName : 'phoney',
				backgroundClassNameClicked : 'phoney-clicked',
				arrowStyle : 2,
				onClick : function() {
					// =====================================================
					// --> Tells the bubble what to when it is clicked
					// =====================================================
					// --> Start the marker bouncing so they know it was clicked
					marker.setAnimation(google.maps.Animation.BOUNCE);

					// --> Fire off the next display
					(function() {
						var e = {};
						e.item = params;
						this.listTapHandler(e);
					}).bind(this).delay(0.75);

					// --> Stop bouncing the marker after 1 second
					(function() {
						marker.setAnimation(null);
					}).bind(this).delay(1);
				}.bind(this)
			});

	// --> Now for the onClick event of the marker...
	// (infoBubble onClick is defined in the bubble setup)

	google.maps.event.addListener(marker, "click", (function() {
		// --> Now open the bubble
		if (!infoBubble.isOpen()) {
			// --> Clear all info bubbles...
			this.hideInfoBubbles();
			infoBubble.open(this.map, marker);
		} else {
			infoBubble.close();
			// --> Clear all info bubbles...
			this.hideInfoBubbles();
		}
	}).bind(this));

	// --> Add it to the array
	this.infoBubbles.push(infoBubble);
	this.markers.push(marker);
};

MapAssistant.prototype.mapAddMyLocationMarker = function(params) {
	var thisLatlng = new google.maps.LatLng(params.latitude, params.longitude);

	// --> Define the iOS style Marker (pin)
	var mymarker = new google.maps.Marker({
		position : thisLatlng,
		map : this.map,
		// animation: google.maps.Animation.DROP,
		// title: params.name,
		icon : "images/mylocation.png"
	});

	this.markers.push(mymarker);
};

MapAssistant.prototype.listTapHandler = function(event) {
	// --> Show booking in case of vehicles view
	if (this.command == 'vehicles'){
		this.controller.showAlertDialog({
			preventCancel: false,
			title: $L(event.item.name),
			message: event.item.address + "\n Interior: " + event.item.interior + "\n Exterior: " + event.item.exterior,
			choices:[
			    {label:$L('Book'), value:"book", type:'dismiss'},
			    {label:$L('Route'), value:"route", type:'affirmative'},
			    {label:$L('Cancel'), value:"cancel", type:'negative'}
			],
			onChoose: function(value) {
				if (value === "book") {
					this.createBooking(event.item.vin);
				}
				if(value === "route"){
					var poi = {
							name: event.item.name,
							latitude: event.item.latitude,
							longitude: event.item.longitude,
							address: event.item.address
					} 
					this.launchMaps(poi);
				}
			}.bind(this),

		});

	}
	else {
		this.controller.showAlertDialog({
			preventCancel: false,
			title: $L(event.item.name),
			message: "Distance: " + event.item.distance + " " + Go2Car2Go.unit,
			choices:[
			    {label:$L('Route'), value:"route", type:'affirmative'},
			    {label:$L('Cancel'), value:"cancel", type:'negative'}
			],
			onChoose: function(value) {
				if(value === "route"){
					var poi = {
							name: event.item.name,
							latitude: event.item.latitude,
							longitude: event.item.longitude,
							address: event.item.name
					} 
					this.launchMaps(poi);
				}
			}.bind(this),

		});

	}
}

MapAssistant.prototype.handleScroll = function(e) {
	Mojo.View.getScrollerForElement(this.controller.sceneElement).mojo
			.scrollTo(0, 0, true, true);
};

MapAssistant.prototype.handleGestureStart = function(e) {
	this.map.setOptions({
		draggable : false
	});

	this.previousScale = e.scale;
};

MapAssistant.prototype.handleGestureChange = function(e) {
	e.stop();
	var d = this.previousScale - e.scale;
	if (Math.abs(d) > 0.25) {
		var z = this.map.getZoom() + (d > 0 ? -1 : +1);
		// var center = this.map.getCenter();
		this.map.setZoom(z);
		this.previousScale = e.scale;
		// this.map.setCenter(center);
	}
};

MapAssistant.prototype.handleGestureEnd = function(e) {
	e.stop();

	this.map.setOptions({
		draggable : true
	});

	// --> Ensure the scene is scrolled all the way up
	Mojo.View.getScrollerForElement(this.controller.sceneElement).mojo
			.scrollTo(0, 0, true, true);
};

MapAssistant.prototype.handleMapToogle = function(whichScene) {

	if (whichScene == "vehicles") {
		this.handleVehicleView();
	} else if (whichScene == "gas") {
		this.handleGasstationView();
	} else if (whichScene == "parking") {
		this.handleParkingView();
	}
};

MapAssistant.prototype.handleVehicleView = function(e) {
	Mojo.Log.info("go to vehicles view");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("vehicles", {});
};

MapAssistant.prototype.handleParkingView = function(e) {
	Mojo.Log.info("go to parking spots view");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("parking", {});
};

MapAssistant.prototype.handleGasstationView = function(e) {
	Mojo.Log.info("go to gas stations view");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("gasstations", {});
};

MapAssistant.prototype.handleBookingsView = function(e) {
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("bookings", {});
};

MapAssistant.prototype.displayMyLocation = function(position) {
	var myLatLng = new google.maps.LatLng(position.latitude, position.longitude);

	if (!this.myMarker) {
		// define the 'current location' marker image
		var image = new google.maps.MarkerImage('images/blue_dot_circle.png',
				new google.maps.Size(38, 38), // size
				new google.maps.Point(0, 0), // origin
				new google.maps.Point(19, 19) // anchor
		);

		// then create the new marker
		this.myMarker = new google.maps.Marker({
			position : myLatLng,
			map : this.map,
			icon : image,
			flat : true,
			title : 'You might be here'
		});

		// just change marker position on subsequent passes
	} else {
		this.myMarker.setPosition(myLatLng);
	}

};

MapAssistant.prototype.onCurrentLocationChanged = function(position) {
	var myLatLng = new google.maps.LatLng(position.latitude, position.longitude);

	// build entire marker first time thru
	if (!this.myMarker) {
		// define the 'you are here' marker image
		var image = new google.maps.MarkerImage('images/blue_dot_circle.png',
				new google.maps.Size(38, 38), // size
				new google.maps.Point(0, 0), // origin
				new google.maps.Point(19, 19) // anchor
		);

		// then create the new marker
		this.myMarker = new google.maps.Marker({
			position : myLatLng,
			map : this.map,
			icon : image,
			flat : true,
			title : 'You might be here'
		});

		// just change marker position on subsequent passes
	} else {
		this.myMarker.setPosition(myLatLng);
	}

};

MapAssistant.prototype.showPreferences = function() {
	Mojo.Controller.stageController.pushScene("preferences");
};

MapAssistant.prototype.logout = function() {
	Go2Car2Go.logout();
};

MapAssistant.prototype.launchMaps = function(poi) {
	Mojo.Log.info("name : %s", poi.address);

	Go2Car2Go.mapRouteCall(poi);
};

MapAssistant.prototype.createBooking = function(vin) {
	if (Go2Car2Go.requireLogin) {
		var sController = this.controller.stageController;
		sController.pushScene('login');
    } else {
    	Go2Car2Go.createBooking(vin);
    }

};

MapAssistant.prototype.locationChangedHandler = function(){
            // temp solution
            this.mapToggle();
        };

MapAssistant.prototype.WebOS2Events = function (action) {

            /* this function starts or stop dragging listeners needed for WebOS2.2.x devices */
            if (Mojo.Environment.DeviceInfo.platformVersionMajor == "2" && Mojo.Environment.DeviceInfo.platformVersionMinor == "2") {
                this.WebOS22 = true;
                switch (action) {
                case 'start':
                    Mojo.Log.info("*** START LISTENERS ***");
                    Mojo.Event.listen(this.controller.stageController.document, Mojo.Event.dragStart, this.dragStartHandler);
                    Mojo.Event.listen(this.controller.stageController.document, Mojo.Event.dragging, this.draggingHandler);
                    Mojo.Event.listen(this.controller.get("map_canvas"), "click", this.click.bind(this));

                    break;
                case 'stop':
                    Mojo.Log.info("*** STOP LISTENERS ***");
                    Mojo.Event.stopListening(this.controller.stageController.document, Mojo.Event.dragStart, this.dragStartHandler);
                    Mojo.Event.stopListening(this.controller.stageController.document, Mojo.Event.dragging, this.draggingHandler);
                    Mojo.Event.stopListening(this.controller.get("map_canvas"), "click", this.click.bind(this));
                    break;

                };
            };

        };

MapAssistant.prototype.WebOSVersion1 = function () {

            /* this function starts or stop dragging listeners needed for WebOS2.2.x devices */
            if (Mojo.Environment.DeviceInfo.platformVersionMajor == "1") {
                return true;
            } else {return false};


        };

MapAssistant.prototype.isPre3 =  function(){

            if(Mojo.Environment.DeviceInfo.screenWidth==800){ return true; }

            if(Mojo.Environment.DeviceInfo.screenHeight==800){ return true; }

            return false;

        };

MapAssistant.prototype.flick = function(event) {

        };

MapAssistant.prototype.click = function(event) {

        };

MapAssistant.prototype.dragStart = function(event) {
            this.oldx = event.down.x;
            this.oldy = event.down.y;
        };

MapAssistant.prototype.dragging = function(event) {
            this.map.panBy(this.ScreenRoughRatio*(this.oldx - event.move.x), this.ScreenRoughRatio*(this.oldy - event.move.y));
            this.oldx = event.move.x;
            this.oldy = event.move.y;
        };

MapAssistant.prototype.dragEnd = function(event) {

            this.dragging = false;
        };

MapAssistant.prototype.mousedownHandler = function() {
        };


