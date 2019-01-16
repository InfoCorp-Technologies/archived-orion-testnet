/************************* USED LIBRARIES **************************
*******************************************************************/
let Web3 = require('web3')
let request = require('request-promise')
let crypto = require('crypto')
var level = require('level')
var amqp = require('amqplib/callback_api');
require('colors')

/******************** ETHEREUM API INTERFACE ************************
*******************************************************************/
const { host, contractAddress } = require ('./config/config')
const abi = require ('./config/abi.json')
let web3 = new Web3(new Web3.providers.HttpProvider(host))
let contract = new web3.eth.Contract(abi, contractAddress)

/******************** MULTICHAIN API INTERFACE **********************
 *******************************************************************/
const { xpay } = require ('./config/config')
const multichain = require("multichain-node")({
    port: xpay.port,
    host: xpay.host,
    user: xpay.user,
    pass: xpay.pass,
});


/*********************** GLOBAL CONSTANTS **************************
 *******************************************************************/
const {
    // block number of oracle deploy. Search events from here
    deployBlock,
    // gas price of the chain
    gasPrice,
    // address and private key of account with executer permissions 
    executer,
    //crosspay database url
    databaseUrl,
    // connection settings for rabbitMQ
    connectionSettings
} = require ('./config/config')
const savedIdDb = level('./savedIdDb')

/***************** GLOBAL STATE VARIABLES **************************
 *******************************************************************/
//mapping that relates id's with info about ṕending queries state.
let pendQueryMap = {}

/*******************CALL TO MAIN  FUNCTION***************************
 ********************************************************************/
main(contract, executer, gasPrice)

async function main (_contract, _executer, _gasPrice){
    if (Object.keys(pendQueryMap).length) {
        await handle_pending_query_map()
        await delay(5000)
        main(_contract, _executer, _gasPrice)
        return
    }
    const lastUsedId = await call_current_id(_contract)
    let savedId = Number(await get_value_from_db(savedIdDb, "savedId", 0))
    //restart the db if stored data isn't consistent
    if(lastUsedId < savedId)
    check_update_lastId(lastUsedId)
    if ((lastUsedId > savedId) && !(lastUsedId in pendQueryMap)) {
        alert_info(
            `Last Id managed: ${savedId}. Checking if ` +
            `${lastUsedId - savedId} Id's corresponds to pending `+
            `queries...`
        )
        await RESPOND_AND_SAVE_QUERY(lastUsedId, _contract)
        await TRIGGER_ORACLE_RESPONSE(_executer, _contract, _gasPrice)
        await delay(5000)
        main(_contract, _executer, _gasPrice)
        return
    }
/*This function is recursive with no ZERO condition, will loop
infinitely.Each 5 seconds is consulted the lastUsedId variable stored
in the Oracle Contract.*/
    else{
        alert_info(
            `Last Id managed: ${savedId}. No pending queries.`+
            ` Consulting again in 5 seconds...`
        )
        await delay(5000)
        main(_contract, _executer, _gasPrice)
        return
    }
}



/******************** HIGH LEVEL FUNCTIONS **************************
********************************************************************/

/**
 * @function high level function, performs the query, encrypt and
 * stores it
 * @param {int} _id Id of the query performed in the Oracle Contract
 * @param {object} _contract
 */
