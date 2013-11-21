/**
 * Get server info
 * 
 * @param onDone callback function to send event to when it's done 
 */
function serverInfo(onDone) {
	var http = require('http');
	var helper = require("../helper");
	
	var url = helper.cmsaddr + '/ServerInfo/';
	http.get(url, function(res) {
		switch (res.statusCode) {
		case 200:
			res.on('data', function(chunk) {
				helper.serverinfo = JSON.parse(chunk);
				//console.log(helper.serverinfo);
				onDone();
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
 * Detect whether network profile is established
 */
function isProfileReady() {
	// ToDo: implement later
	return false;
}

function isPublicIP(myIP) {
	var os = require('os');
	var ifaces = os.networkInterfaces();
	var isMatched = false;
	for (var x in ifaces) {
		ifaces[x].forEach(function(details) {
			if (details.family === 'IPv4' && details.address === myIP) {
				isMatched = true;
			}
		});
	}
	return isMatched;
}


/**
 * Detect whether endpoint is public accessible
 */
function isPublicAccessible(onDone) {
	var http = require('http');
	var helper = require("../helper");
	
	if (!isPublicIP(helper.serverinfo.requestor.IP)) {
		return false;
	}
	
	// ask server to check whether UDP is reachable
	// GET /v1/Message/{SocketType}?Nonce={Nonce}&SrcPort={SrcPort}&DestIP={DestIP}&DestPort={DestPort}&Count={Count}
	var url = [
		helper.cmsaddr + '/Message/UDP?Nonce=' + 'rose',
		'SrcPort=' + helper.serverinfo.cms[0].Port[0],
		'DestIP=' + helper.serverinfo.requestor.IP,
		'DestPort=' + helper.config.endpoint.port,
		'Count=10'
	].join('&');
	http.get(url).on('error', function(e) {
		console.log("Got server info error: " + e.message);
	});
}

/**
 * Init network profile
 * 
 * @param onDone callback function to send event to when it's done 
 */
exports.init = function (onDone) {
	serverInfo(function() {
		// check whether need to create network profile
		if (isProfileReady()) {
			return onDone();
		}
		
		// start to negociate network profile
		// check whether it's public ip
		isPublicAccessible(onDone); 
	});
};
