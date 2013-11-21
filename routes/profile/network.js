/**
 * Get server info
 */
function serverInfo() {
	var http = require('http');
	var helper = require("../helper");
	
	var url = helper.cmsaddr + '/ServerInfo/';
	http.get(url, function(res) {
		switch (res.statusCode) {
		case 200:
			res.on('data', function(chunk) {
				helper.serverinfo = JSON.parse(chunk);
				//console.log(helper.serverinfo);
			});
			break;
		default:
			console.log('Got server info error: ' + res.statusCode);
			break;
		}
	}).on('error', function(e) {
		console.log("Got server info error: " + e.message);
	});
}

/**
 * Init network profile
 */
exports.init = function () {
	serverInfo();
};
