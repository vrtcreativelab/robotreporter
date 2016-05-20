var express = require('express');
var path = require('path');
var app = express();
app.use(express.static(path.join(__dirname, 'public')));
var scraper = require('./scraper.js');
var http = require('http').Server(app);
var io = require('socket.io')(http);


//* Database stuff *//
var mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/fbscrape');
var db = mongoose.connection;




db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
	


});




var commentSchema = new mongoose.Schema({
	created_time : String,
	from : {
		id : String,
		name : String
	},
	id : String,
	message : String,
	visible : { type : Boolean, default : true},
	selected : {type : Boolean, default : false}
});

var reactionSchema = new mongoose.Schema({
	id : String,
	name : String,
	type : String,
	scrapeId : String
});


var Comment = mongoose.model('comment', commentSchema);
var Reaction = mongoose.model('reaction', reactionSchema);

var scrapeSchema = new mongoose.Schema({
	date: { type: Date, default: Date.now },
	page : {
		name : String,
		id : String,
		picture : {
			data : {
				url : String,
				is_silhouette : false
			}
		}
	},
	post : {
		id : String,
		live_status : String,
		description : String
	},
	comments : [{type: mongoose.Schema.Types.Mixed, ref: 'Comment'}],
	reactions : [{type: mongoose.Schema.Types.Mixed, ref: 'Reaction'}],
	reaction : { type : String, default : ''},
	commands : {type : Object, default : ''},
	live : { type: Boolean, default: true }
});

var Scrape = mongoose.model('scrape', scrapeSchema);

exports.Comment = Comment;
exports.Reaction = Reaction;
exports.Scrape = Scrape;
exports.mongoose = mongoose;
exports.db = db;




http.listen(3000, function(){
  console.log('listening on *:3000');
});

app.get('/', function(req, res){
  		res.sendFile(__dirname + '/index.html');
});

app.get('/api/live', function(req, res){
//  res.send(scraper.arduinoOutput());

	Scrape.findOne({live : true}, function(err, scrapes){
		res.send(scrapes);
	});
});

app.get('/api/live/reaction', function(req, res){
//  res.send(scraper.arduinoOutput());

	Scrape.findOne({live : true}, function(err, scrapes){
		res.send(scrapes.reaction);
	});
});

app.get('/api/live/arduino', function(req, res){
//  res.send(scraper.arduinoOutput());

	Scrape.findOne({live : true}, function(err, scrapes){
		res.send(scrapes.reaction + "|" + getVotedValue(scrapes.commands.directions));
	});
});


app.get('/api/live/commands/:command*', function(req, res){
//  res.send(scraper.arduinoOutput());

	Scrape.findOne({live : true}, function(err, scrapes){
		res.send(scrapes.commands[req.params.command]);
	});
});

app.get('/api/scrapes/', function(req, res){
	Scrape.find({}, {'_id': true, 'date' : true, 'page' : true, 'post':  true, 'commands' : true, 'reaction' : true}, function(err, ids) {
	    res.send(ids);
	});
});

app.get('/api/:id*/', function(req, res){
		Scrape.find({_id : req.params.id}, function(err, scrapes){
		res.send(scrapes);
	});
});


function getVotedValue(obj){ //Haalt de meestgekozen key uit een set van keys, bvb 'LIKE' of 'LEFT'
	var max = 0;
	var winner = "";
	for(key in obj){
		if(obj[key] > max){
			winner = key; max = obj[key];
		} 
	}
	return winner;
}


io.on('connection', function(socket){
  exports.socket = socket;
  socket.on('pageLink', function(pageLink){
  	scraper.newStream(pageLink); 
  });
  socket.on('stopStream', function(pageLink){
  	scraper.stopStream(); 
  });
	Scrape.find({live : true}, function(err, scrapes){
	    if(scrapes.length > 0){
  	    	socket.emit('pageLoaded', scrapes[0].page);
  	    	socket.emit('postLoaded', scrapes[0].post);
  	    	socket.emit('commentsLoaded', scrapes[0].comments);
  			scraper.loadStream(scrapes[0]); 
	    }
	});	
});


//scraper.test();