async function RESPOND_AND_SAVE_QUERY(_lastUsedId, _contract) {
    try {
        let savedId =
            Number(await get_value_from_db(savedIdDb, "savedId", 0))
        for (let id = savedId + 1; id <= _lastUsedId; id++) {
            if (await check_if_waiting(_contract, id)){
                let queryIdObj = null
                pendQueryMap[id] = queryIdObj
                queryIdObj = await find_query_evt(id, _contract)
                if(!queryIdObj){
                    pendQueryMap[id] = {
                        errorCode: 1,
                        errorDescription: "Event not found"
                    }
                    return
                }
                pendQueryMap[id] = queryIdObj
                const response = await call_api(queryIdObj.livestockId)
                if (!response) {
                    pendQueryMap[id] = {
                        errorCode: 2,
                        errorDescription: "Invalid API request"
                    }
                    return
                }
                const stream_name = livestockId_to_multichain_stream(queryIdObj.livestockId)
                queryIdObj.hash = await get_hash_from_multichain(stream_name, response.last_update_id)
                queryIdObj.validated =
                    await check_integrity(JSON.stringify(response), queryIdObj.hash)
                queryIdObj.encryptedResponse =
                    await encrypt_data(JSON.stringify(response) , queryIdObj.pubkey)
                if (!queryIdObj.encryptedResponse) {
                    pendQueryMap[id] = {
                        errorCode: 3,
                        errorDescription: "Invalid Public Key passed"
                    }
                    return
                }
                pendQueryMap[id] = queryIdObj
            }
            else{
                check_update_lastId(id)
            }
        }
    }
    catch (error) {
       alert_error(
           `RESPOND_AND_SAVE_QUERY(${_lastUsedId}, _contract)`, error
        )
    }
}

/**
 * @function given a mapping of pendQuery objects, proccess the
 * callback response for each one and send it.
 * @param {*} _pendQueryMap
 * @param {*} _executer
 * @param {*} _contract
 * @param {*} _gasPrice
 */
async function TRIGGER_ORACLE_RESPONSE(
_executer, _contract, _gasPrice) {
    try {
        let txCount = await get_tx_count(_executer.address)
        for (const id in pendQueryMap) {
// create signed raw tx from executer for callback() fcn in Oracle
            const signedRawTx = await create_signed_callback_tx(
                _executer,
                _contract,
                id,
                pendQueryMap[id],
                _gasPrice,
                txCount
            )
//in case more than one tx needs to be sended, nonce must be increased
            txCount++
//managing out of founds in executer address
            let result
            if (signedRawTx.errorCode != undefined) {
                result ={
                    status: false,
                    info: signedRawTx,
                }
            }
            else {
// result object is an object containing information about tx.
                result = await send_signed_tx(signedRawTx)
            }
            if (result.status) {
/* update the lastId saved in backend and delete de object stored in
pendQueryMap */
                check_update_lastId(id)
                delete pendQueryMap[id]
            }
            else {
// If tx fails, the info is saved in queryIdObj to debug it
                const queryIdObj = pendQueryMap[id]
                const updatedQueryIdObj =
                    Object.assign(queryIdObj, result)
                pendQueryMap[id] = updatedQueryIdObj
            }
        }
    }
    catch (error) {
        alert_error(
            `TRIGGER_ORACLE_RESPONSE(_executer, _contract, _gasPrice)`,
            error
        )
    }
}

/******************** LOW LEVEL FUNCTIONS **************************
 *******************************************************************/

async function handle_pending_query_map(){
    try {
        alert_info(
            `There are ${Object.keys(pendQueryMap).length} `+
            `queries in queue...`
        )
        for (id in pendQueryMap){
            if(pendQueryMap[id].info.errorCode = 1){
                const balance =
                    await web3.eth.getBalance(executer.address)
                if (balance > pendQueryMap[id].info.minWei) {
                    delete pendQueryMap[id]
                    alert_info(
                        `Executer address has enough founds now, `+
                        `reproccesing query with id ${id}`
                    )
                    return
                }
                else {
                    alert_error(
                        `Executer address run out of founds `+
                        `to response query with id ${id}`
                    )
                    return
                }
            }
            else{
                alert_error(`unmanaged error in pending query`)
                return
            }
        }
    }
    catch (error) {
        alert_error(`handle_pending_query_map()`, error)
    }
}

/**
 *
 * @param {*} _dbInstance
 * @param {*} _key
 * @param {*} _valueOnError
 */
