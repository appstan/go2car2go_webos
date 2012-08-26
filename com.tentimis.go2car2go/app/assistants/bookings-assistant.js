function BookingsAssistant(params) {
	this.params = params
}

BookingsAssistant.prototype.setup = function() {

	if (Go2Car2Go.requireLogin) {
		var sController = this.controller.stageController;
		sController.pushScene('login');
    }
	
    Go2Car2Go.onGetBookings = function(json) {
		    this.loadBookings(json);
    }.bind(this);
    
	//--> setup application menu
	Go2Car2Go.initAppMenu(this);

	//--> A blank object of data...
	this.listItems = [];


	//--> Setup List Widget
	this.controller.setupWidget("search.results.list", this.listAttr = {
		itemTemplate: "bookings/rowTemplate",
		listTemplate: "bookings/listTemplate",
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
						toggleCmd:'bookings', 
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
	
	//--> Setup the Map/List Toggle button
	this.map_Button = {};
	this.controller.setupWidget("map.button", this.map_Button, this.map_Button_Model = {buttonLabel: $L("Map"), buttonClass: "primary green mini", disabled: true});
	
	//--> Setup List Controls
//	this.LaunchIt = this.listTapHandler.bindAsEventListener(this);
//	this.FilterIt = this.listFilter.bindAsEventListener(this);
	//--> Setup List Listeners
//	 Mojo.Event.listen(this.listSearch, Mojo.Event.listTap, this.LaunchIt);
//	 Mojo.Event.listen(this.listSearch, Mojo.Event.filterImmediate, this.FilterIt);
	this.setupData();
	
	
	//--> Toggling the Map
	//Mojo.Event.listen(this.controller.get("map.button"), Mojo.Event.tap, this.mapToggle.bindAsEventListener(this));
	//--> Listen for prefrences changes
	this.controller.listen(Mojo.Controller.stageController.document, "unit-changed", this.unitChangedHandler.bind(this));
	this.controller.listen(Mojo.Controller.stageController.document, "location-changed", this.locationChangedHandler.bind(this));
	

};


BookingsAssistant.prototype.listFilterHandler = function(filterString, listWidget, offset, count){
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
};

BookingsAssistant.prototype.listFilter = function(event){
};

BookingsAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
};

BookingsAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};

BookingsAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
//   	Mojo.Event.stopListening(this.listSearch, Mojo.Event.listTap, this.LaunchIt);
//	Mojo.Event.stopListening(this.listSearch, Mojo.Event.filterImmediate, this.FilterIt);
//	Mojo.Event.stopListening(this.controller.get("map.button"), Mojo.Event.tap, this.mapToggle.bindAsEventListener(this));

	//--> Stop listening for prefrences changes
	this.controller.stopListening(Mojo.Controller.stageController.document, "unit-changed", this.unitChangedHandler);
	this.controller.stopListening(Mojo.Controller.stageController.document, "location-changed", this.locationChangedHandler);
	
};

BookingsAssistant.prototype.handleCommand = function(event){
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
			case "logout":
				this.logout();
				break;
			case "preferences":
				this.showPreferences();
				break;
				
			default:
				break;
		}
	}

};

BookingsAssistant.prototype.handleVehicleView = function(e) {
    Mojo.Log.info("go to vehicles view");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("vehicles", {});
};

BookingsAssistant.prototype.handleParkingView = function(e) {
    Mojo.Log.info("go to parking spots view");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("parking",{});
};

BookingsAssistant.prototype.handleGasstationView = function(e) {
    Mojo.Log.info("go to gas stations view");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("gasstations",{});
};

BookingsAssistant.prototype.handleBookingsView = function(e) {
    Mojo.Log.info("go to bookings view");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("bookings",{});
};

BookingsAssistant.prototype.handleMapView = function(e){

	Mojo.Log.info("go to map view of bookings");
	var sController = this.controller.stageController;
	sController.popScene();
	sController.pushScene("map", bookings.booking.length , 'bookings', this.listItems);
};

BookingsAssistant.prototype.mapToggle = function(event){
	//Testing map view in separate scene
	this.handleMapView();
};

BookingsAssistant.prototype.setupData = function() {
    Mojo.Log.info("Getting bookings");
	if (!Go2Car2Go.requireLogin) {
		this.getBookings();
	}
};

BookingsAssistant.prototype.getBookings = function(){
	Go2Car2Go.getBookings();
};

BookingsAssistant.prototype._requestFailure = function(transport) {
//    this.hideSpinner();
	Mojo.Log.error("[_requestFailure] called");
    Mojo.Controller.errorDialog("Server is not available");

};

BookingsAssistant.prototype.loadBookings = function(bookings){
	Mojo.Log.info("[loadBookings] called");

	// Let's check if bookings valid
	if (bookings) {
     // reset the boundaries
		this.maxLat = -100000;
		this.minLat = 100000;
		this.maxLon = -100000;
		this.minLon = 100000;
		
		
		//--> Process each record
		for (i=0; i<bookings.booking.length; i++){
			// --> Reset temp data vars
			vReservationTime = 0;
			vAddress = "";
			vInterior = "";
			vExterior = "";
			vLatitude = 0;
			vLongitude = 0;
			var vDistance = 0;
			vReservationTime = Object.toJSON(bookings.booking[i].reservationTime);
			vAddress = bookings.booking[i].bookingposition.address;
			vInterior = bookings.booking[i].vehicle.interior;
			vExterior = bookings.booking[i].vehicle.exterior;
			vName = bookings.booking[i].vehicle.numberPlate;
			
			//--> Geodata
			if (bookings.booking[i].vehicle){
				
				//--> Enforce numeric
				vLatitude = Number(bookings.booking[i].vehicle.position.latitude);
				vLongitude = Number(bookings.booking[i].vehicle.position.longitude);
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
			this.listItems.push({
				index: i, 
				name: vName, 
				address: vAddress, 
				interior: vInterior, 
				exterior: vExterior, 
				latitude: vLatitude, 
				longitude: vLongitude, 
				distance: vDistance, 
				resvTime: vReservationTime,
				unit: vUnit
			});
		}
		

/* 		this.listItems.sort(function(a,b) {
			// assuming distance is always a valid integer
			return a.distance - b.distance;
		});
 */		
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
};

BookingsAssistant.prototype.showPreferences = function() {
//	var sController = this.controller.stageController;
//	sController.pushScene("preferences");
	Mojo.Controller.stageController.pushScene("preferences");

};

BookingsAssistant.prototype.logout = function() {
	// Remove oauth_token and show login view
	Go2Car2Go.logout();
	Mojo.Controller.stageController.pushScene('login');

};

BookingsAssistant.prototype.unitChangedHandler = function(){
	this.listItems = [];
	this.setupData();
};

BookingsAssistant.prototype.locationChangedHandler = function(){
	this.listItems = [];
	this.setupData();
}
