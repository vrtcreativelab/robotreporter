var socket = io();


socket.on('pageLoaded', function (page) {
	$(".page-name").text(page.name);
	$(".page-id").text(page.id);
	$(".page-link").attr("href", "https://www.facebook.com/" + page.id);
	$(".page-picture").attr("src",  page.picture.data.url);
	$("#page-details .loading").hide();
	$("#page-details .loaded").show();
	$("#stream-start").hide();
	$("#stream-stop").show();
});

var thepost;
socket.on('postLoaded', function (post) {
	$(".post-id").text(post.id);
	if(post.title == "" || post.title == undefined){
		post.title = "#" + post.id;
	}
	$(".post-title").text(post.permalink_url);
	$(".post-link").attr("href", "https://www.facebook.com/" + post.permalink_url);
	$(".post-description").text(post.description);
	$(".post-picture").attr("src",  post.picture);
	$(".post-status").text(post.live_status);
	$("#post-details .loading").hide();
	$("#post-details .loaded").show();
});

socket.on('commentsLoaded', function (output) {   
	var table = $('#comments-table').dataTable();
	console.log(output);
	table.fnClearTable();
	table.fnAddData(output);
});
var dummyComments = [{id : "", name : ""}];
$(document).ready(function(){
    $('#comments-table').DataTable({
        columns: [
        { data : 'created_time', 'render' : function(data){
        	var date = new Date(data);
        	return fixZero(date.getHours()) + ":" + fixZero(date.getSeconds());
        }},
        { data: 'from', 'render' : function(data){
        	if(data != undefined){
	        	(data.id == undefined)? data.id = "" : false;
	        	(data.name == undefined)? data.name = "" : false;
	        	return "<a href='https://www.facebook.com/" + data.id +"' target='_blank'>"+data.name+"</a>";
	        }
	        else{
	        	return "";
	        }
        }},
        { data: 'message', 'render' : function(data){
        	return data;
        } }
    	]
    });
});

function escapeHtml(text) {
	return "o";
	/*
    'use strict';
    return "kek";
    return text.replace(/[\"&'\/<>]/g, function (a) {
        return {
            '"': '&quot;', '&': '&amp;', "'": '&#39;',
            '/': '&#47;',  '<': '&lt;',  '>': '&gt;'
        }[a];
    });*/
}

function fixZero(number){
	var string = number.toString();
	return string.length < 2?  '0' + string :  string;
}


    $("#start-stream").click(function(e){   
		socket.emit('pageLink', $('#page-link').val());
	    return false;
	});
    $("#stop-stream").click(function(e){
    	alert(0);
		socket.emit('stopStream', $('#page-link').val());
	    return false;
    });