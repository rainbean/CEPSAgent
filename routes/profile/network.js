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
 * Detect whether hole punching is feasible
 */
function getExtPortAsync() {
	// Get external port
	var dgram = require('dgram');
	var helper = require('../helper');
	var constant = require('../constants');
	
	var msg = new Buffer(constant.LEN_REQ_GET_EXT_PORT);
	
	msg.fill(0x00); // clear with zero 
	msg.writeUInt32BE(constant.CEPS_MAGIC_CODE, 0);  // magic code
	msg.writeUInt8(1, 4); // version
	msg.writeUInt16BE(constant.REQ_GET_EXT_PORT, 5); // msg type
	msg.writeUInt16BE(16, 7); // msg length: 16 bytes (end point)
	var nonce = helper.createGUID();
	var nonceBytes = helper.toBytes(nonce);
	nonceBytes.copy(msg, 9);
	var eidBytes = helper.toBytes(helper.config.endpoint.id);
	eidBytes.copy(msg, constant.LEN_MIN_CEPS_MSG); // end point GUID

	console.log(msg);
	
	console.log('send udp message');
	var client = dgram.createSocket("udp4");
	client.bind(helper.config.endpoint.port, function() {
		client.send(msg, 0, msg.length, 
				helper.serverinfo.cms[0].Port[0], 
				helper.serverinfo.cms[0].Host, function(err, bytes) {
			client.close();
			console.log('out udp message: err = ' + err + ', bytes = ' +  bytes);
		});
	});
	
	// wait for state machine in onPush()
}


/**
 * Detect whether hole punching is feasible
 */
function isHolePunchAccessible(onDone) {
	// Get external port
	getExtPortAsync();
	
	// wait for state machine in onPush()
}

/**
 * Detect whether UPnP is feasible
 */
function isUPnPAccessible(onDone) {
	// ToDo: implement later, always failed now
	return isHolePunchAccessible(onDone);

}


/**
 * Detect whether endpoint is public accessible
 */
function isPublicAccessible(onDone) {
	var http = require('http');
	var helper = require("../helper");
	
	if (!isPublicIP(helper.serverinfo.requestor.IP)) {
		// not public IP, go next check
		return isUPnPAccessible(onDone);
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
	
	// ToDo: do async check in onUDP() to invoke onDone 

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
