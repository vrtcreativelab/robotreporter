/*
 __      _______ _______   ______ ____     _      _            _____                           
 \ \    / /  __ \__   __| |  ____|  _ \   | |    (_)          / ____|                          
  \ \  / /| |__) | | |    | |__  | |_) |  | |     ___   _____| (___   ___ _ __ __ _ _ __   ___ 
   \ \/ / |  _  /  | |    |  __| |  _ <   | |    | \ \ / / _ \\___ \ / __| '__/ _` | '_ \ / _ \
    \  /  | | \ \  | |    | |    | |_) |  | |____| |\ V /  __/____) | (__| | | (_| | |_) |  __/
     \/   |_|  \_\ |_|    |_|    |____/   |______|_| \_/ \___|_____/ \___|_|  \__,_| .__/ \___|
                                                                                   | |         
                                                                                   |_|         

	Door uw stagair van dienst, Inti De Ceukelaire
	inti.de.ceukelaire@gmail.com
	17/05/2016
*/

var FB = require('fb');

var server = require('./server.js');

var settings = {
	API_VERSION	: 'v2.6',
	ACCESS_TOKEN : '1698020197133056|WYFVV3VmDKvueQ1mcNrQ1Tf5kx8',
	BUFFER_REACTIONS : true, //Als dit aan staat, zal de laatste geldige waarde behouden blijven
	BUFFER_COMMENTS : true,   //Als dit aan staat, zal de laatste geldige waarde behouden blijven
	STREAM_INTERVAL : 1000,
	FILTERS : {
			"directions" : {
					"up" : ["up", "omhoog", "boven"],
					"down" : ["down", "omlaag", "beneden"],
					"left" : ["left", "links"],
					"right" : ["right", "rechts"],
					"up" : ["up", "omhoog", "boven"]
			}
	}
};

//Buffers
var bufferComments = [];
var bufferReactions = [];
var bufferValReactions = "";

//Storage
var storageComments = [];
var storageReactions = [];

// Global variables
var lastScrapedTime;

//Facebook API init
FB.options({version: settings.API_VERSION});
FB.setAccessToken(settings.ACCESS_TOKEN);

//Helpers
Array.prototype.inString = function(string){ //Om te checken of een bepaalde filter of synoniem in een comment zit
    var result = false;
	this.forEach(function(element){
		 var re = new RegExp("\\b" + element + "\\b");
		 if(string.match(re, "ig")){
            result = true;
		 }		
	});
	return result;
}

Array.prototype.last = function(){
  return this[this.length - 1];
};

Array.prototype.first = function(){
  return this[0];
};



//Setup: pagina fetchen, juiste video zoeken en video id ophalen om comment stream te starten

var scrape;

module.exports = {
newStream : function(url){
	setPage(url, {fields : ['name', 'id', 'picture']}, function(page){
		console.log("getting live videos for " + page.id);
  	    server.socket.emit('pageLoaded', page);
		getLiveVideos(page.id, function(video){
			scrape = new server.Scrape({
				page : page,
				post : video
			});


			scrape.save(function (err, scrape) {
  				if (err) return console.error(err);
			});


  	    	server.socket.emit('postLoaded', video);
			console.log("fetching comment stream for video with id " + video.id);
			loadStream(video.id);
		});
	});
},
loadStream : function(_scrape){
	scrape = _scrape;
	storageComments = scrape.comments;
	storageReactions = scrape.reactions;
	loadStream(scrape.post.id);
},
stopStream : function(){
	server.db.collection('scrapes').update({live : true}, {$set : {live : false}}, {multi : true});
},
test : function(){
	FB.api("1025727887474823", function(data){
		console.log(data);
	});
},
};


