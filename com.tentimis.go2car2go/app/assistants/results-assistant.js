function ResultsAssistant(params){
	this.params = params
}
ResultsAssistant.prototype.aboutToActivate = function(){
}
ResultsAssistant.prototype.setup = function(){
	//--> A blank object of data...
	this.listItems = [];

	//--> Map & Boundary Variables
	//==================================================
	this.map = null;
	this.maxLat = -100000;
	this.minLat = 100000;
	this.maxLon = -100000;
	this.minLon = 100000;

	//--> Setup List Widget
	//==================================================
	this.controller.setupWidget("search.results.list", this.listAttr = {
		itemTemplate: "results/rowTemplate",
		listTemplate: "results/listTemplate",
		filterFunction: this.listFilterHandler.bind(this),
		delay: 500,
		swipeToDelete: false,
		renderLimit: 40,
		lookahead: 100,
		hasNoWidgets: true,
		reorderable: false
	}, 
		this.listModel = {}
	);
	
	
	//--> Our List Object
	//==================================================
	this.listSearch = this.controller.get("search.results.list");
	

	//--> Start our AJAX Call
	this.loadAJAX.bind(this).defer();
	
	
	//--> Setup the Map/List Toggle button
	this.map_Button = {};
	this.controller.setupWidget("map.button", this.map_Button, this.map_Button_Model = {buttonLabel: $L("Map"), buttonClass: "primary green mini", disabled: false});
	
	
	//--> Setup List Controls
	//==================================================
	this.LaunchIt = this.listTapHandler.bindAsEventListener(this);
	this.FilterIt = this.listFilter.bindAsEventListener(this);
	
	
	//--> Setup List Listeners
	//==================================================
	//--> List Tap & Filtersing
	Mojo.Event.listen(this.listSearch, Mojo.Event.listTap, this.LaunchIt);
	Mojo.Event.listen(this.listSearch, Mojo.Event.filterImmediate, this.FilterIt);
	
	//--> Toggling the Map
	Mojo.Event.listen(this.controller.get("map.button"), Mojo.Event.tap, this.mapToggle.bindAsEventListener(this));
	
	//--> Scene Scroller (tpo keep map focused)
	Mojo.Event.listen(this.controller.sceneScroller, Mojo.Event.dragEnd, this.handleScroll.bindAsEventListener(this));
	
	//--> Map Pinch to Zoom
	Mojo.Event.listen(this.controller.get("results.map"), "gesturestart", this.handleGestureStart.bindAsEventListener(this));
	Mojo.Event.listen(this.controller.get("results.map"), "gesturechange", this.handleGestureChange.bindAsEventListener(this));
	Mojo.Event.listen(this.controller.get("results.map"), "gestureend", this.handleGestureEnd.bindAsEventListener(this));
	
	//--> Keeping Map Full Screen
	this.controller.window.onresize = this.handleResize.bind(this);
	
	
	//--> Setup our map (UI, then initialization of the map)
	this.mapUI("launch");
	this.mapInitialize();
}
ResultsAssistant.prototype.activate = function(event){
}
ResultsAssistant.prototype.deactivate = function(event){
}
ResultsAssistant.prototype.cleanup = function(event){
	//--> Stop our Event Listeners
	//==================================================
	Mojo.Event.stopListening(this.listSearch, Mojo.Event.listTap, this.LaunchIt);
	Mojo.Event.stopListening(this.listSearch, Mojo.Event.filterImmediate, this.FilterIt);
	Mojo.Event.stopListening(this.controller.get("map.button"), Mojo.Event.tap, this.mapToggle.bindAsEventListener(this));
	Mojo.Event.stopListening(this.controller.sceneScroller, Mojo.Event.dragEnd, this.handleScroll.bindAsEventListener(this));
	Mojo.Event.stopListening(this.controller.get("results.map"), "gesturestart", this.handleGestureStart.bindAsEventListener(this));
	Mojo.Event.stopListening(this.controller.get("results.map"), "gesturechange", this.handleGestureChange.bindAsEventListener(this));
	Mojo.Event.stopListening(this.controller.get("results.map"), "gestureend", this.handleGestureEnd.bindAsEventListener(this));
	
	this.controller.window.onresize = null;
}
ResultsAssistant.prototype.handleCommand = function(event){
	if (event.type == Mojo.Event.back){
		//--> Close map if open instead of popping the scene
		if (this.mapUI("is-map-viewable") == true){
			this.mapUI("animate-out");
			event.stop();
		}
	}
	switch(event.command){
		case "do-nothing":
			//--> Seriously, do nothing
			break;
		
		default:
			break;
	}
}
ResultsAssistant.prototype.handleResize = function(event){
	//--> Call the map-ui-sizing function
	this.mapUI("ui-size");
}
ResultsAssistant.prototype.listTapHandler = function(event){
	//--> Show them which one they clicked on
	this.controller.showAlertDialog({
		preventCancel: false,
		title: $L("You Clicked On..."),
		message: event.item.name + ", " + event.item.address + ", " + event.item.latitude + ", " + event.item.longitude,
		choices:[
			{label:$L('Ok'), value:"ok", type:'affirmative'}
		]
	});
}
ResultsAssistant.prototype.listFilterHandler = function(filterString, listWidget, offset, count){
	//==============================================
	//--> I Should really apply this to the map as well.
	//--> You can. Just clear the overlays, then pass this list-subset to the markers function...
	//==============================================
	
	var subset = [];
	var totalSubsetSize = 0;
	var lowerString = filterString.toLowerCase();
	
	//--> Loop through the original data set & get the subset of items that have the filterstring 
	var i = 0;
	
	while (i < this.listItems.length){
		fldA = this.listItems[i].name.toLowerCase();
		fldB = this.listItems[i].address.toLowerCase();
		//this.listItems.push({index: i, name: vName, address: vAddress, addressb:vAddress2, linec:vLineC});
		
		if (fldA.include(lowerString) || fldB.include(lowerString)){
			if (subset.length < count && totalSubsetSize >= offset){
				subset.push(this.listItems[i]);
			}
			totalSubsetSize++;
		}
		
		i++;
	}
	
	//--> Update the items in the list with the subset
	listWidget.mojo.noticeUpdatedItems(offset, subset);
	
	//--> Set the list's length & count if we're not repeating the same filter string from an earlier pass
	if (this.filter !== filterString){
		listWidget.mojo.setLength(totalSubsetSize);
		listWidget.mojo.setCount(totalSubsetSize);
	}
	
	this.filter = filterString;
}
ResultsAssistant.prototype.listFilter = function(event){
}
ResultsAssistant.prototype.loadAJAX = function(event){
	//--> Reset the interface
	this.controller.get("search.results.loading").style.display = "";
	this.controller.get("search.results.header").style.display = "none";
	this.controller.get("search.results.none").style.display = "none";
	this.controller.get("search.results.div").style.display = "none";

	//--> Get our data!
	//================================================
	this.params.url = 'http://www.car2go.com/api/v2.0/vehicles?format=json&loc=ulm';
	var request = new Ajax.Request(this.params.url, {
		method: 'get',
		evalJSON: true,
		onSuccess: function(transport){
			//--> Lets save our data!
			this.json = transport.responseJSON;
			
			//--> Yah, process da listings
			this.processListings();
		}.bind(this),
		onFailure: this.loadAJAXError.bind(this),
		onError: this.loadAJAXError.bind(this),
		on404: this.loadAJAXError.bind(this),
		on500: this.loadAJAXError.bind(this)
	});
}
ResultsAssistant.prototype.loadAJAXError = function(event){
	//--> I have nothing to do here (yet!)
	this.controller.get("search.results.loading").style.display = "none";
	this.controller.get("search.results.header").style.display = "none";
	this.controller.get("search.results.div").style.display = "none";
	this.controller.get("search.results.none").innerHTML = $L("There was an error loading the data. Please check your data connection and try again.");
	this.controller.get("search.results.none").style.display = "";
}
ResultsAssistant.prototype.processListings = function(event){
	if (!this.json){
		Mojo.Log.error("No json data!");
		this.controller.get("search.results.loading").style.display = "none";
		this.controller.get("search.results.header").style.display = "";
		this.controller.get("search.results.div").style.display = "none";
		this.controller.get("search.results.none").innerHTML = $L("There was an error loading the search results");
		this.controller.get("search.results.none").style.display = "";
	}else{
		//--> Clear the items in our list
		this.sponsoredItems = [];
		
		//--> Reset the boundaries
		this.maxLat = -100000;
		this.minLat = 100000;
		this.maxLon = -100000;
		this.minLon = 100000;
		
		
		//--> Process each record
		for (i=0; i<this.json.placemarks.length; i++){
			// --> Reset temp data vars
			vName = "";
			vAddress = "";
			vCoordinates = "";
			vInterior = "";
			vExterior = "";
			vLatitude = 0;
			vLongitude = 0;
			var vDistance = 0;
			
			vAddress = this.json.placemarks[i].address;
			vInterior = this.json.placemarks[i].interior;
			vExterior = this.json.placemarks[i].exterior;
			vName = this.json.placemarks[i].name;
			
			//--> Geodata
			if (this.json.placemarks[i].coordinates){
                var tempCoordinates = this.json.placemarks[i].coordinates.split(",");
				vLatitude = tempCoordinates[1]
				vLongitude = tempCoordinates[0].split("[");;
				//--> Ensforce numeric
				vLatitude = Number(vLatitude);
				vLongitude = Number(vLongitude[1]);
				
				//--> Calculate distance between current location and car2go object
				vDistance = this.distance(vLatitude, vLongitude, _globals.lat, _globals.lon );
				//--> Calculate our bounds
				this.maxLat = Math.max(this.maxLat, vLatitude);
				this.minLat = Math.min(this.minLat, vLatitude);
				this.maxLon = Math.max(this.maxLon, vLongitude);
				this.minLon = Math.min(this.minLon, vLongitude);
			}
			
			//--> Not push all data to our List Object
			this.listItems.push({index: i, name: vName, address: vAddress, interior: vInterior, exterior: vExterior, latitude: vLatitude, longitude: vLongitude, distance: vDistance});
		}
		
		// this.listModel.items = this.json.placemarks;
		// this.controller.modelChanged(this.listModel);

		//--> Turn our sections on/off
		this.controller.get("search.results.loading").style.display = "none";
		this.controller.get("search.results.header").style.display = "";
		this.controller.get("search.results.div").style.display = "";
		
		//--> Update our lists
		//this.listSearch.mojo.setLength(0);
		//this.listSearch.mojo.noticeUpdatedItems(0, this.listModel.items);
		this.listItems.sort(function(a,b) {
			// assuming distance is always a valid integer
			return a.distance - b.distance;
		});
		
		this.listSearch.mojo.noticeUpdatedItems(0, this.listItems);
		//--> Enable Map & Set Bounds
		this.mapUI("enable-map");
		this.mapUI("set-bounds");
		/*
		NOTE: 
		By enabling the map (which is off screen) and setting it's bounds, the map has time to load and can be displayed quickly.
		You CANNOT set the map display:none as Google Maps will then fail. Map but be visable, but can be off screen (so technically not visable).
		*/
	}
}
ResultsAssistant.prototype.formatOutput = function(num){
	if (num > 10) 
		return parseInt(num, 10);
	return num;
}
ResultsAssistant.prototype.distance = function(lat1, lon1, lat2, lon2){
	// Get numeric values.
	var lat_1 = lat1;
	var lat_2 = lat2;
	var lon_1 = lon1;
	var lon_2 = lon2;
	
	
/* 	var R = 6371; // Radius of the earth in km
	var dLat = (lat_2-lat_1).toRad();  // Javascript functions in radians
	var dLon = (lon_2-lon_1).toRad(); 
	var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
	var d = R * c; // Distance in km
 */
 	// Compute spherical coordinates
 	//var rho = 3960.0; // earth diameter in miles
	var rho = 6371.0; // earth diameter in km
	// convert latitude and longitude to spherical coordinates in radians
	// phi = 90 - latitude
	var phi_1 = (90.0 - lat_1)*Math.PI/180.0;
	var phi_2 = (90.0 - lat_2)*Math.PI/180.0;
	// theta = longitude
	var theta_1 = lon_1*Math.PI/180.0;
	var theta_2 = lon_2*Math.PI/180.0;
	
	// compute spherical distance from spherical coordinates
	// arc length = \arccos(\sin\phi\sin\phi'\cos(\theta-\theta') + \cos\phi\cos\phi')
	// distance = rho times arc length
	var d = rho*Math.acos( Math.sin(phi_1)*Math.sin(phi_2)*Math.cos(theta_1 - theta_2) + Math.cos(phi_1)*Math.cos(phi_2) );

	//return this.formatOutput( 1.609344*d );
	return this.formatOutput(d);
	
}
//--> Yes, this handles all map UI.
ResultsAssistant.prototype.mapUI = function(which){
	//Mojo.Log.info("*** mapUI: " + which);
	if (which == "launch"){
		//--> Set the hidden className
		this.controller.get("results.map").className = "map-hide-animation";
		
		//--> Hide the button at first
		this.controller.get("map.button").style.display = "none";
		
		//--> Now size it propery
		this.mapUI("ui-size");
	}else if (which == "ui-size"){
		//--> Ensure the map is full screen, minus the header
		var pageHeader = 50;
		this.mapWidth = this.controller.window.innerWidth;
		this.mapHeight = this.controller.window.innerHeight - pageHeader;
		
		//--> Setup the map height/width
		this.controller.get("results.map").style.width = this.mapWidth + "px";
		this.controller.get("results.map").style.height = this.mapHeight + "px";
		this.controller.get("map_canvas").style.width = this.mapWidth + "px";
		this.controller.get("map_canvas").style.height = this.mapHeight + "px";
	}else if (which == "enable-map"){
		//--> Enable all mapping options
		this.controller.get("map.button").style.display = "";
		this.controller.get("results.map").style.display = "";
	}else if (which == "disable-map"){
		//--> Disable all mapping options
		this.controller.get("map.button").style.display = "none";
		this.controller.get("results.map").style.display = "none";
	}else if (which == "set-bounds"){
		//--> Use out max/min lat/lon to set the bounds for the map
		var boundsMax = new google.maps.LatLng(this.maxLat,this.maxLon);
		var boundsMin = new google.maps.LatLng(this.minLat,this.minLon);
		this.bounds = new google.maps.LatLngBounds(boundsMin, boundsMax);
		this.map.fitBounds(this.bounds);
	}else if (which == "animate-in"){
		//--> Scroll to the top
		Mojo.View.getScrollerForElement(this.controller.sceneElement).mojo.scrollTo(0, 0, true, false);
		//--> Customize our Page Title
		this.controller.get("page.title").innerHTML = $L("Map View");
		//--> Hide our bottom fader
		this.controller.get("my-scene-fade-bottom").style.display = "none";
		//--> Change the Map button
		this.map_Button_Model.buttonLabel = $L("List");
		this.controller.modelChanged(this.map_Button_Model);
		
		//--> The animate-in class
		this.controller.get("results.map").className = "map-show-animation";
		
		//--> NOW populate the map... (but wait for map animate-in to finish)
		(function(){
			this.mapPopulate();
		}).bind(this).delay(0.55);
	}else if (which == "animate-out"){
		//--> Change back our title and map button, re-show the fader
		this.controller.get("page.title").innerHTML = $L("List View");
		this.controller.get("my-scene-fade-bottom").style.display = "";
		this.map_Button_Model.buttonLabel = $L("Map");
		this.controller.modelChanged(this.map_Button_Model);
				
		//--> The animate-out class (delaying for a millisec to give overlays a chance to clear)
		this.controller.get("results.map").className = "map-hide-animation";
		
		//--> Clear out overlays after animating out as it seems to work around the "stuck" map issue by repainting the scene
		(function(){
			this.mapClearOverlays();
		}).bind(this).delay(0.55);
		//--> The above code is very important for 2.0.1 and 1.4.5 devices...
		
	}else if (which == "toggle-map"){
		//--> Toggles the map display on/off
		if (this.mapUI("is-map-viewable") == false){
			this.mapUI("animate-in");
		}else{
			this.mapUI("animate-out");
		}
	}else if (which == "is-map-viewable"){
		//--> T/F return whether the map is being displayed right now or not
		if (this.controller.get("results.map").className == "map-show-animation"){
			return true;
		}else{
			return false;	
		}
	}
}
ResultsAssistant.prototype.mapToggle = function(event){
	//--> Togggles the map display.
	this.mapUI("toggle-map");
}
ResultsAssistant.prototype.mapInitialize = function(){
	//--> Default center of Ulm, Germany
	this.latlng = new google.maps.LatLng(_globals.lat,_globals.lon);

	//--> Define the map options
	var mapOptions = {
		'zoom': 3,
		'center': this.latlng,
		'mapTypeId': google.maps.MapTypeId.ROADMAP,
		'draggable': true,
		'mapTypeControl': true,
		'scaleControl': true,
		'navigationControl': true,
		'streetViewControl': false
	};
	
	//--> Setup the Map (officialy)
	this.map = new google.maps.Map(this.controller.get("map_canvas"), mapOptions);
	
	//--> Setup arrays to hold our markers and infoBubbles
	this.markers = [];
	this.infoBubbles = [];
}
ResultsAssistant.prototype.mapClearOverlays = function(){
	//--> Deletes ALL Markers 
	for (e=0; e<this.markers.length; e++){
		this.markers[e].setMap(null);
	}
	this.markers.length = 0;
	
	//--> Deletes ALL infoBubbles
	for (e=0; e<this.infoBubbles.length; e++){
		this.infoBubbles[e].setMap(null);
	}
	this.infoBubbles.length = 0;
}
ResultsAssistant.prototype.hideInfoBubbles = function(){
	//--> Simply hides all info bubbles
	for (b=0; b<this.infoBubbles.length; b++){
		this.infoBubbles[b].close();
	}
}
ResultsAssistant.prototype.mapPopulate = function(){
	//--> Remove any existing overlays (markers & infobubbles)
	//this.mapClearOverlays();
	
	//--> Plot all our current Markers
	for (m=0; m< 10; m++){
		//--> Only plot it is values != 0 (aka no bad lat/lon)
		if (this.listItems[m].latitude != 0 && this.listItems[m].longitude != 0){
			//--> We want to animate the display, so call function with a time delay * cur rec
			this.mapAddMarker.bind(this, this.listItems[m]).delay(m*0.20);
		}
	}
	
	//--> Ensure bounds are set
	this.mapUI("set-bounds");
}
ResultsAssistant.prototype.mapAddMarker = function(params){
	//--> Google version of lat/lon
	var thisLatlng = new google.maps.LatLng(params.latitude,params.longitude);
	
	//--> Define the iOS style Marker (pin)
	var marker = new google.maps.Marker({
		position: thisLatlng,
		map: this.map,
		animation: google.maps.Animation.DROP,
		title: params.name,
		icon: "images/map-pin-red.png"
	});
	
	//--> Define the iOS style infoBubble
	var infoBubble = new InfoBubble({
		map: this.map,
		content: '<div id="bubble" class="phoneytext">' + params.name + '<div class="phoneytext2">' + params.address + '</div></div>',
		shadowStyle: 1,
		padding: 0,
		backgroundColor: 'rgb(57,57,57)',
		borderRadius: 4,
		arrowSize: 10,
		borderWidth: 1,
		borderColor: '#2c2c2c',
		disableAutoPan: true,
		hideCloseButton: true,
		arrowPosition: 30,
		backgroundClassName: 'phoney',
		backgroundClassNameClicked: 'phoney-clicked',
		arrowStyle: 2,
		onClick: function(){
			//=====================================================
			//--> Tells the bubble what to when it is clicked
			//=====================================================
			//--> Start the marker bouncing so they know it was clicked
			marker.setAnimation(google.maps.Animation.BOUNCE);
			
			//--> Fire off the next display
			(function(){
				var e = {};
				e.item = params;
				this.listTapHandler(e);
			}).bind(this).delay(0.75);
			
			//--> Stop bouncing the marker after 1 second
			(function(){
				marker.setAnimation(null);
			}).bind(this).delay(1);
		}.bind(this)
	});
	
	//--> For fun, you could set the markers to bounce automatically
	//marker.setAnimation(google.maps.Animation.BOUNCE);
	
	//--> Now for the onlick event of the marker... (infoBubble onClick is defined in the bubble setp)
	google.maps.event.addListener(marker,"click",(function(){
		//--> Now open the bubble
		if (!infoBubble.isOpen()){
			//--> Clear all info bubbles...
			this.hideInfoBubbles();
			infoBubble.open(this.map, marker);
		}else{
			infoBubble.close();
			//--> Clear all info bubbles...
			this.hideInfoBubbles();
		}
	}).bind(this));

	//--> Add it to the array
	this.infoBubbles.push(infoBubble);
	this.markers.push(marker);
}
ResultsAssistant.prototype.handleScroll = function(e){
	//--> Ensures that if the map is shown and they scroll, that the scene stays at the very top
	//Mojo.Log.error("*** Scrolling detected");
	if (this.mapUI("is-map-viewable") == true){
		Mojo.View.getScrollerForElement(this.controller.sceneElement).mojo.scrollTo(0, 0, true, true);
	}
}
ResultsAssistant.prototype.handleGestureStart = function(e){
	this.map.setOptions({
		draggable: false
	});
	
	this.previousScale = e.scale;
}
ResultsAssistant.prototype.handleGestureChange = function(e){	
	e.stop();
	var d = this.previousScale - e.scale;
	if (Math.abs(d) > 0.25) 
	{
		var z = this.map.getZoom() + (d > 0 ? -1 : +1);
		//var center = this.map.getCenter();
		this.map.setZoom(z);
		this.previousScale = e.scale;
		//this.map.setCenter(center);
	}
}
ResultsAssistant.prototype.handleGestureEnd = function(e){
	e.stop();

	this.map.setOptions({
		draggable: true
	});
	
	//--> Ensure the scene is scrolled all the way up
	Mojo.View.getScrollerForElement(this.controller.sceneElement).mojo.scrollTo(0, 0, true, true);
}
