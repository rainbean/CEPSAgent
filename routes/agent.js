/**
 * handle push notification
 */
function onNotify(json) {
	console.log(json);
}


/**
 * Initialize CEPS Agent  
 */
exports.init = function () {
	var helper = require("./helper");
	var push = require("./push");
	var network = require("./profile/network");

	// read configure
	helper.getConfig();
	//console.log (helper.config);
	
	// subscribe push channel
	push.subscribe(onNotify);
	
	// init network profile
	network.init();
};