async function get_value_from_db(
    _dbInstance, _key, _valueOnError=null){
    try {
        const value = await _dbInstance.get(_key)
        return value
    } catch (error) {
        if (error == "NotFoundError: Key not found in database [savedId]")
            await savedIdDb.put('savedId', 0)
        else{
            alert_error(`get_value_from_db(_dbInstance, ${_key}`+
            `${_valueOnError? (", "+{_valueOnError}) : ""})`, error)
            if(_valueOnError)
                return _valueOnError
        }
    }
}

/**
 * @function Retrieve the value stored in Oracle contract
 */
async function call_current_id(_contract) {
    try {
        let consultedId = await _contract.methods.lastUsedId().call()
        alert_success("call_current_id(_contract)", consultedId)
        return consultedId
    } catch (error) {
        alert_error("contract.methods.lastUsedId()" , error)
        return null
    }
}

/**
 *
 * @param {*} _contract
 * @param {*} _id
 */
async function check_if_waiting (
_contract, _id) {
    try {
        let isWaiting = await _contract.methods.isQueryWaiting(_id).call()
        return isWaiting
    } catch (error) {
        alert_error(`contract.methods.isQueryWaiting(${_id})`, error)
        return null
    }
}

/**
 * @function find_query_evt:
 * @param {int} _id
 */
async function find_query_evt(_id, _contract) {
    try {
        const res = await _contract.getPastEvents('Query', {
            filter: {
                queryId: [_id],
            },
            fromBlock: deployBlock,
            toBlock: 'latest'
        })
        const { livestockId, pubkey  } = res[0].returnValues
        const obj = {
            livestockId: livestockId,
            pubkey: pubkey
        }
        alert_success(
            `find_query_evt(${_id}, _contract)`,
            `livestockId: ${obj.livestockId} , `+
            `PUBKEY: ${obj.pubkey.substring(1,27)}`+
            `\\n${obj.pubkey.substring(29,35)}...`+
            `${obj.pubkey.substring(777,813)}`
        )
        return obj
    }
    catch (error) {
        alert_error("cacthed on find_query_evt()", error)
        return null
    }
}

/**
 * @function call_api
 * @param {string} _url: endpoint of the API call
 * @returns: Body of the API response.
 */
async function call_api (_livestockId){
    try {
        const url = `${databaseUrl}/${_livestockId}`
        const body  = await request.get(url, { json: true })
        alert_success(`call_api(${_livestockId})`, `BODY:`+
        `${JSON.stringify(body).substring(0,35)}...}`)
        return body
    }
    catch (error) {
        alert_error("cacthed on call_api()", error)
        return null
    }
}

/**
 * Harcoded function, must convert livestockId to multichain stream name
 * (see /sentinel Chain/proposals/Solution poposal for Livestock ERC721 token creation
 * section "Livestock ID linked with multichain livestock address")
 * This fcn must implement a base10->base58 converter for big number
 * @param {*} _livestockId
 */
function livestockId_to_multichain_stream(_livestockId){
    return "1UoDLyX3PWrCsWW1aB6ChpxFC8qY2z7"
}


async function get_hash_from_multichain(_name , _key) {
    try {
        const item = await multichain.listStreamKeyItems([_name, _key, false, 1])
        alert_success(`get_hash_from_multichain(${_name} , ${_key})`, item[0].data)
        return item[0].data
    }
    catch (error) {
        alert_error(`get_hash_from_multichain(${_name} , ${_key})`, error)
        return null
    }
}

async function check_integrity(_apiResponse, _MCdata) {
    try {
        const hash = crypto.createHash('sha256').update(_apiResponse).digest('hex')
        if(hash == _MCdata){
            alert_success(`check_integrity(${_apiResponse.substring(0,30)}...}, ${_MCdata})`, true)
            return true
        }
        else{
            alert_error(
                `check_integrity(${_apiResponse.substring(0, 30)}...}, ${_MCdata})`,
                `Verification not passed. Non equal hashes:
                DB response hash: ${hash}
                MC hash: ${_MCdata}`
            )
            return false
        }
    }
    catch (error) {
        alert_error("cacthed on check_integrity()", error)
        return false
    }
}

