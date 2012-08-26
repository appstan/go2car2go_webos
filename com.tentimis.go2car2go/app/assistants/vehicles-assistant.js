function VehiclesAssistant(params){
	this.params = params;
	this.kVEHICLES_CACHE = "vehicles";
	this.numberOfVehicles = null;

}
VehiclesAssistant.prototype.aboutToActivate = function(){
}
VehiclesAssistant.prototype.setup = function(){
	//--> setup application menu
	Go2Car2Go.initAppMenu(this);

	Go2Car2Go.onBookingDone = function() {
		this.handleBookingsView();
    }.bind(this);


	//--> A blank object of data...
	this.listItems = [];


	//--> Setup List Widget
	this.controller.setupWidget("search.results.list", this.listAttr = {
		itemTemplate: "vehicles/rowTemplate",
		listTemplate: "vehicles/listTemplate",
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
						{label:$L('Vehicles'), 
						toggleCmd:'vehicles', 
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
	this.listSearch = this.controller.get("search.results.list");
	

	//--> Start our AJAX Call
//	this.loadAJAX.bind(this).defer();
	
	
	//--> Setup the Map/List Toggle button
	this.map_Button = {};
	this.controller.setupWidget("map.button", this.map_Button, this.map_Button_Model = {buttonLabel: $L("Map"), buttonClass: "primary green mini", disabled: true});
	
	
	//--> Setup List Controls
	this.LaunchIt = this.listTapHandler.bindAsEventListener(this);
	this.FilterIt = this.listFilter.bindAsEventListener(this);
	
	this.setupData();
	
	//--> Setup List Listeners
	Mojo.Event.listen(this.listSearch, Mojo.Event.listTap, this.LaunchIt);
	Mojo.Event.listen(this.listSearch, Mojo.Event.filterImmediate, this.FilterIt);
	
	//--> Toggling the Map
	Mojo.Event.listen(this.controller.get("map.button"), Mojo.Event.tap, this.mapToggle.bindAsEventListener(this));

	//--> Listen for prefrences changes
	this.controller.listen(Mojo.Controller.stageController.document, "unit-changed", this.unitChangedHandler.bind(this));
	this.controller.listen(Mojo.Controller.stageController.document, "location-changed", this.locationChangedHandler.bind(this));
	
}
VehiclesAssistant.prototype.activate = function(event){
}
VehiclesAssistant.prototype.deactivate = function(event){
	//clean cache before closing app
    //this.clearVehiclesCache(this);

}
VehiclesAssistant.prototype.cleanup = function(event){
	//--> Stop our Event Listeners
	//==================================================
	Mojo.Event.stopListening(this.listSearch, Mojo.Event.listTap, this.LaunchIt);
	Mojo.Event.stopListening(this.listSearch, Mojo.Event.filterImmediate, this.FilterIt);
	Mojo.Event.stopListening(this.controller.get("map.button"), Mojo.Event.tap, this.mapToggle.bindAsEventListener(this));
	this.controller.stopListening(Mojo.Controller.stageController.document, "unit-changed", this.unitChangedHandler);
	this.controller.stopListening(Mojo.Controller.stageController.document, "location-changed", this.locationChangedHandler);
	
}
VehiclesAssistant.prototype.handleCommand = function(event){
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
}
VehiclesAssistant.prototype.handleResize = function(event){
	//--> Call the map-ui-sizing function
//Testing map view in separate scene
//	this.mapUI("ui-size");
	
}

VehiclesAssistant.prototype.listTapHandler = function(event){
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

VehiclesAssistant.prototype.listFilterHandler = function(filterString, listWidget, offset, count){
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
VehiclesAssistant.prototype.listFilter = function(event){
}


VehiclesAssistant.prototype.mapToggle = function(event){
	this.handleMapView();
}

VehiclesAssistant.prototype.handleVehicleView = function(e) {
    Mojo.Log.info("go to vehicles view");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("vehicles", {});
}

VehiclesAssistant.prototype.handleParkingView = function(e) {
    Mojo.Log.info("go to parking spots view");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("parking",{});
}

VehiclesAssistant.prototype.handleGasstationView = function(e) {
    Mojo.Log.info("go to gas stations view");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("gasstations",{});
}

VehiclesAssistant.prototype.handleMapView = function(e){

	Mojo.Log.info("go to map view of vehicles");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("map", this.numberOfVehicles, 'vehicles', this.listItems);

}

VehiclesAssistant.prototype.handleBookingsView = function(e) {
    Mojo.Log.info("go to bookings view");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("bookings",{});
}

VehiclesAssistant.prototype.setupData = function() {
    Mojo.Log.info("Getting vehicles data from cache");

    this.getVehiclesCache({
        onComplete: this._gotCar2goVehiclesCache.bind(this),
        onFailure:  this._gotCar2goVehiclesCacheFailure.bind(this)
    });
}

/**
* Load the vehicles from the local cache.
* @method getConnectionsCache
*/
VehiclesAssistant.prototype.getVehiclesCache = function(opt_params) {
    var onSuccess = opt_params['onComplete'] || function() {};
    var onFailure = opt_params['onFailure']  || function() {};

    var db = Go2Car2Go.getDB();
    var vehicles = db.simpleGet(this.kVEHICLES_CACHE, onSuccess, onFailure);
};
// DB operation was successful. Now let's see 
VehiclesAssistant.prototype._gotCar2goVehiclesCache = function(vehicles){
	Mojo.Log.info("Vehicles database opened OK");
    // Check to make sure the cache exists
    if (vehicles && vehicles.length) {
        this.loadVehicles(vehicles.evalJSON());
    }
    else {
        Mojo.Log.info("[updateVehicles()] called in _gotCar2goVehiclesCache");
  	    this.updateVehicles();
    }
    // Update vehicles model if not available or old
}

VehiclesAssistant.prototype._gotCar2goVehiclesCacheFailure = function(error){
	Mojo.Log.error("Error fetching vehicles from DB: " + error);
	this.updateVehicels();
}

/**
* This is the callback we use after we get responce from car2go server
* @params transport - The transport object return by the AJAX request
* @private
* @method _gotCar2goVehicles
*/
VehiclesAssistant.prototype._gotCar2goVehicles = function(transport) {

    var r = transport.responseJSON;
    var db = Go2Car2Go.getDB();

    if (r) {
        db.simpleAdd(this.kVEHICLES_CACHE, Object.toJSON(r),
        function() {
            },
        function(error) {
            Mojo.Log.error("Failed to save vehicles to local cache");
        });
    }

    this.loadVehicles(r);
};

VehiclesAssistant.prototype.loadVehicles = function(vehicles){
	Mojo.Log.info("[loadVehicles] called");

	// Let's check if vehicles valid
	if (vehicles) {
     // reset the boundaries
		this.maxLat = -100000;
		this.minLat = 100000;
		this.maxLon = -100000;
		this.minLon = 100000;

		//--> for better maps marker drawing preformance
		// reduce number of markers to max of 10
		if (vehicles.placemarks.length < 10){
			this.numberOfVehicles = vehicles.placemarks.length;
		} else {
			this.numberOfVehicles = 10;
		}
		
		
		//--> Process each record
		for (i=0; i<vehicles.placemarks.length; i++){
			// --> Reset temp data vars
			vName = "";
			vAddress = "";
			vCoordinates = "";
			vInterior = "";
			vExterior = "";
			vLatitude = 0;
			vLongitude = 0;
			vVin = ""
			var vDistance = 0;
			
			vAddress = vehicles.placemarks[i].address;
			vInterior = vehicles.placemarks[i].interior;
			vExterior = vehicles.placemarks[i].exterior;
			vName = vehicles.placemarks[i].name;
			vVin = vehicles.placemarks[i].vin;
			
			//--> Geodata
			if (vehicles.placemarks[i].coordinates){
				var tempCoordinates = vehicles.placemarks[i].coordinates.toString().split(",");
				
				//--> Enforce numeric
				vLatitude = Number(tempCoordinates[1]);
				vLongitude = Number(tempCoordinates[0]);
				//--> Calculate distance between current location and car2go object
				vDistance = Go2Car2Go.distance(vLatitude, vLongitude, _globals.latitude, _globals.longitude );
				
			}
			// 
			if(Go2Car2Go.useMiles){
				var vUnit = "miles"; // earth diameter in miles
			} else {
				var vUnit = "km"; // earth diameter in km
			}
			
			//--> Now push all data to our List Object
			this.listItems.push({index: i, name: vName, address: vAddress, interior: vInterior, exterior: vExterior, vin: vVin, latitude: vLatitude, longitude: vLongitude, distance: vDistance, unit: vUnit});
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
		Mojo.Log.error("No json data!");
		this.controller.get("search.results.header").style.display = "";
		this.controller.get("search.results.div").style.display = "none";
		this.controller.get("search.results.none").innerHTML = $L("There was an error loading the search results");
		this.controller.get("search.results.none").style.display = "";
	}
}


/**
* Function to get vehicles from car2go server; we want to refresh the vehicles list
* @method updateVehicles
*/
VehiclesAssistant.prototype.updateVehicles = function() {
	Go2Car2Go.getVehicles({
        onComplete: this._gotCar2goVehicles.bind(this),
        onFailure: this._requestFailure.bind(this)
    });
};

VehiclesAssistant.prototype._requestFailure = function(transport) {
//    this.hideSpinner();
	Mojo.Log.error("[_requestFailure] called");
    Mojo.Controller.errorDialog("Server is not available");

};
/**
* This is the callback we use after application close
* @method clearVehiclesCache
*/
VehiclesAssistant.prototype.clearVehiclesCache = function(transport) {
    var db = Go2Car2Go.getDB();
    db.discard(this.kVEHICLES_CACHE);
};

VehiclesAssistant.prototype.launchMaps = function(poi) {
	Mojo.Log.info("name : %s", poi.address);

	Go2Car2Go.mapRouteCall(poi);
};

VehiclesAssistant.prototype.createBooking = function(vin) {
	if (Go2Car2Go.requireLogin) {
		var sController = this.controller.stageController;
		sController.pushScene('login');
    } else {
    	Go2Car2Go.createBooking(vin);
    }

};

VehiclesAssistant.prototype.showPreferences = function() {
	Mojo.Controller.stageController.pushScene("preferences");
};

VehiclesAssistant.prototype.logout = function() {
	Go2Car2Go.logout();
};

VehiclesAssistant.prototype.unitChangedHandler = function(){
	Go2Car2Go.clearCache(Go2Car2Go.kVEHICLES_CACHE);
	this.listItems = [];
	this.setupData();
};

VehiclesAssistant.prototype.locationChangedHandler = function(){
	Go2Car2Go.clearCache(Go2Car2Go.kVEHICLES_CACHE);
	this.listItems = [];
	this.setupData();
};
