/**
 * 	@author Temirlan Tentimishov
 */
function LoginAssistant() {
	
	this.url = '';
	this.message    = null;
	this.accessor   = null;
	this.authHeader = null;
	this.method     = null;
	this.oauth_verifier = null;
	this.requested_token = '';
	this.requestTokenMethod = 'GET';
	this.accessTokenMethod  = 'POST';
	this.exchangingToken    = false;
	this.callbackScene = 'bookings';

};

LoginAssistant.prototype.setup=function() {
	this.initialize();
};

LoginAssistant.prototype.initialize = function() {

	// setup web viewer for car2go login page
	this.controller.setupWidget('browser',
		this.attributes = {
			minFontSize:12,
			virtualpagewidth: 40 
		},
		this.authViewModel = {}
	);
	
	// progress indicator
	this.reloadModel = {
			icon: 'refresh',
			command: 'refresh'
	};
	this.stopModel = {
			icon: 'load-progress',
			command: 'stop'
	};
	this.cmdMenuModel = {
			visible: true,
	items: [
			{items: [
					 {label: $L('Back'), icon:'back', command:'back'}
					 ]
			}, this.reloadModel]
	};
	this.controller.setupWidget(Mojo.Menu.commandMenu, {menuClass:'no-fade'}, this.cmdMenuModel);
	
	// setup back command
	
	

	Mojo.Event.listen(this.controller.get('browser'),Mojo.Event.webViewTitleUrlChanged, this.titleChanged.bind(this));
	Mojo.Event.listen(this.controller.get('browser'),Mojo.Event.webViewLoadProgress, this.loadProgress.bind(this));
	Mojo.Event.listen(this.controller.get('browser'),Mojo.Event.webViewLoadStarted, this.loadStarted.bind(this));
	Mojo.Event.listen(this.controller.get('browser'),Mojo.Event.webViewLoadStopped, this.loadStopped.bind(this));
	Mojo.Event.listen(this.controller.get('browser'),Mojo.Event.webViewLoadFailed, this.loadStopped.bind(this));

   //Init authentication & authorization
	this.requestToken();

};

LoginAssistant.prototype.titleChanged = function(event) {
	var callbackUrl = event.url;
	Mojo.Log.info("[titleChanged] called : %s", callbackUrl);

	var responseVars = callbackUrl.split("?");
	if(responseVars[0]== Go2Car2Go.SECURED_HOST +'/' || responseVars[0]== Go2Car2Go.SECURED_HOST){
		this.controller.get('browser').hide();
		var response_param=responseVars[1];
		var result=response_param.match(/oauth_token=*/g);

		if(result!=null){
			var params = response_param.split("&");
			var token = params[0].replace("oauth_token=","");
			this.oauth_verifier = params[1].replace("oauth_verifier=","");
			this.controller.setInitialFocusedElement('itUsername');
//			Mojo.Log.info("oauth_token:" + token + "oauth_verifier:" + verifier);
			this.exchangeToken( token );
		}
	}

};

LoginAssistant.prototype.openWebView = function(oauthBrowserParams) {
	Mojo.Log.info("[openWebView] called with %s", oauthBrowserParams);
	this.controller.get('browser').mojo.openURL(oauthBrowserParams);
};

LoginAssistant.prototype.handleCommand = function(event) {
	if (event.type == Mojo.Event.back){
		event.stop();
	}

	if (event.type == Mojo.Event.command) {
		switch (event.command) {
		case 'refresh':
			this.controller.get('browser').mojo.reloadPage();
			break;
		case 'stop':
			this.controller.get('browser').mojo.stopLoad();
			break;
		case 'back':
			Mojo.Controller.stageController.pushScene("vehicles");
			break;
		}
	}
};

LoginAssistant.prototype.loadStarted = function(event) {
	this.cmdMenuModel.items.pop(this.reloadModel);
	this.cmdMenuModel.items.push(this.stopModel);
	this.controller.modelChanged(this.cmdMenuModel);
	this.currLoadProgressImage = 0;
};
//loadStopped - switch command button to reload icon & command
LoginAssistant.prototype.loadStopped = function(event) {
	this.cmdMenuModel.items.pop(this.stopModel);
	this.cmdMenuModel.items.push(this.reloadModel);
	this.controller.modelChanged(this.cmdMenuModel);
};
//loadProgress - check for completion, then update progress
LoginAssistant.prototype.loadProgress = function(event) {
	var percent = event.progress;
	try {
		if (percent > 100) {
			percent = 100;
		}
		else if (percent < 0) {
			percent = 0;
		}
		// Update the percentage complete
		this.currLoadProgressPercentage = percent;
		// Convert the percentage complete to an image number
		// Image must be from 0 to 23 (24 images available)
		var image = Math.round(percent / 4.1);
		if (image > 23) {
			image = 23;
		}
		// Ignore this update if the percentage is lower than where we're showing
		if (image < this.currLoadProgressImage) {
			return;
		}
		// Has the progress changed?
		if (this.currLoadProgressImage != image) {
			// Cancel the existing animator if there is one
			if (this.loadProgressAnimator) {
				this.loadProgressAnimator.cancel();
				delete this.loadProgressAnimator;
			}
			// Animate from the current value to the new value
			var icon = this.controller.select('div.load-progress')[0];
			if (icon) {
				this.loadProgressAnimator = Mojo.Animation.animateValue(Mojo.Animation.queueForElement(icon),
						"linear", this._updateLoadProgress.bind(this), {
					from: this.currLoadProgressImage,
					to: image,
					duration: 0.5
				});
			}
		}
	}
	catch (e) {
		Mojo.Log.logException(e, e.description);
	}
};

