var async = require('async');
var express = require('express');
var fs = require('fs');
var path = require('path');
var request = require('request');
var app = express();

app.use(express.static(path.join(__dirname, '/public')));

app.get('/', function(req, res) {
    res.sendfile(path.join(__dirname + '/index.html'));
});

app.get('/entries', function(req, res, next) {
    var baseUrl = 'http://jsonplaceholder.typicode.com/';
    var output = {};

    async.each(['posts', 'users'], 
        function entry(item, callback) {
            request(baseUrl + item, function(error, resp) {
                if (!error) {
                    if (item === 'users') {
                        var usersArray = JSON.parse(resp.body)
                            , usersObj = {};

                        usersArray.forEach(function(user) {
                            usersObj[user.id] = user;
                        });

                        output[item] = usersObj;
                    } else {
                        output[item] = JSON.parse(resp.body);
                    }
                    callback();
                }
            });
        }, function(err) {
            res.json(JSON.stringify(output));
        }
    );
});

app.get('/comments/:postId', function(req, res, next) {
    var postId = req.params.postId;
    var url = 'http://jsonplaceholder.typicode.com/comments?postId=' + postId;
    request(url, function(error, resp) {
        if (!error) {
            res.json(resp.body);
        }
    })
})

app.listen(8080);

exports = module.exports = app;