/**
 * GET device info.
 */
exports.info = function(req, res) {
	var helper = require("./helper");
	
	res.send(helper.config);
};

/**
 * GET device listing.
 */
exports.list = function(req, res) {
	var helper = require("./helper");
	
	// option1: redirect to CMS server, cross-domain AJAX request
	// HTTP header Access-Control-Allow-Origin is required 
	res.redirect('http://' + helper.config.server.address + helper.config.server.cms + '/User/' + helper.config.user.id);
	
	// option2: todo implement later, fetch in separate HTTP
};

