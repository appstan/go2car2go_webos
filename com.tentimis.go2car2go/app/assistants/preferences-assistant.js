function PreferencesAssistant() {
    	this.kLOCATIONS_CACHE = "locations";
}

PreferencesAssistant.prototype.setup = function() {
   	this.selectListItems = [];

    this.setupData();

	this.selectUnitModel = {
		value : Go2Car2Go.unit,
		disabled : false
	}

	this.controller.setupWidget('select-unit', 
		this.attributes = {
			choices : [ {
				label : "km",
				value : 'km'
			}, {
				label : "miles",
				value : 'miles'
			} ]
		}, 
		this.selectUnitModel
	);
	
	this.selectLocationModel = {
		value : Go2Car2Go.location,
		disabled : false
	};
	/* setup list widget for locations */
	this.controller.setupWidget('select-location',	this.attributes = { choices : this.selectListItems	}, this.selectLocationModel );
	
	// Add listeners
	this.controller.listen(this.controller.get('select-unit'), Mojo.Event.propertyChange, this.unitChanged.bind(this));
	this.controller.listen(this.controller.get('select-location'), Mojo.Event.propertyChange, this.locationChanged.bind(this));
};

PreferencesAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
};

PreferencesAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};

PreferencesAssistant.prototype.cleanup = function(event) {
	// Remove listeners
	this.controller.stopListening(this.controller.get('select-unit'), Mojo.Event.propertyChange, this.unitChanged);
	this.controller.stopListening(this.controller.get('select-location'), Mojo.Event.propertyChange, this.locationChanged);
};

PreferencesAssistant.prototype.unitChanged = function() {
	var unit = this.selectUnitModel.value;
	if (unit){
		Go2Car2Go.unit = unit;
		if (unit == 'km'){
			Go2Car2Go.useMiles = false;
		} else {
			Go2Car2Go.useMiles = true;
		}
		Mojo.Log.info("in unitChaned with %s", Object.toJSON(unit));
		
		var db = Go2Car2Go.getDB();
		db.simpleAdd(Go2Car2Go.kCAR2GOUSER_UNIT, { unitName: unit },
					 function() {},
					 function(error) {
					 Mojo.Log.error("Failed to save unit name to local cache");
					 });
		
		Mojo.Event.send(Mojo.Controller.stageController.document, "unit-changed");
		
	}
	
};

PreferencesAssistant.prototype.locationChanged = function() {
	var location = this.selectLocationModel.value;
	if (location){
		Go2Car2Go.location = location;
		Mojo.Log.info("in locationChaned with %s", Object.toJSON(location));
		
		var db = Go2Car2Go.getDB();
		db.simpleAdd(Go2Car2Go.kCAR2GOUSER_LOCATION, { locationName: location },
					 function() {},
					 function(error) {
					 Mojo.Log.error("Failed to unit name to local cache");
					 });
		
		Mojo.Event.send(Mojo.Controller.stageController.document, "location-changed");
		
	}	
};

PreferencesAssistant.prototype.loadLocations = function( locations) {
     for( i=0; i < locations.location.length; i++ ){
	     mLabel = "";
		 mValue = "";
		 mLabel = locations.location[i].locationName;
		 mValue = locations.location[i].locationName;
		 
	     this.selectListItems.push({label : mLabel, value : mValue });
	 }
};

PreferencesAssistant.prototype.setupData = function() {
    Mojo.Log.info("Getting car2go cities from cache");

    this.getCar2goLocationsFromCache({
        onComplete: this._gotCar2goLocationsCache.bind(this),
        onFailure:  this._gotCar2goLocationsCacheFailure.bind(this)
    });
};

PreferencesAssistant.prototype.getCar2goLocationsFromCache = function(opt_params) {
    var onSuccess = opt_params['onComplete'] || function() {};
    var onFailure = opt_params['onFailure']  || function() {};

    var db = Go2Car2Go.getDB();
    var vehicles = db.simpleGet(this.kLOCATIONS_CACHE, onSuccess, onFailure);
};

// DB operation was successful. Now let's see 
PreferencesAssistant.prototype._gotCar2goLocationsCache = function(locations){
    // Check to make sure the cache exists
    if (locations && locations.length) {
		Mojo.Log.info("Car2go cities read from cache successfully");
        this.loadLocations(locations.evalJSON());
    }
    else {
  	    this.updateLocations();
    }
};

PreferencesAssistant.prototype._gotCar2goLocationsCacheFailure = function(error){
	Mojo.Log.error("Error fetching car2go cities from DB: " + error);
	this.updateLocations();
};

/**
* Function to get supported cities from car2go server; we want to refresh the select list
* @method updateLocations
*/
PreferencesAssistant.prototype.updateLocations = function() {
	Go2Car2Go.requestLocations({
        onComplete: this._gotCar2goLocations.bind(this),
        onFailure: this._requestFailure.bind(this)
    });
};

PreferencesAssistant.prototype._requestFailure = function(transport) {
//    this.hideSpinner();
	Mojo.Log.error("[_requestFailure] called");
    Mojo.Controller.errorDialog("Server is not available");

};

/**
* This is the callback we use after we get responce from car2go server
* @params transport - The transport object return by the AJAX request
* @private
* @method _gotCar2goVehicles
*/
PreferencesAssistant.prototype._gotCar2goLocations = function(transport) {

    var r = transport.responseJSON;
    var db = Go2Car2Go.getDB();

    if (r) {
        db.simpleAdd(this.kLOCATIONS_CACHE, Object.toJSON(r),
        function() {
            },
        function(error) {
            Mojo.Log.error("Failed to save vehicles to local cache");
        });
    }

    this.loadLocations(r);
};
