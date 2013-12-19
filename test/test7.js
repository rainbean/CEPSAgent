function first(callback) {
	console.log('first');
	if (true) {
		callback(null, 'one');
	} else {
		callback('error');
	}
}

function second(callback) {
	console.log('second');
	if (true) {
		callback();
	} else {
		callback('error');
	}
}

function third(callback) {
	console.log('third');
	if (false) {
		callback(null, 'three');
	} else {
		callback(200);
	}
}

function forth(callback) {
	console.log('forth');
	if (true) {
		callback(null, 'three');
	} else {
		callback('error');
	}
}

function async_template() {
	var async = require('async');

	// ToDo: replace placeholder code
	async.series([
		first, second, third, forth
	],
	//optional callback
	function(err, results) {
		// results is now equal to ['one', 'two']
		console.log(err);
		console.log(results);
	});
}

async_template();