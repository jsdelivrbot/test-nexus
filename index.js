//
//

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
    console.log(req.params.model_id);
    var arr = fs.readdirSync("resources/models/" + req.params.model_id);
    for (var i = 0; i < arr.length; i++){
        var str = arr[i];
        arr[i] = str.replace(/\.[^/.]+$/, "");
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(arr));
});

// Start server 
var port = (process.env.PORT || 5000);
app.set('port', port);

app.listen(app.get('port'), function() {
  console.log('Server is running - 127.0.0.1:' + port + '/');
});