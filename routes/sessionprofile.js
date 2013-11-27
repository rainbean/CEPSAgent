






/**
 * Init connection
 * 
 * @param eid peer endpoint id to connect to
 * @param callback error and/or result 
 */
exports.init = function (eid, onDone) {
	var async = require('async');

	// ToDo: replace placeholder code
	async.series([
		function(callback) {
			// do some stuff ...
			callback(null, 'one');
		},
		function(callback) {
			// do some more stuff ...
			callback(null, 'two');
		}
	],
	//optional callback
	function(err, results) {
		// results is now equal to ['one', 'two']
		console.log(results);
		onDone(null, results);
	});
};
