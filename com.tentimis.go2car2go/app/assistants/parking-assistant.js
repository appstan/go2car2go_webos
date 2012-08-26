function ParkingAssistant(params){
	this.params = params;
	this.kPARKING_CACHE = "parking";
	this.numberOfParkings = null;
}
ParkingAssistant.prototype.aboutToActivate = function(){
};
ParkingAssistant.prototype.setup = function(){
	//--> setup application menu
	Go2Car2Go.initAppMenu(this);	

	//--> A blank object of data...
	this.listItems = [];

	//--> Setup List Widget
	//==================================================
	this.controller.setupWidget("search.results.list", this.listAttr = {
		itemTemplate: "parking/rowTemplate",
		listTemplate: "parking/listTemplate",
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
	
	//Setup menuCommand
	this.menuModel = {
			visible:true,
			items: [
					{},
						{label:$L('Views'), 
						toggleCmd:'parking', 
					items:[
						   {label:$L('Vehicles'), icon: 'menu-car', command:'vehicles'}, 
						   {label:$L('Parking'), icon: 'menu-parking', command:'parking'}, 
						   {label:$L('Gas Stations'), icon: 'menu-gas', command:'gas'},
						   {label:$L('Booking'), icon: 'menu-booking', command:'bookings'}
						   ]},
					{},
					]};
			
	this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.menuModel);
	
	//--> Our List Object
	//==================================================
	this.listSearch = this.controller.get("search.results.list");
		
	
	//--> Setup the Map/List Toggle button
	this.map_Button = {};
	this.controller.setupWidget("map.button", this.map_Button, this.map_Button_Model = {buttonLabel: $L("Map"), buttonClass: "primary green mini", disabled: true});
	
	
	//--> Setup List Controls
	//==================================================
	this.LaunchIt = this.listTapHandler.bindAsEventListener(this);
	this.FilterIt = this.listFilter.bindAsEventListener(this);
	
	this.setupData();
	
	//--> Setup List Listeners
	//==================================================
	//--> List Tap & Filtersing
	Mojo.Event.listen(this.listSearch, Mojo.Event.listTap, this.LaunchIt);
	Mojo.Event.listen(this.listSearch, Mojo.Event.filterImmediate, this.FilterIt);
	
	//--> Toggling the Map
	Mojo.Event.listen(this.controller.get("map.button"), Mojo.Event.tap, this.mapToggle.bindAsEventListener(this));
	
	//--> Listen for prefrences changes
	this.controller.listen(Mojo.Controller.stageController.document, "unit-changed", this.unitChangedHandler.bind(this));
	this.controller.listen(Mojo.Controller.stageController.document, "location-changed", this.locationChangedHandler.bind(this));
	
	
};

ParkingAssistant.prototype.activate = function(event){
};

ParkingAssistant.prototype.deactivate = function(event){
};

ParkingAssistant.prototype.cleanup = function(event){
	//--> Stop our Event Listeners
	//==================================================
	Mojo.Event.stopListening(this.listSearch, Mojo.Event.listTap, this.LaunchIt);
	Mojo.Event.stopListening(this.listSearch, Mojo.Event.filterImmediate, this.FilterIt);
	Mojo.Event.stopListening(this.controller.get("map.button"), Mojo.Event.tap, this.mapToggle.bindAsEventListener(this));
	this.controller.window.onresize = null;
	//--> Stop listening for prefrences changes
	this.controller.stopListening(Mojo.Controller.stageController.document, "unit-changed", this.unitChangedHandler);
	this.controller.stopListening(Mojo.Controller.stageController.document, "location-changed", this.locationChangedHandler);
	
};

ParkingAssistant.prototype.handleCommand = function(event){
	if (event.type == Mojo.Event.back){
			event.stop();
	}
	if(event.type == Mojo.Event.command) {
		switch(event.command){
			case "do-nothing":
				//--> Seriously, do nothing
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
			case "bookings":
				this.handleBookingsView();
				break;
			case "preferences":
				this.showPreferences();
				break;
			case "logout":
				this.logout();
				break;
				
			default:
				break;
		}
	}

};

ParkingAssistant.prototype.listTapHandler = function(event){
	//--> Show them which one they clicked on
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
	
};

ParkingAssistant.prototype.launchMaps = function(poi) {
	Mojo.Log.info("name : %s", poi.address);
	
	Go2Car2Go.mapRouteCall(poi);
};

ParkingAssistant.prototype.listFilterHandler = function(filterString, listWidget, offset, count){
	
	var subset = [];
	var totalSubsetSize = 0;
	var lowerString = filterString.toLowerCase();
	
	//--> Loop through the original data set & get the subset of items that have the filterstring 
	var i = 0;
	
	while (i < this.listItems.length){
		fldA = this.listItems[i].name.toLowerCase();
		
		if (fldA.include(lowerString)){
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
ParkingAssistant.prototype.listFilter = function(event){
};


//--> Yes, this handles all map UI.
ParkingAssistant.prototype.mapToggle = function(event){
	//--> Togggles the map display.
	this.handleMapView();
};

ParkingAssistant.prototype.handleVehicleView = function(e) {
    Mojo.Log.info("go to vehicles view");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("vehicles", {});
};

ParkingAssistant.prototype.handleParkingView = function(e) {
    Mojo.Log.info("go to parking spots view");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("parking",{});
};

ParkingAssistant.prototype.handleGasstationView = function(e) {
    Mojo.Log.info("go to gas stations view");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("gasstations",{});
};

ParkingAssistant.prototype.handleMapView = function(e){

	Mojo.Log.info("go to map view of parking spots");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("map", this.numberOfParkings , 'parking', this.listItems);
};

ParkingAssistant.prototype.handleBookingsView = function(e) {
    Mojo.Log.info("go to bookings view");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("bookings",{});
};

ParkingAssistant.prototype.showPreferences = function() {
	Mojo.Controller.stageController.pushScene("preferences");
	
};

//Ajax request related code
ParkingAssistant.prototype.setupData = function() {
	
    this.getParkingCache({
					 onComplete: this._gotParkingCache.bind(this),
					 onFailure:  this._gotParkingCacheFailure.bind(this)
					 });
};

ParkingAssistant.prototype.getParkingCache = function(opt_params) {
    var onSuccess = opt_params['onComplete'] || function() {};
    var onFailure = opt_params['onFailure']  || function() {};
	
    var db = Go2Car2Go.getDB();
    var parking = db.simpleGet(this.kPARKING_CACHE, onSuccess, onFailure);
};

// DB operation was successful. Now let's see 
ParkingAssistant.prototype._gotParkingCache = function(json){

	if (json && json.length) {		
        this.loadParking(json.evalJSON());
    }
    else {
  	    this.updateParking();
    }
    // Update gas model if not available or old
};

ParkingAssistant.prototype._gotParkingCacheFailure = function(error){
	Mojo.Log.error("Error fetching gas from DB: " + error);
	this.updateParking();
};

/**
 * This is the callback we use after we get responce from car2go server
 * @params transport - The transport object return by the AJAX request
 * @private
 * @method _gotCar2goGas
 */
ParkingAssistant.prototype._gotParking = function(transport) {
	
    var r = transport.responseJSON;
    var db = Go2Car2Go.getDB();
	
    if (r) {
        db.simpleAdd(this.kPARKING_CACHE, Object.toJSON(r),
					 function() {
					 },
					 function(error) {
					 Mojo.Log.error("Failed to save parking to local cache");
					 });
    }
	
    this.loadParking(r);
};

ParkingAssistant.prototype.loadParking = function(json){
	
	// Let's check if gas valid
	if (json) {
		// reset the boundaries
		this.maxLat = -100000;
		this.minLat = 100000;
		this.maxLon = -100000;
		this.minLon = 100000;

		//--> for better maps marker drawing preformance
		// reduce number of markers to max of 10
		if (json.placemarks.length < 10){
			this.numberOfParkings = json.placemarks.length;
		} else {
			this.numberOfParkings = 10;
		}
		
		//--> Process each record
		for (i=0; i< json.placemarks.length; i++){
			// --> Reset temp data vars
			vName = "";
			vCoordinates = "";
			vLatitude = 0;
			vLongitude = 0;
			var vDistance = 0;
			vCapacity = 0;
			vUsed = 0;
			vFree = 0;

			
			vName = json.placemarks[i].name;
			vCapacity = Number(json.placemarks[i].totalCapacity);
			vUsed = Number(json.placemarks[i].usedCapacity);
			Mojo.Log.info("parking place capasity %s", vCapacity);
			vFree =  vCapacity - vUsed ;

			
			//--> Geodata
			if (json.placemarks[i].coordinates){

				var tempCoordinates = json.placemarks[i].coordinates.toString().split(",");
				
				//--> Enforce numeric
				vLatitude = Number(tempCoordinates[1]);
				vLongitude = Number(tempCoordinates[0]);
				
				
				//--> Calculate distance between current location and car2go object
				vDistance = Go2Car2Go.distance(vLatitude, vLongitude, _globals.latitude, _globals.longitude );
			}

			if(Go2Car2Go.useMiles){
				var vUnit = "miles"; // earth diameter in miles
			} else {
				var vUnit = "km"; // earth diameter in km
			}
			
			//--> Not push all data to our List Object
			this.listItems.push({index: i, name: vName, free: vFree, latitude: vLatitude, longitude: vLongitude, distance: vDistance, unit: vUnit});

		}
		
		
		this.listItems.sort(function(a,b) {
							// assuming distance is always a valid integer
							return a.distance - b.distance;
							});
		
		this.listSearch.mojo.noticeUpdatedItems(0, this.listItems);
		
		
		//--> Turn our sections on/off
		
		this.controller.get("search.results.header").style.display = "";
		this.controller.get("search.results.div").style.display = "";
		// Enable map button
		this.map_Button_Model.disabled = false;
		this.controller.modelChanged(this.map_Button_Model);
		
	}
	else {
		this.controller.get("search.results.header").style.display = "";
		this.controller.get("search.results.div").style.display = "none";
		this.controller.get("search.results.none").innerHTML = $L("There was an error loading the search results");
		this.controller.get("search.results.none").style.display = "";
	}
};


/**
 * Function to get gas stations from car2go server; we want to refresh the gas list
 * @method updateGas
 */
ParkingAssistant.prototype.updateParking = function() {
	Go2Car2Go.getParkings({
						  onComplete: this._gotParking.bind(this),
						  onFailure: this._requestFailure.bind(this)
						  });
};


ParkingAssistant.prototype._requestFailure = function(transport) {
	//    this.hideSpinner();
	Mojo.Log.error("[_requestFailure] called");
    Mojo.Controller.errorDialog("Server is not available");
	
};

/**
 * This is the callback we use after application close
 * @method clearVehiclesCache
 */
ParkingAssistant.prototype.clearParkingCache = function(transport) {
    var db = Go2Car2Go.getDB();
    db.discard(this.kPARKING_CACHE);
};

ParkingAssistant.prototype.showPreferences = function() {
	Mojo.Controller.stageController.pushScene("preferences");
};

ParkingAssistant.prototype.logout = function() {
	Go2Car2Go.logout();
};

ParkingAssistant.prototype.unitChangedHandler = function(){
	Go2Car2Go.clearCache(Go2Car2Go.kPARKING_CACHE);
	this.listItems = [];
	this.setupData();
};

ParkingAssistant.prototype.locationChangedHandler = function(){
	Go2Car2Go.clearCache(Go2Car2Go.kPARKING_CACHE);
	this.listItems = [];
	this.setupData();
};
