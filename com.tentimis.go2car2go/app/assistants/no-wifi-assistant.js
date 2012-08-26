NoWifiAssistant = Class.create({
	initialize: function(wifiState){
		this.wifiState = wifiState;
	},
	
	setup:function() {
		$('show_help').observe(Mojo.Event.tap, this.showHelp.bind(this));
	},
	
	activate: function() {
		AppAssistant.prototype.doneLaunch();
		AppAssistant.prototype.showConnectionWidget(this.wifiState);
	},
	
	showHelp: function() {
		this.controller.serviceRequest("palm://com.palm.applicationManager", {
			method: "open",
		  	parameters:  {
		    	id: 'com.palm.app.help',
		      	params: {target: "no-network"}
			}
		});
	},

});
