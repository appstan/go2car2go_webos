
function Go2Car2GoController() {

	// Constants
	this.CONSUMER_KEY = "YOUR_CONSUMER_KEY";
	this.CONSUMER_SECRET = "YOUR_CONSUMER_SECRET";
	this.HOST = "http://www.car2go.com/api/v2.1";
	this.SECURED_HOST = "https://www.car2go.com/api";

	this.REQUEST_TOKEN_URL = this.SECURED_HOST + "/reqtoken";
	this.AUTHORIZE_URL = this.SECURED_HOST + "/authorize";
	this.ACCESS_TOKEN_URL = this.SECURED_HOST + "/accesstoken";
	this.ACCOUNT_URL = this.SECURED_HOST + "/v2.1/accounts?format=json";
	this.BOOKINGS_URL = this.SECURED_HOST + "/v2.1/bookings?format=json";
	this.BOOKING_URL = this.SECURED_HOST + "/v2.1/booking?format=json";
	this.CALLBACK = "foo";

	this.VEHICLES_URL = this.HOST + "/vehicles?format=json";
	this.PARKING_URL = this.HOST + "/parkingspots?format=json";
	this.GAS_URL = this.HOST + "/gasstations?format=json";
	this.LOCATIONS_URL = this.HOST + "/locations?format=json";

	this.kOAUTH_TOKEN = "oauthToken";
	this.kVEHICLES_CACHE = "vehicles";
	this.kGAS_CACHE = "gas";
	this.kPARKING_CACHE = "parking";
	
	this.kCAR2GO_ACCOUNT = "userAccount";
	this.kCAR2GOUSER_UNIT = "usedUnit";
	this.kCAR2GOUSER_LOCATION = "usedUnit";
	
	this.unit = "km";
	this.oauth_token = "";

	this.ready = false;
	this.requireLogin = true;
	this.onReady = null;
	this.useMiles = false;
    
	this.listAccounts = [];

    this._account = null;
	this.accountId = "";


	this.getDB();
	this._init();

}

Go2Car2GoController.prototype._init = function() {
	this._db.simpleGet(this.kCAR2GOUSER_LOCATION, this._dbGotLocation.bind(this), this._dbFailure.bind(this));
	this._db.simpleGet(this.kCAR2GOUSER_UNIT, this._dbGotUnit.bind(this), this._dbFailure.bind(this));	
	this._db.simpleGet(this.kOAUTH_TOKEN, this._dbGotOAuthToken.bind(this), this._dbFailure.bind(this));
};

Go2Car2GoController.prototype._dbSuccess = function() {
	Mojo.Log.info("Go2Car2Go DB operation success");
};

Go2Car2GoController.prototype._dbFailure = function(transaction, result) {
	Mojo.Log.info("Go2Car2Go DB operation failure: " + result);
};


Go2Car2GoController.prototype._dbGotAcount = function(response) {
	var recordSize = Object.values(response).size();
	// Catch a bad state
	if (recordSize > 0 && response.accountId && response.userName) {
		Mojo.Log.info("Found some account data %j", response);
		this.accountId = response.accountId;
		this.userName = response.userName;

		this._account = {
				accountId: response.accountId,
				userName: response.userName
				};
	} 
	else {
		Mojo.Log.info("Found no account data. requesting ...");
		this._account = {};
		this.lookupAccount();
	}
};

Go2Car2GoController.prototype._dbGotUnit = function(response) {
	var recordSize = Object.values(response).size();
	// Catch a bad state
	if (recordSize > 0 && response.unitName) {
		this.unit = response.unitName;

		if (this.unit == 'km'){
			this.useMiles = false;
		} else {
			this.useMiles = true;
		}

		Mojo.Log.info("Used unit %j", response.unitName);
	} 
	else {
		// this occurs at the very first time
		Mojo.Log.info("No unit info was saved");
		var region = Mojo.Locale.getCurrentFormatRegion().toLowerCase();
		if (['us', 'gb'].include(region)) {
			this.unit = "miles";
			this.useMiles = true;
		} else {
			this.unit = "km";
			this.useMiles = false;
		}
		
		this._db.simpleAdd(this.kCAR2GOUSER_UNIT, { unitName: this.unit },
				function() {},
				function(error) {
					Mojo.Log.error("Failed to unit name to local cache");
				});
	}
};

