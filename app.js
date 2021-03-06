
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var agent = require('./routes/agent');
var http = require('http');
var path = require('path');
var fs = require('fs');
var log4js = require('log4js');

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
log4js.replaceConsole();

// development only
if ('development' === app.get('env')) {
	app.use(express.errorHandler());
}

// configure HTTP endpoint
//app.get('/', routes.index);
app.get('/info', user.info);
app.get('/list', user.list);
app.get('/link/:EndpointID', agent.link);
app.get('/talk/:Message', agent.talk);

// launch local HTTP server  
http.createServer(app).listen(app.get('port'), function() {
	console.log('Express server listening on port ' + app.get('port'));
});

//start CEPS Agent
agent.init();
