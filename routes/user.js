/*
 * GET device info.
 */
exports.info = function(req, res) {
	var helper = require("../helper");
	
	res.send(helper.config);
};

/*
 * GET device listing.
 */
exports.list = function(req, res) {
	var helper = require("../helper");
	
	// redirect to CMS server 
	res.redirect(helper.cmsaddr + '/User/' + helper.config.user.id);
};