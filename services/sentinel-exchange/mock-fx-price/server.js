const express = require('express');
const app = express();
let exchangeRates = require('./exchangeRates.json');

app.get('/rate', (req, res) => {
    console.log('|> request: ', req.query);
    let from = req.query.from;
    let to = req.query.to;
    let rate = {rate: -1}
    res.header("Content-Type", "application/json");
    if (from && to) {
        let rateFrom = exchangeRates.rates[from];
        let rateTo = exchangeRates.rates[to];
        if (rateFrom && rateTo) {
            rate = {rate: rateFrom / rateTo};
        }
    }
    console.log('|< response: ', rate, '\n');
    res.send(rate);

});

app.listen(65221, () => console.log('** Mock api rate listening on port: 65221 **'));