Go2Car2GoController.prototype._dbGotLocation = function(response) {
	var recordSize = Object.values(response).size();
	// Catch a bad state
	if (recordSize > 0 && response.locationName) {
		this.location = response.locationName;
		
		Mojo.Log.info("Used location %j", response.locationName);
	} 
	else {
		// this occurs at the very first time
		Mojo.Log.info("No location info found");
		//this.getLocations(); ToDo
		var region = Mojo.Locale.getCurrentFormatRegion().toLowerCase();
		if (['us'].include(region)) {
			this.location = "austin";
		} 
		else if (['de'].include(region)){
			this.location = "ulm";
		}
		else if (['nl'].include(region)){
			this.location = "amsterdam";
		}
		else if (['ca'].include(region)){
			this.location = "vancouver";
		}
		else {
			this.location = "ulm";
		}
		
		Mojo.Log.info("location set to %s", this.location);
		
		this._db.simpleAdd(this.kCAR2GOUSER_LOCATION, { locationName: this.location },
						   function() {},
						   function(error) {
						   Mojo.Log.error("Failed to unit name to local cache");
						   });
		
		this.getLocations();
	}
};

Go2Car2GoController.prototype._dbGotOAuthToken = function(response) {
	var recordSize = Object.values(response).size();
	// Catch a bad state
	if (recordSize > 0 && response.token && response.secret) {

		this._oauth = new $OAuth();
		this._oauth.setToken({
			token: response.token,
			secret: response.secret
		});

		this.requireLogin = false;

		Mojo.Log.info("Authentication was done. Following token: " + response.token + "and secret :" + response.secret + " found");

		this._db.simpleGet(this.kCAR2GO_ACCOUNT, this._dbGotAcount.bind(this), this._dbFailure.bind(this));

	} else {

		Mojo.Log.info("No OAuth token found. Require login");
		this.clearCache(this.kOAUTH_TOKEN);

	}
};

Go2Car2GoController.prototype._serviceFailure = function(result) {
	Mojo.Log.info("Service Failed:");
	Mojo.Log.info(result);
};


Go2Car2GoController.prototype.getDB = function() {
	if (!this._db) {
		this._db = new Mojo.Depot({
			name: "car2go",
			version: 1,
			replace: false
		},
		this._dbSuccess, this._dbFailure);
	}
	return this._db;
};

Go2Car2GoController.prototype.clearCache = function(cache) {
	if(this._db){
		this._db.discard(cache);
	}
};

/**
 * Generic handler for successful requests
 * @param transport The object returns from HTTP request
 * @method _requestSuccess
 * @private
 */
Go2Car2GoController.prototype._requestSuccess = function(transport) {
	Mojo.Log.info("Request Succeed");
};

Go2Car2GoController.prototype._requestFailure = function(transport) {
	/*
	 * Use the Prototype template object to generate a string from the return status.
	 */
	var t = new Template($L("Error"));
	var m = t.evaluate(transport);
	Mojo.Log.error("Request Failed: " + Object.toJSON(transport.status) + Object.toJSON(transport.getAllResponseHeaders().toLowerCase()));

};


/**
 * Destroys the session and logs the user out
 * @method logout
 */
Go2Car2GoController.prototype.logout = function() {
	//this._db.simpleAdd(this.kOAUTH_TOKEN, null, this.onLogout.bind(this));
	this.clearCache(this.kOAUTH_TOKEN);
        this.clearCache(this.kCAR2GO_ACCOUNT);
	this.requireLogin = true;
};


Go2Car2GoController.prototype.createBooking = function(vin) {
	var vehicleNumber = vin || "";
	var account = this.accountId || this._account.accountId; 

	Mojo.Log.info("Trying to book " + vehicleNumber + " using account " + account);
	
	var url = this.BOOKINGS_URL + "&vin=" + vehicleNumber + "&account=" + account+ "&loc=" + this.location;
	//get token and secret
	var token = this._oauth.getToken();

	var args = {};
	var message = {
			method: 'POST',
			action: url,
			parameters: []
	};
	var params = '';

	OAuth.completeRequest(message, {
		consumerKey: this.CONSUMER_KEY,
		consumerSecret: this.CONSUMER_SECRET,
		token: token.key,
		tokenSecret: token.secret
	});

	var authHeader = OAuth.getAuthorizationHeader( url, message.parameters);

	var req = new Ajax.Request(url, {
		method: 'POST',
		requestHeaders: {
			'Authorization': authHeader,
			'Accept': 'application/json'
		},
		onSuccess: function(response) {
			Mojo.Log.info("Success:" + Object.toJSON(response));
			if (response.status == "200") {
		        Mojo.Log.info("Booking details: " + Object.toJSON(transport.status) + Object.toJSON(transport.getAllResponseHeaders().toLowerCase()));

				Mojo.Log.info(Object.toJSON(response));
				if (this.onBookingDone) {
					this.onBookingDone();
				}
			}
		}.bind(this),
		onFailure: function(response) {
	        Mojo.Log.error("Failure: " + Object.toJSON(transport.status) + Object.toJSON(transport.getAllResponseHeaders().toLowerCase()));
			if (response.status == "401") {
				this._requestFailure(response);
			}
		}.bind(this)
	});		

};