async function encrypt_data (_data, _pubKey){
    try {
        let pass = random_value_hex(32)
        let encryptedData = aes_encrypt(_data, pass)
        let encryptedPass = rsa_encrypt(pass, _pubKey)
        let jsonDataEncrypted = {
            encryptedKey: encryptedPass,
            encryptedData: encryptedData,
        };
        jsonDataEncryptedStr = JSON.stringify(jsonDataEncrypted);
        alert_success(
            `encrypt_data(${_data.substring(0,35)}...} , `+
            `${_pubKey.substring(1,27)}\\n`+
            `${_pubKey.substring(29,35)}...`+
            `${_pubKey.substring(777,813)})`,
            `{encryptedKey: `+
            `${jsonDataEncrypted.encryptedKey.substring(0,10)}... ,`+
            ` encryptedData: `+
            `${jsonDataEncrypted.encryptedData.substring(0,10)}... }`
        )
        return jsonDataEncrypted
    }
    catch (error) {
        alert_error(
            `encrypt_data(${_data.substring(0,35)}... , `+
            `${_pubKey.substring(1,27)}\\n`+
            `${_pubKey.substring(29,35)} ... `+
            `${_pubKey.substring(777,813)})`,error
        )
        return null
    }
}

/**
 * @function Get the numbers of transactions sent from this address.
 * On error, returns null.
 * @param {*address} _address
 */
async function get_tx_count(_address){
    try{
        let txCount =  web3.eth.getTransactionCount(_address)
        return txCount
    }
    catch (error) {
        alert_error(`get_tx_count(${_executer.address})`, error)
        return null
    }
}

/**
 * @function create signed raw data for trigger the callback in
 * Oracle Contract
 * @param {*obj} _executer {addr:"0x..", privKey:"0x..."}
 * @param {*obj} _contract interface of Oracle contract
 * @param {*int} _id id of pending query.
 * @param {*str} _encryptedResponse encrypted response of query
 * @param {*int} _gasPrice gas price of the chain
 * @param {*int} _nonce nonce of the tx
 */
async function create_signed_callback_tx(
_executer, _contract, _id, _queryIdObj, _gasPrice, _nonce){
    try {
        //method interface
        let method
        if(_queryIdObj.errorCode != undefined){
            method = contract.methods.callback(
                _id,
                _queryIdObj.errorDescription,
                _queryIdObj.errorCode
            )
        }
        else{
            method = contract.methods.callback(_id, JSON.stringify(_queryIdObj), 1)
        }
    //estimate the gas used to send callback function
        const gas = await estimate_gas(method, _executer.address)
        if(gas.errorCode != undefined){
            return gas
        }
    // raw data to perform the method
        let data = method.encodeABI()
        let rawTx = {
            from: _executer.address,
            to: _contract._address,
            data: data,
            gas: gas,
            gasPrice: _gasPrice,
            nonce: _nonce
        }
        const {
            rawTransaction
        } = await web3.eth.accounts.signTransaction(rawTx, _executer.privKey)
        alert_success(
            `create_signed_callback_tx(_executer, _contract, _id: ${_id}, `+
            `_encryptedResponse: ${
                _queryIdObj.encryptedResponse == undefined ?
                    _queryIdObj.errorDescription :
                    JSON.stringify(_queryIdObj.encryptedResponse).substring(0, 10)+'...,'}` +
            ` _gasPrice: ${_gasPrice}, _nonce: ${_nonce})`,
            `rawTransaction: ${rawTransaction.substring(0,10)}...`
        )
        return rawTransaction
    } catch (error) {
        alert_error("catched on create_signed_callback_tx", error)
    }
}

/**
 * @function send transaction to chain given a signed raw tx
 * @param {*hex} _signedRawTx signed raw transaction
 * @return {*obj} Transaction receipt
 */
