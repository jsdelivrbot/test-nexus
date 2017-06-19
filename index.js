//
//

var fs = require("fs");
var express = require("express");

var app = express();

app.set('port', (process.env.PORT || 5000));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.use(express.static('public'));

app.get('/nexus', function(req, res) {
    res.render('nexus', {});
});
app.get('/corto', function(req, res) {
    res.render('corto', {});
});

app.get('/models/:model_id', function(req, res) {
    var arr = fs.readdirSync("public/models/" + req.params.model_id);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(arr));
});

// Start server 

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});