LoginAssistant.prototype._updateLoadProgress = function(image) {
	// Find the progress image
	image = Math.round(image);
	// Don't do anything if the progress is already displayed
	if (this.currLoadProgressImage == image) {
		return;
	}
	var icon = this.controller.select('div.load-progress');
	if (icon && icon[0]) {
		icon[0].setStyle({'background-position': "0px -" + (image * 48) + "px"});
	}
	this.currLoadProgressImage = image;
};

LoginAssistant.prototype.cleanup = function(event) {
	Mojo.Event.stopListening(this.controller.get('browser'),Mojo.Event.webViewLoadProgress, this.loadProgress);
	Mojo.Event.stopListening(this.controller.get('browser'),Mojo.Event.webViewLoadStarted, this.loadStarted);
	Mojo.Event.stopListening(this.controller.get('browser'),Mojo.Event.webViewLoadStopped, this.loadStopped);
	Mojo.Event.stopListening(this.controller.get('browser'),Mojo.Event.webViewLoadFailed, this.loadStopped);
	Mojo.Event.stopListening(this.controller.get('browser'),Mojo.Event.webViewTitleUrlChanged, this.titleChanged);
};



LoginAssistant.prototype._gotOAuthToken = function(transport) {
    if (transport.status == "200") {
        var oauthParams = transport.responseText.toQueryParams();

        if (oauthParams['oauth_token'] && oauthParams['oauth_token_secret']) {
 
        	Mojo.Log.info("[_gotOAuthToken] called with token:" + oauthParams['oauth_token'] + " and secret:" + oauthParams['oauth_token_secret']);
			Go2Car2Go.oauth_token = oauthParams['oauth_token'];
        	var db = Go2Car2Go.getDB();
        	db.simpleAdd( "oauthToken",
        			{
        				token: oauthParams['oauth_token'],	
        				secret: oauthParams['oauth_token_secret']
        			},
        	        function() { 
        	        },
        	        function(error) {
        	        	Mojo.Log.error("Failed to save oauth_token and oauth_verifier to local cache");
        	        }
            );
        	Go2Car2Go._init();

            Go2Car2Go.requireLogin = false;
            
            return true;
        }
		Go2Car2Go.lookupAccount();
    }
    this._onLoginFailure();
    return false;
};

LoginAssistant.prototype._requestFailure = function(transport) {
    /*
	 * Use the Prototype template object to generate a string from the return status.
	 */
    var t = new Template($L("Error"));
    var m = t.evaluate(transport);
    Mojo.Log.error("Request Failed: " + Object.toJSON(transport.status) + Object.toJSON(transport.getAllResponseHeaders().toLowerCase()));

};

LoginAssistant.prototype.requestToken = function (){
	this.url = Go2Car2Go.REQUEST_TOKEN_URL;
	this.signHeader("oauth_callback=" + Go2Car2Go.CALLBACK);
	
	new Ajax.Request( this.url, {
	method: "GET",
	encoding: 'UTF-8',
	requestHeaders:['Authorization',this.authHeader],
	onComplete:function(transport){
            if (transport.status == "200") {
				var oauthParams = transport.responseText.toQueryParams();
				Mojo.Log.info("requestToken OK");

                if (oauthParams['oauth_token'] && oauthParams['oauth_token_secret']) {
					Mojo.Log.info("oauth_token:" + oauthParams['oauth_token'] + "oauth_secret:" + oauthParams['oauth_token_secret']);

					var authUrl = Go2Car2Go.AUTHORIZE_URL + "?oauth_token=" + oauthParams['oauth_token'];
					this.requested_token = oauthParams['oauth_token'];
					this.token = this.requested_token;
					this.tokenSecret = oauthParams['oauth_token_secret'];
					this.openWebView(authUrl);
				}

			}
	}.bind(this),
    onFailure: function(transport) {
        Mojo.Log.error("Could not log in: " + Object.toJSON(transport.status) + Object.toJSON(transport.getAllResponseHeaders().toLowerCase()));
    }.bind(this)
	});
};

LoginAssistant.prototype.exchangeToken = function (token){
	this.exchangingToken=true;
	this.url = Go2Car2Go.ACCESS_TOKEN_URL;
	this.token = token;
	this.method = this.accessTokenMethod;
	this.signHeader("oauth_verifier=" + this.oauth_verifier);
	
	new Ajax.Request(this.url,{
		method: this.method,
		encoding: 'UTF-8',
		requestHeaders:['Authorization', this.authHeader],
		onComplete:function(transport){
			this._gotOAuthToken(transport);
			this.controller.stageController.swapScene( this.callbackScene );
		}.bind(this)
	});
};

LoginAssistant.prototype.signHeader = function (params){
	if(params==undefined)
		params='';
	if(this.method==undefined)
		this.method='GET';
	var timestamp = OAuth.timestamp();
	var nonce = OAuth.nonce(11);
	this.accessor = {consumerSecret: Go2Car2Go.CONSUMER_SECRET, tokenSecret : this.tokenSecret};
	this.message = {method: this.method, action: this.url, parameters: OAuth.decodeForm(params)};
	this.message.parameters.push(['oauth_consumer_key', Go2Car2Go.CONSUMER_KEY]);
	this.message.parameters.push(['oauth_nonce',nonce]);
	this.message.parameters.push(['oauth_signature_method','HMAC-SHA1']);
	this.message.parameters.push(['oauth_timestamp',timestamp]);
	if(this.token!=null)
	this.message.parameters.push(['oauth_token',this.token]);
	this.message.parameters.push(['oauth_version','1.0']);
	this.message.parameters.sort()
	OAuth.SignatureMethod.sign(this.message, this.accessor);
	this.authHeader = OAuth.getAuthorizationHeader("", this.message.parameters);
	Mojo.Log.info("authHeader: %s", Object.toJSON(this.authHeader));
	return true;
};
