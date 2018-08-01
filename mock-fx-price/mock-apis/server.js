const express = require('express');
const app = express();
let exchangeRates = require('./exchangeRates.json');

app.get('/rate', (req, res) => {
    console.log(req.query);
    let from = req.query.from;
    let to = req.query.to;

    res.header("Content-Type", "application/json");
    if (from && to) {
        let rateFrom = exchangeRates.rates[from];
        let rateTo = exchangeRates.rates[to];
        if (rateFrom && rateTo) {
            res.send({rate: rateFrom / rateTo});
        } else {
            res.send({rate: -1});
        }
    } else {
        res.send({rate: -1});
    }
});

app.listen(65221, () => console.log('Example app listening on port 65221!'));