Go2Car2GoController.prototype.getBookings = function() {	

	var url = this.BOOKINGS_URL + "&loc=" + this.location;
	//get token and secret
	var token = this._oauth.getToken() || this.oauth_token;

	var args = {};
	var message = {
			method: 'GET',
			action: url,
			parameters: []
	};
	var params = '';

	OAuth.completeRequest(message, {
		consumerKey: this.CONSUMER_KEY,
		consumerSecret: this.CONSUMER_SECRET,
		token: token.key,
		tokenSecret: token.secret
	});

	var authHeader = OAuth.getAuthorizationHeader( url, message.parameters);

	var req = new Ajax.Request(url, {
		method: 'GET',
		requestHeaders: {
			Authorization: authHeader
		},
		parameters: params,
		onSuccess: function(response) {
			if (response.status == "200") {
				if (this.onGetBookings) {
					this.onGetBookings(response.responseJSON);
				}
			}
		}.bind(this),
		onFailure: function(response) {
			if (response.status == "401") {
				this._requestFailure(response);
				this.logout();
			}
		}.bind(this)
	});		

};

Go2Car2GoController.prototype.lookupAccount = function() {	
   Mojo.Log.info("We need account. Reguesting it...");
	var url = this.ACCOUNT_URL + "&loc=" + this.location;
	var token = this._oauth.getToken()|| this.oauth_token;

	var args = {};
	var message = {
			method: 'GET',
			action: url,
			parameters: []
	};
	var params = '';

	OAuth.completeRequest(message, {
		consumerKey: this.CONSUMER_KEY,
		consumerSecret: this.CONSUMER_SECRET,
		token: token.key,
		tokenSecret: token.secret
	});

	var authHeader = OAuth.getAuthorizationHeader( url, message.parameters);

	var req = new Ajax.Request(url, {
		method: 'GET',
		requestHeaders: {
			Authorization: authHeader
		},
		parameters: params,
		onSuccess: function(response) {
		   Mojo.Log.info("Request account response %j", response);

			if (response.status == "200") {
			   Mojo.Log.info("Request account respond OK.");
			   Mojo.Log.info("response %s", Object.toJSON(response));
			   var json = response.responseJSON;
			   Mojo.Log.info("response %s", json);

				if (json) {
					// go through all accounts
					for (i=0; i<json.account.length; i++){					
						this.accountId = json.account[i].accountId;
						this.userName = json.account[i].description;
						Mojo.Log.info("We got account number: %i",this.accountId);
					}
					// Save for later use
			        this._db.simpleAdd(this.kCAR2GO_ACCOUNT, 
						        {
			        				accountId: this.accountId,	
			        				userName: this.userName
						        },
			        function() {
			            },
			        function(error) {
			            Mojo.Log.error("Failed to save account number to local cache");
			        });
			    }
			}
		}.bind(this),
		onFailure: function(response) {
			Mojo.Log.info("No account data receivec. %j", response);
			if (response.status == "401") {
				this._requestFailure(response);
				//this.logout();
			}
		}.bind(this)
	});		

};

/**
 * Gets the available car2go vehicles
 * @method getVehicles
 */
Go2Car2GoController.prototype.requestLocations = function(options) {
	options = options || {};
	var locationsRequestUrl = this.LOCATIONS_URL + "&oauth_consumer_key=" + this.CONSUMER_KEY;
	Mojo.Log.info("locationsRequestUrl = %s", locationsRequestUrl);
	this.request(locationsRequestUrl, options);
};

/**
 * Gets the available car2go vehicles
 * @method getVehicles
 */
