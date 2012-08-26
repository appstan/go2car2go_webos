function GPS(obj) {
	this.location=obj;
	this.going=false;
    this.ServiceRequest = new ServiceRequestWrapper();
}

GPS.prototype.go = function() {
	var meth="getCurrentPosition";
	var params={accuracy: 1, maximumAge:0, responseTime: 1};
	Mojo.Log.info("starting gps (normal)...");
	
	this.request = new Mojo.Service.Request("palm://com.palm.location", {
	    method: meth,
	    parameters: params,
    	onSuccess: function(response) {
    		Mojo.Log.info("got gps response...");
	    	if (response.errorCode==0) {
	    		Mojo.Log.info("gps success");
	    		this.going=true;
	        	this.location.set(response);
	     	}else if(response.errorCode>0){
		    	Mojo.Log.info("gps failure");
	    		this.going=false;
	      		this.location.oops(response.errorCode);	     	
	     	}
	    }.bind(this),
    	onFailure: function(response) {
	    	Mojo.Log.info("gps failure");
    		this.going=false;
      		this.location.oops(response.errorCode);
    	}.bind(this)
  	});
};

GPS.prototype.stop = function() {
	this.going=false;
	Mojo.Log.info("got request to stop() GPS");
	if(this.request!=undefined){
		Mojo.Log.info("canceling");
		this.request.cancel();
		window.setTimeout(function(){Mojo.Log.info("deleting");delete this.request;}.bind(this),600);
	}
};

function Location(callback,onfail) {
	this.callback=callback;
	this.onfail=onfail;
	this.GPS=new GPS(this);
	Mojo.Log.info("created location");
}

Location.prototype.set = function(resp) {
	Mojo.Log.info("setting...");
	if(((this.lat!=resp.latitude || this.long!=resp.longitude) && this.radius>resp.horizAccuracy) || !this.radius){  //new coords
		Mojo.Log.info("new coords");
		this.lat=resp.latitude;
		this.long=resp.longitude;
		this.radius=resp.horizAccuracy;
		this.alt=resp.altitude;
		this.vacc=resp.vertAccuracy;
		this.error=resp.errorCode;
		this.when=new Date().getTime();
		
		if(this.callback) {
			Mojo.Log.info("doing callback");
			this.callback({latitude:this.lat,
							longitude:this.long,
							horizAccuracy: this.radius,
							altitude: this.alt,
							vertAccuracy: this.vacc,
							errorCode: this.error
							});
		}
	}
};

Location.prototype.start = function() {
	if(!this.going){
	Mojo.Log.info("starting...");
		this.GPS.go();
	}
};

Location.prototype.restart = function() {
	this.GPS.stop();
	this.lat=undefined;
	this.long=undefined;
	this.radius=undefined;
	this.when=undefined;
	this.GPS.go();

};

Location.prototype.stop = function() {
		this.GPS.stop();
};

Location.prototype.oops = function(e) {
	Mojo.Log.info("oops");
	if(this.onfail){Mojo.Log.info("onfail");this.onfail(e);}
};

Location.prototype.get = function() {
	return {latitude:this.lat,
			longitude:this.long,
			horizAccuracy: this.radius,
			altitude: this.alt,
			vertAccuracy: this.vacc,
			errorCode: this.error
			};
};

Location.prototype.timePassed = function() {
	var now=(new Date().getTime());
	var diff=(now-this.when)/1000; //in seconds
	return (diff>=10);
};