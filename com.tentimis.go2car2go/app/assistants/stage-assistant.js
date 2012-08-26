var gpsDone	 = false;
var _globals = {};

function StageAssistant() {
	//--> Global Data Structures
	Maps = {};

	//--> Map Info
	Maps.APILoaded						 = false;						//--> Has Google Maps Been Loaded yet?
	Maps.MainStageName					 = "MainStage";
	Maps.DashboardStageName				 = "DashboardStage"
	
	Cache = {};
	Cache.kVEHICLES_CACHE = "vehicles";
	Cache.kGAS_CACHE = "gas";
	Cache.kPARKING_CACHE = "parking";
	Cache.kLOCATIONS_CACHE = "locations";

	//--> GPS Info

}

StageAssistant.prototype.setup = function() {
	Mojo.Log.info("[StageAssistant.prototype.setup] called");
	Go2Car2Go = new Go2Car2GoController();
	//remove vehicles from cache to show up to date data
	this.clearCache(Cache.kVEHICLES_CACHE);
	this.clearCache(Cache.kGAS_CACHE);
	this.clearCache(Cache.kPARKING_CACHE);
	this.clearCache(Cache.kLOCATIONS_CACHE);
	
    this.controller.pushScene('main');
};


StageAssistant.prototype.cleanup = function(event) {
    Mojo.Controller.appController.closeAllStages();
};

StageAssistant.prototype.clearCache = function(cache) {
    var db = Go2Car2Go.getDB();
    db.discard(cache);
};