Go2Car2GoController.prototype.getVehicles = function(options) {
	options = options || {};
	var vehiclesRequestUrl = this.VEHICLES_URL + "&oauth_consumer_key=" + this.CONSUMER_KEY + "&loc=" + this.location;
	Mojo.Log.info("vehiclesRequestUrl = %s", vehiclesRequestUrl);
	this.request(vehiclesRequestUrl, options);
};


/**
 * Gets the available gas stations
 * @method getGasstations
 */
Go2Car2GoController.prototype.getGasstations = function(options) {
	options = options || {};
	var gasstationsRequestUrl = this.GAS_URL + "&oauth_consumer_key=" + this.CONSUMER_KEY + "&loc=" + this.location;

	this.request(gasstationsRequestUrl, options);
};

/**
 * Gets the available parkings
 * @method getParkings
 */
Go2Car2GoController.prototype.getParkings = function(options) {
	options = options || {};
	var parkingsRequestUrl = this.PARKING_URL + "&oauth_consumer_key=" + this.CONSUMER_KEY + "&loc=" + this.location;

	this.request(parkingsRequestUrl, options);
};

Go2Car2GoController.prototype.request = function (url, params) {
	this.action = url;
	this.method = params.method || "GET";
	var myAjax = new Ajax.Request(this.action, {
		method: this.method,
		evalJSON: 'true',
		onComplete: params.onComplete,
		onFailure: params.onFailure
	});
};

/**
 * Creates an app menu. This is here so that every assistant can just call it in their setup methods
 * @param Assistant assistant Just always pass 'this'
 * @method initAppMenu 
 */
Go2Car2GoController.prototype.initAppMenu = function(assistant, opt_params) {
	opt_params = opt_params || {};

	var appMenuModel = {
			visible: true,
			items: [
			        Mojo.Menu.editItem,
					{
						label: 'Preferences',
						command: 'preferences'
					}
			        ]
	};
	// Enable logout if already logged in
	if (!this.requireLogin) {

		appMenuModel.items = appMenuModel.items.concat(
				[ {
					label : "Sign Out",
					command : 'logout'
				} ]
		);
	}

	assistant.controller.setupWidget(Mojo.Menu.appMenu, {omitDefaultItems: true}, appMenuModel);
};

Go2Car2GoController.prototype.clearCache = function(cache) {
	var db = this.getDB();
	db.discard(cache);
};

Go2Car2GoController.prototype.currentLocationUpdate = function(location){
	if(this.onCurrentLocationUpdate){
		this.onCurrentLocationUpdate(location);
	}
};

Go2Car2GoController.prototype.mapRouteCall = function(params) {
	new Mojo.Service.Request('palm://com.palm.applicationManager', {
		method: 'open',
		parameters: {
			id: "com.palm.app.maps",
			params: {
				query: params.address,
	  			daddr: params.latitude + "," + params.longitude
			}
		}
	});
};

// Help methods
Go2Car2GoController.prototype.distance = function(lat1, lon1, lat2, lon2){
	// Get numeric values.
	var lat_1 = lat1;
	var lat_2 = lat2;
	var lon_1 = lon1;
	var lon_2 = lon2;
	
	
 	// Compute spherical coordinates
	if(this.useMiles){
		var rho = 3960.0; // earth diameter in miles
	} else {
		var rho = 6371.0; // earth diameter in km
	}

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
	
};

Go2Car2GoController.prototype.formatOutput = function(num){
	if (num < 1) 
		return num.toFixed(2);
	else 
		return num.toFixed(1);
};

/**
* Function to get locations from car2go server
* @method getLocations
*/
Go2Car2GoController.prototype.getLocations = function() {
	this.requestLocations({
        onComplete: this._gotCar2goLocations.bind(this),
        onFailure: this._requestFailure.bind(this)
    });
};

/**
* This is the callback we use after we get responce from car2go server
* @params transport - The transport object return by the AJAX request
* @private
* @method _gotCar2goLocations
*/
Go2Car2GoController.prototype._gotCar2goLocations = function(transport) {

    var responseInJson = transport.responseJSON;
    var db = Go2Car2Go.getDB();

    if (responseInJson) {
        db.simpleAdd(this.kLOCATIONS_CACHE, Object.toJSON(responseInJson),
        function() {
            },
        function(error) {
            Mojo.Log.error("Failed to save locations to local cache");
        });
    }

    this.loadLocations(responsInJson);
};


Go2Car2GoController.prototype.loadLocations = function(locations) {
	
};
