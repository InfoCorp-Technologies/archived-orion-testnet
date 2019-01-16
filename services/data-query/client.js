/************************* USED LIBRARIES **************************
 *******************************************************************/
let Web3 = require('web3')
require('colors')


/******************** ETHEREUM API INTERFACE ************************
*******************************************************************/
const { host, wsHost, contractAddress } = require ('./config/config')
const abi = require ('./config/abi.json')
let web3 = new Web3(new Web3.providers.HttpProvider(host))
let web3ws = new Web3(new Web3.providers.WebsocketProvider(wsHost))
let contract = new web3.eth.Contract(abi, contractAddress)

/*********************** GLOBAL CONSTANTS **************************
 *******************************************************************/
const {
    // block number of oracle deploy. Search events from here
    deployBlock,
    // gas price of the chain
    gasPrice,
    // address and private key of account with executer permissions
    client,
    // livestockId of livestock erc721 token
    livestockId,
    //public key send by the client, must also owns the private key
    publicKey
} = require('./config/config')

main(client, contract, livestockId, publicKey, gasPrice)

async function main(_client, _contract, _livestockId, _publicKey, _gasPrice) {
    let signedTx = await create_signed_query_tx(
        _client, _contract, _livestockId, _publicKey, _gasPrice)
    console.log(signedTx);

    let transaction = await send_signed_tx(signedTx)
    let queryId = web3.utils.hexToNumber(transaction.logs[0].topics[1])
    console.log(queryId);

    let result = await get_result(queryId)
    console.log(result)
}


/******************** LOW LEVEL FUNCTIONS **************************
 *******************************************************************/
/**
 * @function create signed raw data for trigger the query fcn in
 * Oracle Contract
 * @param {*obj} _client {addr:"0x..", privKey:"0x..."}
 * @param {*obj} _contract interface of Oracle contract
 * @param {*int} _livestockId livestockId of livestock erc721 token
 * @param {*str} _publicKey RSA public key
 * @param {*int} _gasPrice gas price of the chain
 */
async function create_signed_query_tx(
    _client, _contract, _livestockId, _publicKey, _gasPrice) {
    try {
        //method interface
        let method = contract.methods.query(_livestockId, _publicKey)
        //estimate the gas used to send query function
        const gas = await estimate_gas(method, _client.address)
        if (gas.errorCode != undefined) {
            return gas
        }
        // raw data to perform the method
        let data = method.encodeABI()
        let rawTx = {
            from: _client.address,
            to: _contract._address,
            data: data,
            gas: gas,
            gasPrice: _gasPrice
        }
        const {
            rawTransaction
        } = await web3.eth.accounts.signTransaction(rawTx, _client.privKey)
        alert_success(
            `create_signed_query_tx(_client, _contract, _livestockId: ${_livestockId}, ` +
            `publicKey: ${_publicKey.substring(1,27)}` +
            `\\n${_publicKey.substring(29,35)}...` +
            `${_publicKey.substring(777,813)}`+
            ` _gasPrice: ${_gasPrice}, `,
            `rawTransaction: ${rawTransaction.substring(0,10)}...`
        )
        return rawTransaction
    } catch (error) {
        alert_error("catched on create_signed_query_tx", error)
    }
}

/**
 * @function send transaction to chain given a signed raw tx
 * @param {*hex} _signedRawTx signed raw transaction
 * @return {*obj} Transaction receipt
 */
async function send_signed_tx(_signedRawTx) {
    try {
        let transaction = await web3.eth.sendSignedTransaction(_signedRawTx);
        alert_success(
            `web3.eth.sendSignedTransaction(_signedRawTx: ` +
            `${_signedRawTx.substring(0,10)})`,
            `Tx hash: ${transaction.transactionHash}`
        )
        return transaction
    } catch (error) {
        alert_error("catched send_signed_tx", error)
        return error
    }
}
/**
 * @function estimate the gas used given a method interface
 * @param {obj} _method method interface of a contract
 * @param {*hex} _address sender address
 */
async function estimate_gas(_method, _address = null) {
    try {
        const gas = await _method.estimateGas({
            from: _address
        })
        const balance = await web3.eth.getBalance(_address)
        if (balance < (gas * gasPrice)) {
            alert_error(
                "Transaction will fail",
                "Client address run out of founds to send the transaction"
            )
            return {
                errorCode: 1,
                minWei: (gas * gasPrice)
            }
        }
        return gas
    } catch (error) {
        alert_error("estimate_gas()", error)
        return "0xfffff"
    }
}
/**
 *
 * @param {*} _contract
 * @param {*} _queryId
 */
async function get_result(_queryId) {
    try {
        let result = null
        while(!result){
            try {
                result = await contract.methods.result(_queryId).call()
            } catch (error) {
                result = null
            }
        }
        return result
    } catch (error) {
        alert_error(error)
    }
}
/**
 * @function alert_success
 * @param {string} _fcn: Function that have been ended succesfully
 * @param {object} _return: (optional). The result of the query.
 */
function alert_success(_fcn, _return = null) {
    console.log(
        `${new Date().toLocaleTimeString().blue} - ` +
        `${"Success:".green} ${_fcn} - ` +
        `${_return? ("Return: ".green+_return) : ""}`
    )
}

function alert_info(_info) {
    console.log(
        `${new Date().toLocaleTimeString().blue} - ${"Info:".yellow}` +
        ` ${_info}`
    )
}

/**
 * @ function alert_error
 * @param {string} _fcn: Function that have been ended succesfully
 * @param {object} _return: (optional). The result of the query.
 */
function alert_error(_fcn, _error) {
    console.log(
        `${new Date().toLocaleTimeString().blue} - ${"Error on:".red}` +
        ` ${_fcn} ${"more info: ".yellow +_error}`
    )
}