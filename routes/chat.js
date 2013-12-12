/**
 * UDP message handler
 * 
 * @param json Received UDP message in JSON 
 * @return true if message handled, false for next handler
 */
exports.onMessage = function(msg) {
	var helper = require("./helper");
	var constant = require("./constants");
	
	if (msg.Type === constant.DATA_MSG) {
		console.log ("Chat >> " + msg.Data);
		return true;
	}
	return false;
};