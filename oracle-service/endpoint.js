let contractAbi = require('./config/abi');
let config = require('./config/config');
let contractAddress = config.contract.address;

let async = require('async');
let request = require('request');
let web3;

async.waterfall([
    (callback) => {
        console.log('\n1. Initializing Web3 ...');
        let Web3 = require('web3');
        if (typeof web3 !== 'undefined') {
            web3 = new Web3(web3.currentProvider);
        }
        else {
            web3 = new Web3(new Web3.providers.WebsocketProvider(config.host));
        }
        callback(null, web3);
    },
    (web3, callback) => {
        console.log('\n2. Setting up contract and event listeners ...');

        let contract = new web3.eth.Contract(contractAbi, contractAddress);
        // will be listened when step 3 is triggered
        contract.once('Query', {
            fromBlock: 0,
            toBlock: 'latest'
        }, (error, result) => {
            let queryId = result.returnValues[0];
            let url = result.returnValues[1];
            request.get(url, {json: true}, (err, res, data) => {
                console.log(JSON.stringify(data.result));
                if (err) {
                    console.log('ERROR: Cannot retrieve bridge data!!!');
                } else {
                    if (res.statusCode === 200 && data.ErrorCode === 200) {
                        console.log('\n4. Triggering __callback() ...');
                        triggerMethod(contract, '__callback', [queryId, JSON.stringify(data.result)],
                            config.executer.address, config.executer.privkey, (result) => {
                                if (result === true) {
                                    console.log('Callbacked successfully');
                                } else {
                                    console.log(result);
                                }
                            });
                    } else {
                        console.log(`ERROR: ${res.statusCode}`);
                    }
                }
            });
        });

        callback(null, contract);
    },
    (contract, callback) => {
        console.log('\n3. Triggering query() ...');
        triggerMethod(contract, 'query', [config.query.name, config.query.walletAddress], config.executer.address, config.executer.privkey, (result) => {
            if (result) {
                console.log('Queried successfully');
            } else {
                console.log(result);
            }
        });
    }
]);

function triggerMethod(contract, method, params, from, privkey, callback) {
    console.log(`[${contract.options.address}] triggering method [${method}] with params [${params}] from account [${from}]`);
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
