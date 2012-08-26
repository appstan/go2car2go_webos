function MainAssistant(params){
}

MainAssistant.prototype.setup = function(){
	//--> Set up the spinner
    this.spinnerAttr = {
        spinnerSize: Mojo.Widget.spinnerLarge
    };

    this.spinnerModel = {
        spinning: true
    };

    this.controller.setupWidget('spinner', this.spinnerAttr, this.spinnerModel);


    this.controller.topContainer().select(".localizable").each(function(elem) {
        elem.innerHTML = $L(elem.innerHTML);
    });

	//--> Load Google Maps Javascript asynchronously
//	Mojo.loadScriptWithCallback("http://maps.google.com/maps/api/js?sensor=true&callback=googleMapsLoaded", null);
    Mojo.loadScriptWithCallback("http://maps.googleapis.com/maps/api/js?v=3.6&sensor=true&callback=googleMapsLoaded", null);

	this.menuModel = {
			visible:true,
			items: [
					{},
						{label:$L(''), 
						toggleCmd:'', 
						items:[
								{label:$L('Vehicles'), icon: 'menu-car', command:'vehicles'}, 
								{label:$L('Parking'), icon: 'menu-parking', command:'parking'}, 
								{label:$L('Gas Stations'), icon: 'menu-gas', command:'gas'},
								{label:$L('Booking'), icon: 'menu-booking', command:'bookings'}
						 ]},
					{},
					]};
			
	this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.menuModel);

	//--> get current location
	if (!gpsDone) {
		this.getLocation();
	}
}

MainAssistant.prototype.activate = function(event){
	  this.controller.get('spinner').mojo.stop();
	  this.controller.get('spinner').mojo.start();
}

MainAssistant.prototype.deactivate = function(event){
	  this.controller.get('spinner').mojo.stop();
}

MainAssistant.prototype.cleanup = function(event){
	
}

MainAssistant.prototype.showVehicles = function(event){
	this.controller.stageController.swapScene("vehicles",{});
}

MainAssistant.prototype.successLocation = function(event){
	Mojo.Log.info("got gps response");
	if(event.errorCode==0){
		Mojo.Log.info("gps is ok");
		
		_globals.latitude=event.latitude;
		_globals.longitude=event.longitude;
		_globals.hacc=event.horizAccuracy;
		_globals.vacc=event.vertAccuracy;
		_globals.altitude=event.altitude;
		_globals.gps=event;
		 gpsDone=true;
		 
		//---> show vehicles
		 this.showVehicles(event);
	}
	else {
		this.failedLocation(event);
	}
}

MainAssistant.prototype.failedLocation = function(event){

	var msg='';
	switch(event.errorCode){
		case 1:
			msg='Your GPS timed out. Try using your phone outside or restarting your phone. (EC1)';
			break;
		case 2:
			msg="Your position is unavailable. Satellites could not be located. (EC2)";
			break;
		case 3:
			msg="Your GPS returned an unknown error. Try restarting your phone. (EC3)";
			break;
		case 5:
			msg="You have Location Services turned off. Please turn them on and restart go2car2go. (EC5)";
			break;
		case 6:
			msg="GPS permission was denied. You have not accepted the terms of use for the Google Location Service. (EC6)";
			break;
		case 7:
			msg="go2car2go is already awaiting a GPS response and asked for another. Try restarting your phone. (EC7)";
			break;
		case 8:
			msg="go2car2go was denied GPS access for this session. Please restart your go2car2go and allow access to location service when prompted.";
			break;
	}


	this.controller.showAlertDialog({
		onChoose: function(value) {
			if(value=="retry"){
					this.controller.serviceRequest('palm://com.palm.location', {
					method:"getCurrentPosition",
				    parameters:{accuracy:1, maximumAge: 0, responseTime: 1},
					onSuccess: this.successLocation.bind(this),
				    onFailure: this.failedLocation.bind(this)
				    }
				); 
			}
			if(value=="cancel"){
                this.controller.get('spinner').mojo.stop();
				this.controller.get('gps-message').innerHTML = msg;
				
			}
		}.bind(this),
		title: $L("GPS Error"),
		message: $L(msg),
		allowHTMLMessage: true,
		choices:[
			{label:$L('Try Again'), value:"retry", type:'primary'},
			{label:$L('Cancel!'), value:"cancel", type:'primary'}
		]
	});

	Mojo.Log.info('Failed to get location: ' + event.errorCode);
	
	gpsDone=false;

}

MainAssistant.prototype.getLocation = function(event){
	this.gettingGPS=true;
	this.controller.get("gps-message").update("Finding your location...");

	this.controller.serviceRequest('palm://com.palm.location', {
		method:"getCurrentPosition",
		parameters:{accuracy:1, maximumAge: 0, responseTime: 1},
		onSuccess: this.successLocation.bind(this),
		onFailure: this.failedLocation.bind(this)
	}
	); 
}


function googleMapsLoaded(){
	//--> Google Maps callback function, set var to True
	Mojo.Log.info("Google Maps API Loaded");
	Maps.APILoaded = true;
}
