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

/**
 * GET connection link with peer endpoint
 */
exports.link = function(req, res) {
	var helper = require("./helper");
	var session = require("./sessionprofile");

	session.init(req.params.EndpointID, function(err, result) {
		if (err) {
			console.log('Failed to connect to eid:' + req.params.EndpointID + ', error:' + err);
			return res.send(404);
		}
		return res.send(result);
	});
};