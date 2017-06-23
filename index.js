//
//

function uniq_fast(in_array) {
    "use strict";
    var seen = {};
    var out = [];
    var len = in_array.length;
    var j = 0;
    for (var i = 0; i < len; i++) {
        var item = in_array[i];
        if (seen[item] !== 1) {
            seen[item] = 1;
            out[j++] = item;
        }
    }
    return out;
}

var fs = require("fs");
var express = require("express");

var app = express();

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.use(express.static('public'));
app.use(express.static('resources'));

app.get('/', function(req, res) {
    res.render('nexus', {});
});

app.get('/page/:model_id', function(req, res) {
    var path = "resources/models/" + req.params.model_id;
    console.log(path);
    var arr = fs.readdirSync(path);
    var output_array = [];
    for (var i = 0; i < arr.length; i++){
        var str = arr[i];
        if (fs.lstatSync(path + "/" + str).isFile())
        {
            output_array.push(str.replace(/\.[^/.]+$/, ""));
        }
    }
    output_array = uniq_fast(output_array);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(output_array));
});

// Start server 
var port = (process.env.PORT || 5000);
app.set('port', port);

app.listen(app.get('port'), function() {
  console.log('Server is running - 127.0.0.1:' + port + '/');
});