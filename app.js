
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var network = require('./routes/profile/network');
var http = require('http');
var path = require('path');
var fs = require('fs');

var app = express();

// all environments
app.set('port', process.env.PORT || 8000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' === app.get('env')) {
	app.use(express.errorHandler());
}

// read configure
var config = require('./db/config.json');
if (typeof(config.endpoint) === 'undefined' || config.endpoint === null || 
	typeof(config.endpoint.id) === 'undefined' || config.endpoint.id === null ||
	config.endpoint.id.length !== 36) {
	config.endpoint = {id: network.createGUID()};
	fs.writeFile('./db/config.json', JSON.stringify(config));
}

// configure HTTP endpoint
app.get('/', routes.index);
app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function() {
	console.log('Express server listening on port ' + app.get('port'));
});