let async = require('async');
let request = require('request');
let Web3 = require('web3');

let contractAbi = require('./config/abi');
let config = require('./config/config');
let contractAddress = config.contract.address;
let fromBlock = config.contract.fromBlock;

let web3;
if (typeof web3 !== 'undefined') {
    web3 = new Web3(web3.currentProvider);
} else {
    web3 = new Web3(new Web3.providers.WebsocketProvider(config.host));
}

let contract = new web3.eth.Contract(contractAbi, contractAddress);

function listenRequests() {
    async.waterfall([
        (callback) => {
            console.log('\n1. Setting up contract and event listeners ...');
            contract.once('Exchange', {
                fromBlock: fromBlock,
                toBlock: 'latest'
            }, (error, result) => {
                let exchangeId = result.returnValues[0];
                let total = result.returnValues[1];
                let fromCurrency = result.returnValues[2];
                let toCurrency = result.returnValues[3];

                callback(null, contract, exchangeId, total, fromCurrency, toCurrency);
            });

            console.log('Trigger an exchange ...');
        },
        (contract, exchangeId, total, fromCurrency, toCurrency, callback) => {
            console.log(`\n2. Retrieving the rate ${fromCurrency}/${toCurrency} ...`);

            request.get(config.rateEndpoint, { qs: { from: fromCurrency, to: toCurrency }, json: true }, (err, result, data) => {
                if (err) {
                    console.log('ERROR: Cannot retrieve the rate!!!');
                    listenRequests();
                } else {
                    if (result.statusCode === 200 && data.rate !== -1) {
                        console.log(`The ${fromCurrency}/${toCurrency} rate is ${data.rate}`);
                        let value = total * data.rate;
                        callback(null, contract, exchangeId, value);
                    } else {
                        console.log(`ERROR: ${result.statusCode}`);
                        listenRequests();
                    }
                }
            });
        },
        (contract, exchangeId, value) => {
            console.log('\n3. Triggering callback() ...');

            triggerMethod(contract, 'callback', [exchangeId, value], config.executer.address, config.executer.privkey, (success) => {
                if (success === true) {
                    console.log('Callbacked successfully');
                } else {
                    console.log(success);
                }
                listenRequests(); // loop itself
            });
        }
    ]);
}

function triggerMethod(contract, method, params, from, privkey, callback) {
    let call = contract.methods[method](...params);
    let tx = {
        from: from,
        to: contract.options.address,
        data: call.encodeABI(),
        gas: 4700000,
        gasPrice: config.contract.gasPrice,
    };
    (async function () {
        await web3.eth.accounts.signTransaction(tx, privkey).then(async signed => {
            let transaction = web3.eth.sendSignedTransaction(signed.rawTransaction);
            await transaction.on('receipt', async receipt => {
                if (receipt.gasUsed < tx.gas) {
                    callback(true);
                } else {
                    callback(false);
                }
            });

            transaction.on('error', error => {
                callback(error.message);
            });
        })
    })();
}

async function handlePendingRequest(exchange) {
    return new Promise(resolve => {
        let exchangeId = exchange.returnValues[0];
        let total = exchange.returnValues[1];
        let fromCurrency = exchange.returnValues[2];
        let toCurrency = exchange.returnValues[3];
        contract.methods.exchangeMap(exchangeId).call().then(info => {
            if (info.isWaiting) {
                console.log(`Handling pending request ${exchangeId} ...`);
                request.get(config.rateEndpoint, { qs: { from: fromCurrency, to: toCurrency }, json: true }, (err, result, data) => {
                    if (result.statusCode === 200 && data.rate !== -1) {
                        let value = total * data.rate;
                        triggerMethod(contract, 'callback', [exchangeId, value.toString()], config.executer.address, config.executer.privkey, (success) => {
                            if (success === true) {
                                console.log('HANDLED SUCCESFULLY');
                                resolve('HANDLED SUCCESFULLY');
                            } else {
                                console.log('¡¡HANDLED FAILED!!');
                                resolve('FAILED');
                            }
                        });
                    } else {
                        resolve(`ERROR: ${result.statusCode}`);
                    }
                });
            } else {
                resolve('ALREADY PROCESSED');
            }
        });
    });
}

function handleRequests(callback) {
    contract.getPastEvents('Exchange', {
        fromBlock: fromBlock,
        toBlock: 'latest'
    }).then(async exchanges => {
        for (let i = 0; i < exchanges.length; i++) {
            await handlePendingRequest(exchanges[i]); // execute sequently to guarantee there is enough gas
        }
        callback();
    });
}

handleRequests(listenRequests);