async function send_signed_tx(_signedRawTx){
    try {
        let transaction = await web3.eth.sendSignedTransaction(_signedRawTx);
        alert_success(
            `web3.eth.sendSignedTransaction(_signedRawTx: `+
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
 * Check if necesary an update of lastId stored in backend
 * @param {int} _id
 * @para {int} savedId
 */
async function check_update_lastId(_id){
    try {
        let savedId =
            Number(await get_value_from_db(savedIdDb, "savedId", 0))
        if (_id == savedId+1) {
            await savedIdDb.put('savedId', _id)
            alert_success(`check_update_lastId(${_id}, ${savedId})`)
        }
        else if(_id < savedId){
            await savedIdDb.put('savedId', 0)
            alert_info(`database reinitialized, savedId = 0`)
        }
    }
    catch (error) {
        alert_error("catched on check_update_lastId", error)
    }
}


/************************HELPER FUNCTIONS**************************
 ******************************************************************/

/**
 * @function alert_success
 * @param {string} _fcn: Function that have been ended succesfully
 * @param {object} _return: (optional). The result of the query.
 */
function alert_success(_fcn, _return = null){
    console.log(
        `${new Date().toLocaleTimeString().blue} - `+
        `${"Success:".green} ${_fcn} - `+
        `${_return? ("Return: ".green+_return) : ""}`
    )
}

function alert_info(_info) {
    console.log(
        `${new Date().toLocaleTimeString().blue} - ${"Info:".yellow}`
        +` ${_info}`
    )
}

/**
 * @ function alert_error
 * @param {string} _fcn: Function that have been ended succesfully
 * @param {object} _return: (optional). The result of the query.
 */
function alert_error(_fcn, _error){
    console.log(
        `${new Date().toLocaleTimeString().blue} - ${"Error on:".red}`+
        ` ${_fcn} ${"more info: ".yellow +_error}`
    )
}

/**
 * @ function delay
 * @param {*} ms amount of miliseconds of waiting
 */
const delay = ms => new Promise(res => setTimeout(res, ms));

function random_value_hex(_len) {
    try {
        const pass = crypto.randomBytes(_len)
            // convert to string
            .toString('hex')
            // return required number of characters
            .slice(0, _len).toUpperCase()
        return pass
    } catch (error) {
        alert_error(`catched on randomValueHex(${_len})`, error)
    }
}

/**
 * @function symetric AES encrypt _data with _pass and returns the
 * data string encrypted
 * @param {*} _data
 * @param {*} _pass
 */
function aes_encrypt(_data, _pass) {
    try {
        var cipher = crypto.createCipher("aes-256-ctr", _pass)
        var crypted = cipher.update(_data, 'utf8', 'hex')
        crypted += cipher.final('hex');
        return crypted;
    } catch (error) {
        alert_error(`catched on AESencrypt(_data, _pass)`, error)
    }
}

/**
 * @function asymetric RSA encrypt _data with _pubkey, and returns
 * the data string encrypted
 * @param {*} _data
 * @param {*} _pubkey
 */
function rsa_encrypt(_data, _pubkey) {
    try {
        var buffer = Buffer.from(_data);
        var encrypted = crypto.publicEncrypt(_pubkey, buffer);
        return encrypted.toString("base64");
    } catch (error) {
        alert_error(`catched on RSAencrypt(_data, _pubkey)`, error)
    }
};

/**
 * @function estimate the gas used given a method interface
 * @param {obj} _method method interface of a contract
 * @param {*hex} _address sender address
 */
async function estimate_gas(_method, _address=null){
    try {
        const gas = await _method.estimateGas({
            from: _address
        })
        const balance = await web3.eth.getBalance(_address)
        if(balance < (gas * gasPrice)){
            alert_error(
                "Transaction will fail",
                "Executer address run out of founds to send the transaction"
            )
            return {errorCode :1, minWei: (gas*gasPrice)}
        }
        return gas
    }
    catch (error) {
        alert_error("estimate_gas()", error)
        return "0xfffff"
    }
}