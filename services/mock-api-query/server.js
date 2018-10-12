const express = require('express');
const app = express();
let userResult = require('./userResult.json');
let attestatorResult = require('./attestatorResult.json');
let livestockResult = require('./livestockResult.json');

app.get('/user*', (req, res) => {
    console.log('|> request: user', '\n');
    res.header("Content-Type", "application/json");
    res.send(userResult);
});
app.get('/attestator*', (req, res) => {
    console.log('|> request: attestator', '\n');
    res.header("Content-Type", "application/json");
    res.send(attestatorResult);
});
app.get('/livestock*', (req, res) => {
    console.log('|> request: livestock', '\n');
    res.header("Content-Type", "application/json");
    res.send(livestockResult);
});

app.listen(65222, () => console.log('** Mock cross chain api query listening on port: 65222 **'));