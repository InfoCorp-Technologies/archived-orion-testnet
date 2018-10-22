let contractAbi = require('./config/abi');
let config = require('./config/config');
let contractAddress = config.contract.address;

let async = require('async');
let request = require('request');

let web3;
console.log('\nInitializing web3 ...');
let Web3 = require('web3');
if (typeof web3 !== 'undefined') {
    web3 = new Web3(web3.currentProvider);
}
else {
    web3 = new Web3(new Web3.providers.WebsocketProvider(config.host));
}

let forge = require('node-forge');
let encrypter = require('./encrypter');
let rsaKeys = require('./config/rsaKeys');

function foo() {
    async.waterfall([
        (callback) => {
            console.log('\n1. Setting up contract and event listeners ...');

            let contract = new web3.eth.Contract(contractAbi, contractAddress);
            contract.once('Query', {
                fromBlock: config.contract.fromBlock,
                toBlock: 'latest'
            }, (error, result) => {
                let queryId = result.returnValues[0];
                let url = result.returnValues[1];
                let pubkey = result.returnValues[2]
                callback(null, contract, queryId, url);
            });

            console.log('Trigger a query ...');
        },
        (contract, queryId, url, callback) => {
            console.log('\n2. Retrieving data from the multichain ...');

            request.get(url, { json: true }, (err, result, data) => {
                if (err) {
                    console.log('ERROR: Cannot retrieve bridge data!!!');
                    foo();
                } else {
                    if (result.statusCode === 200 && data.ErrorCode === 200) {
                        callback(null, contract, queryId, JSON.stringify(data.result));
                    } else {
                        console.log(`ERROR: ${result.statusCode}`);
                        foo();
                    }
                }
            });
        },
        (contract, myid, string) => {
            console.log('\n3. Triggering callback() ...');
            console.log(string);

            var args = process.argv.slice(2);
            var jsonDataStr;

            if (args != null && args == 1) {
                let key = forge.random.getBytesSync(16);
                let iv = forge.random.getBytesSync(16);
                let encryptedData = encrypter.aesEncrypt(key, iv, string); // AES-128

                let publicKey = forge.pki.publicKeyFromPem(rsaKeys.publicKeyPem);
                let encryptedKey = encrypter.rsaEncrypt(publicKey, key);
                let encryptedIv = encrypter.rsaEncrypt(publicKey, iv);

                let jsonData = {
                    key: encryptedKey,
                    iv: encryptedIv,
                    data: encryptedData
                };

                jsonDataStr = JSON.stringify(jsonData);
            } else {
                jsonDataStr = string;
            }

            let fs = require("fs");
            fs.writeFile("./jsonDataStr.json", jsonDataStr, function (err) {
                if (err) {
                    return console.log(err);
                }

                console.log("The file was saved!");
            });

            triggerMethod(contract, 'callback', [myid, jsonDataStr], config.executer.address, config.executer.privkey, (result) => {
                if (result === true) {
                    console.log('Callbacked successfully');
                } else {
                    console.log(result);
                }
                foo(); // loop itself
            });
        }
    ]);
}

foo();

function triggerMethod(contract, method, params, from, privkey, callback) {
    console.log(`[${contract.options.address}] triggering method [${method}] with ${params.length} params from account [${from}]`);
    let call = contract.methods[method](...params);
    let tx = {
        from: from,
        to: contract.options.address,
        data: call.encodeABI(),
        gas: 4700000,
        gasPrice: config.contract.gasPrice
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
