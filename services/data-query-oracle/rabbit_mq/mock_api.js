var express = require('express')
var app = express()
const response = require('./config/response')

app.get('/9708593375994130324...1038703907734592248733', function (req, res) {
   console.log(new Date(),'Hit!')
   res.json(response)
});

app.listen(3000, function(){console.log('Mock started')});
