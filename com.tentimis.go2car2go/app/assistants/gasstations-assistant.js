function GasstationsAssistant(params){
	this.params = params;
	this.kGAS_CACHE = "gas";
	this.numberOfGasStations = null;

}
GasstationsAssistant.prototype.aboutToActivate = function(){
}
GasstationsAssistant.prototype.setup = function(){
	//--> setup application menu
	Go2Car2Go.initAppMenu(this);
	
	//--> A blank object of data...
	this.listItems = [];
	
	//--> Setup List Widget
	//==================================================
	this.controller.setupWidget("search.results.list", this.listAttr = {
								itemTemplate: "gasstations/rowTemplate",
								listTemplate: "gasstations/listTemplate",
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
			toggleCmd:'gas', 
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
	
	
	//--> Start our AJAX Call
	// this.loadAJAX.bind(this).defer();
	
	
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
	
}
GasstationsAssistant.prototype.activate = function(event){
}
GasstationsAssistant.prototype.deactivate = function(event){
}
GasstationsAssistant.prototype.cleanup = function(event){
	//--> Stop our Event Listeners
	//==================================================
	Mojo.Event.stopListening(this.listSearch, Mojo.Event.listTap, this.LaunchIt);
	Mojo.Event.stopListening(this.listSearch, Mojo.Event.filterImmediate, this.FilterIt);
	Mojo.Event.stopListening(this.controller.get("map.button"), Mojo.Event.tap, this.mapToggle.bindAsEventListener(this));

	//--> Stop listening for prefrences changes
	this.controller.stopListening(Mojo.Controller.stageController.document, "unit-changed", this.unitChangedHandler);
	this.controller.stopListening(Mojo.Controller.stageController.document, "location-changed", this.locationChangedHandler);
	
	this.controller.window.onresize = null;
}
GasstationsAssistant.prototype.handleCommand = function(event){
	if (event.type == Mojo.Event.back){
		//--> Close map if open instead of popping the scene
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
GasstationsAssistant.prototype.listTapHandler = function(event){
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

GasstationsAssistant.prototype.launchMaps = function(poi) {
	Mojo.Log.info("name : %s", poi.address);
	
	Go2Car2Go.mapRouteCall(poi);
};

GasstationsAssistant.prototype.listFilterHandler = function(filterString, listWidget, offset, count){
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
		//this.listItems.push({index: i, name: vName, address: vAddress, addressb:vAddress2, linec:vLineC});
		
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
GasstationsAssistant.prototype.listFilter = function(event){
}




GasstationsAssistant.prototype.mapToggle = function(event){
	//Testing map view in separate scene
	this.handleMapView();
}

GasstationsAssistant.prototype.handleVehicleView = function(e) {
    Mojo.Log.info("go to vehicles view");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("vehicles", {});
}

GasstationsAssistant.prototype.handleParkingView = function(e) {
    Mojo.Log.info("go to parking spots view");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("parking",{});
}

GasstationsAssistant.prototype.handleGasstationView = function(e) {
    Mojo.Log.info("go to gas stations view");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("gasstations",{});
}

GasstationsAssistant.prototype.handleMapView = function(e){
	
	Mojo.Log.info("go to map view of vehicles");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("map", this.numberOfGasStations , 'gas', this.listItems);
}

GasstationsAssistant.prototype.handleBookingsView = function(e) {
    Mojo.Log.info("go to bookings view");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("bookings",{});
}

// Ajax request related code
GasstationsAssistant.prototype.setupData = function() {
    Mojo.Log.info("Getting gas stations data from cache");
	
    this.getGasCache({
					 onComplete: this._gotGasCache.bind(this),
					 onFailure:  this._gotGasCacheFailure.bind(this)
					 });
}

GasstationsAssistant.prototype.getGasCache = function(opt_params) {
    var onSuccess = opt_params['onComplete'] || function() {};
    var onFailure = opt_params['onFailure']  || function() {};
	
    var db = Go2Car2Go.getDB();
    var vehicles = db.simpleGet(this.kGAS_CACHE, onSuccess, onFailure);
}

// DB operation was successful. Now let's see 
GasstationsAssistant.prototype._gotGasCache = function(gas){

	if (gas && gas.length) {		
        this.loadGas(gas.evalJSON());
    }
    else {
  	    this.updateGas();
    }
    // Update gas model if not available or old
}

GasstationsAssistant.prototype._gotGasCacheFailure = function(error){
	Mojo.Log.error("Error fetching gas from DB: " + error);
	this.updateGas();
}

/**
 * This is the callback we use after we get responce from car2go server
 * @params transport - The transport object return by the AJAX request
 * @private
 * @method _gotCar2goGas
 */
GasstationsAssistant.prototype._gotGas = function(transport) {
	
    var r = transport.responseJSON;
    var db = Go2Car2Go.getDB();
	
    if (r) {
        db.simpleAdd(this.kGAS_CACHE, Object.toJSON(r),
					 function() {
					 },
					 function(error) {
					 Mojo.Log.error("Failed to save gas to local cache");
					 });
    }
	
    this.loadGas(r);
}

GasstationsAssistant.prototype.loadGas = function(json){
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
			this.numberOfGasStations = json.placemarks.length;
		} else {
			this.numberOfGasStations = 10;
		}

		
		//--> Process each record
		for (i=0; i< json.placemarks.length ; i++){
			// --> Reset temp data vars
			vName = "";
			vCoordinates = "";
			vLatitude = 0;
			vLongitude = 0;
			var vDistance = 0;
			
			vName = json.placemarks[i].name;
			
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
			this.listItems.push({index: i, name: vName, latitude: vLatitude, longitude: vLongitude, distance: vDistance, unit: vUnit});

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
 * Function to get gas stations from car2go server; we want to refresh the gas list
 * @method updateGas
 */
GasstationsAssistant.prototype.updateGas = function() {
	Go2Car2Go.getGasstations({
						  onComplete: this._gotGas.bind(this),
						  onFailure: this._requestFailure.bind(this)
						  });
}

GasstationsAssistant.prototype._requestFailure = function(transport) {
	//    this.hideSpinner();
	Mojo.Log.error("[_requestFailure] called");
    Mojo.Controller.errorDialog("Server is not available");
	
}

GasstationsAssistant.prototype.showPreferences = function(){
	Mojo.Controller.stageController.pushScene("preferences");
};

GasstationsAssistant.prototype.logout = function() {
	Go2Car2Go.logout();
};

GasstationsAssistant.prototype.unitChangedHandler = function(){
	Go2Car2Go.clearCache(Go2Car2Go.kGAS_CACHE);
	this.listItems = [];
	this.setupData();
};

GasstationsAssistant.prototype.locationChangedHandler = function(){
	Go2Car2Go.clearCache(Go2Car2Go.kGAS_CACHE);
	this.listItems = [];
	this.setupData();
};