var loadStream = function loadStream(videoId){
	loadCommentStream(videoId, function(output){
  	    		server.socket.emit('commentsLoaded', output.comments);
	});
}
//Commentstream = interval dat om de x seconden de comments en reactions binnentrekt voor de gekozen video
function loadCommentStream(videoId, callback){
	lastScrapedTime = new Date();
	var commentsStream = setInterval(function(){
		getComments(videoId, function(comments){
				loadReactions(videoId, null, [], function(reactions){
					if(bufferReactions != undefined && bufferReactions.length != 0){

						storageReactions = countReactions(reactions);
						var diffReactions = getVotedDifference(countReactions(reactions), countReactions(bufferReactions));
						var valReactions = getVotedValue(diffReactions);

						if(valReactions == "" && settings.BUFFER_REACTIONS){
							valReactions = bufferValReactions;
						}
						else{
						 	bufferValReactions = valReactions;	
						}
						if(comments.length == 0 && settings.BUFFER_COMMENTS){
							comments = bufferComments;
						}
						else{
							bufferComments = comments;
						}
						var result = {};

						result.reaction = valReactions;

						console.log(comments.length);
						result.commands = getCommands(comments);
						console.log(result.commands);
						result.reactions = countReactions(reactions);
						result.comments = storageComments;

						console.log("id : " + scrape._id + " - " + result.reaction);
						
						server.db.collection('scrapes').update({_id: scrape._id},{$set:{reactions : reactions}});

						server.db.collection('scrapes').update({_id: scrape._id},{$set:{reaction : result.reaction}});
						server.db.collection('scrapes').update({_id: scrape._id},{$set:{commands : result.commands}});

						callback(result);
					}
					bufferReactions = reactions;
				});
		})
	}, settings.STREAM_INTERVAL);
}

function output(result){ //API endpoint voor Arduino
	console.log(getVotedValue(result.commands.directions) + "|" + result.reaction);
}

function setPage(url, param, callback){ //Haal de paginanaam uit een willekeurige paginalink
	var pageName = url.split(".com/")[1].split("/").first().split("-").last().split("?").first();
	FB.api(pageName, param, callback);
}

function getLiveVideos(pageId, success){ //de officiële Facebook Live API werkt op dit moment niet, zo dan maar
	FB.api(pageId + '/videos', function (res) {
	  if(!res || res.error) {
	    console.log(!res ? 'error occurred' : res.error);
	    return;
	  }
	  for(var i = 0; i < res.data.length; i++){
	  	isLive(res.data[i].id, success);
	  }
	});
}


function isLive(videoId, success){ //Is de video live? Beetje een hack want de live api wou niet mee zonder user access tokens
	FB.api(videoId, {fields : ['id', 'live_status', 'title',  'description', 'permalink_url']}, function (res) {
	  if(!res || res.error) {
	    return;
	  }
	  if(res.live_status == 'LIVE'){
	  	success(res);
	  }
	});
}


function getRecentComments(comments){ //Filter de nieuwste comments
	var result = [];
	if(comments == undefined){
		comments = [];
	}
	comments.forEach(function(comment){
		if(new Date(comment.created_time).getTime() > lastScrapedTime.getTime()){
			result.push(comment);
			var _comment = new server.Comment(comment);
			server.db.collection('scrapes').update({_id: scrape._id},{$push:{comments:comment}});
			storageComments.push(comment);
		}
	});
	(comments.length > 0)? lastScrapedTime = new Date(comments[0].created_time) : false;
	return result;
}

function getComments(targetId, callback){ //Comments inladen
  	FB.api('/'+targetId+'/comments?order=reverse_chronological', {limit : 100},  function(data){
  		callback(getRecentComments(data.data));
  	});
}


function loadReactions(postId, after, buffer, callback){ //Reacties (smileys) inladen
	FB.api(postId + "/reactions", {'limit' : 100, 'after' : after}, function(data){
		buffer = buffer.concat(data.data);
		if(data.paging != undefined){
		 	loadReactions(postId, data.paging.cursors.after, buffer, callback);
		}
		else{
		 	callback(buffer);
		}
	});
}

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

function getVotedDifference(obj1, obj2){ //gaat er wel van uit dat de objecten dezelfde keys hebben
	var result = {};
	for(key in obj1){
		result[key] = obj1[key] - obj2[key];
	}
	return result;
}

function countReactions(reactions){ //sorteert alle reacties per type en geeft hun subtotalen terug
	var result = {};
	reactions.forEach(function(reaction){
		if(reaction != undefined){
			var type = reaction.type;
			(result[type] == undefined) ? result[type] = 0 : result[type]++;
		}
	});
	return result;
}


function getCommands(comments){ //vertaal een set comments naar hun overeenkomstig commando uit de settings (bvb voor de direction filter)
	var result = {};
	if(comments.length ==  0){
		comments = [{message : 'null'}];
	}
	for(var i = 0; i < comments.length; i++){
		var comment = comments[i];
		for(key in settings.FILTERS){
				if(result[key] == undefined){
					result[key] = {};
				}
			for(value in settings.FILTERS[key]){
				if(result[key][value] == undefined){
					result[key][value] = 0;
				}
				if(settings.FILTERS[key][value].inString(comment.message)){
					 result[key][value]++;
				}
			}
		}
	}
	return result;
}










