let contractAbi = require('./config/abi');
let config = require('./config/config');
let contractAddress = config.contract.address;

let async = require('async');
let request = require('request');

let web3;
let Web3 = require('web3');
if (typeof web3 !== 'undefined') {
    web3 = new Web3(web3.currentProvider);
}
else {
    web3 = new Web3(new Web3.providers.WebsocketProvider(config.host));
}

let contract = new web3.eth.Contract(contractAbi, contractAddress);

function handlePendingRequests(callback) {
    contract.getPastEvents('Exchange', {
        fromBlock: 0,
        toBlock: 'latest'
    }).then(async exchanges => {
        for (let i = 0; i < exchanges.length; i++) {
            let result = await handlePendingExchange(exchanges[i]); // execute sequently to guarantee there is enough gas
            console.log(result);
        }
        callback();
    });
}

async function handlePendingExchange(exchange) {
    return new Promise(resolve => {
        let exchangeTxId = exchange.transactionHash;
        let exchangeId = exchange.returnValues[0];
        let total = exchange.returnValues[1];
        let fromCurrency = exchange.returnValues[2];
        let toCurrency = exchange.returnValues[3];
        let endpoint = exchange.returnValues[4];
        contract.methods.checkPending(exchangeId).call().then(pending => {
            if (pending) {
                console.log(`Handling pending transaction: ${exchangeTxId} of exchange ${exchangeId} ...`);
                request.get(endpoint, {qs: {from: fromCurrency, to: toCurrency}, json: true}, (err, result, data) => {
                    if (result.statusCode === 200 && data.rate !== -1) {
                        let value = total * data.rate;
                        triggerMethod(contract, '__callback', [exchangeTxId, exchangeId, value], config.executer.address, config.executer.privkey, (success) => {
                            if (success === true) {
                                resolve('HANDLED SUCCESFULLY');
                            } else {
                                resolve('FAILED');
                            }
                        });
                    } else {
                        resolve(`ERROR: ${result.statusCode}`);
                    }
                });
            }
            else {
                resolve('FAILED');
            }
        });
    });

};

function foo() {
    async.waterfall([
        (callback) => {
            console.log('\n1. Setting up contract and event listeners ...');
            contract.once('Exchange', {
                fromBlock: 0,
                toBlock: 'latest'
            }, (error, result) => {
                let exchangeTxId = result.transactionHash;
                let exchangeId = result.returnValues[0];
                let total = result.returnValues[1];
                let fromCurrency = result.returnValues[2];
                let toCurrency = result.returnValues[3];
                let endpoint = result.returnValues[4];

                callback(null, contract, exchangeTxId, exchangeId, total, fromCurrency, toCurrency, endpoint);
            });

            console.log('Trigger an exchange ...');
        },
        (contract, exchangeTxId, exchangeId, total, fromCurrency, toCurrency, endpoint, callback) => {
            console.log(`\n2. Retrieving the rate ${fromCurrency}/${toCurrency} ...`);

            request.get(endpoint, {qs: {from: fromCurrency, to: toCurrency}, json: true}, (err, result, data) => {
                if (err) {
                    console.log('ERROR: Cannot retrieve the rate!!!');
                    foo();
                } else {
                    if (result.statusCode === 200 && data.rate !== -1) {
                        console.log(`The ${fromCurrency}/${toCurrency} rate is ${data.rate}`);
                        let value = total * data.rate;
                        callback(null, contract, exchangeTxId, exchangeId, value);
                    } else {
                        console.log(`ERROR: ${result.statusCode}`);
                        foo();
                    }
                }
            });
        },
        (contract, exchangeTxId, exchangeId, value) => {
            console.log('\n3. Triggering __callback() ...');

            triggerMethod(contract, '__callback', [exchangeTxId, exchangeId, value], config.executer.address, config.executer.privkey, (success) => {
                if (success === true) {
                    console.log('Callbacked successfully');
                } else {
                    console.log(success);
                }
                foo(); // loop itself
            });
        }
    ]);
}

handlePendingRequests(foo);

function triggerMethod(contract, method, params, from, privkey, callback) {
    let call = contract.methods[method](...params);
    let tx = {
        from: from,
        to: contract.options.address,
        data: call.encodeABI(),
        gas: 4700000,
        gasPrice: 1000000000
    };

    (async function () {
        await web3.eth.accounts.signTransaction(tx, privkey).then(async signed => {
            let transaction = web3.eth.sendSignedTransaction(signed.rawTransaction);
            transaction.on('receipt', async receipt => {
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
