// ---------------------------------------------------------------
// GLOBALS
// ---------------------------------------------------------------
//--> Global Data Structures
Maps = {};

//--> Map Info
Maps.APILoaded						 = false;						//--> Has Google Maps Been Loaded yet?
Maps.APIKey							 = "";							//--> Your Google Maps API key (not needed really)
Maps.MainStageName					 = "MainStage";
Maps.DashboardStageName				 = "DashboardStage"

//--> GPS Info
var gpsDone								 = false;

var _globals = {};
// _globals.latitude = 48.38788;
// _globals.longitude = 10.00622;


function AppAssistant(appController){
}

AppAssistant.prototype.setup = function(){
}


AppAssistant.prototype.handleLaunch = function(launchParams){
	var cardStageController = this.controller.getStageController(Maps.MainStageName);
	var appController = Mojo.Controller.getAppController();

	if (!launchParams){
		//---------------------------------------------------------
		// FIRST LAUNCH
		//---------------------------------------------------------
		if (cardStageController) {
			Mojo.Log.error("handleLaunch A-A");
			// If it exists, just bring it to the front by focusing its window.
			cardStageController.popScenesTo("first");
			cardStageController.activate();
		}else{
			Mojo.Log.error("handleLaunch A-B");
			// Create a callback function to set up the new main stage once it is done loading. It is passed the new stage controller as the first parameter.
			var pushMainScene = function(stageController) {
				stageController.pushScene("first");
			}
			
			var stageArguments = {name: Maps.MainStageName, lightweight: false};
			this.controller.createStageWithCallback(stageArguments, pushMainScene.bind(this), "card");        
		}
	}else{
		if (launchParams.dockMode){
			launchParams.action = "dockMode";		//--> Launch the touchstone theme
		}
		
		switch (launchParams.action){			  
			
			//---------------------------------------------------------
			// DEFAULT LAUNCH
			//---------------------------------------------------------
			default:
				if (cardStageController){
					Mojo.Log.error("handleLaunch B-A");
					cardStageController.activate();
				}else{
					Mojo.Log.error("handleLaunch B-BZ");
					var pushMainScene = function(stageController) {
						stageController.pushScene("first");
					}
					var stageArguments = {name: Maps.MainStageName, lightweight: false};
					this.controller.createStageWithCallback(stageArguments, pushMainScene.bind(this), "card");        
				}
				break;
		}
	}
}
