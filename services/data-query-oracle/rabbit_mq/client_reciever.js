/************************* USED LIBRARIES **************************
 *******************************************************************/
const rascal = require("./libraries/rascal.js")
const alert = require("./libraries/alert.js")
const encrypt = require("./libraries/encrypt")

/************************* GLOBAL VARIABLES ************************
 *******************************************************************/
const msgId = process.argv[2] ? process.argv[2] :"1234"
const rascalConfig = require('./config/rascalConfig');
const {
    privateKey
} = require('./config/config')

/************************* MAIN FUCNTION CALL ********************
 *******************************************************************/
recieve_from_rpc(msgId);

/************************* HIGH LEVEL FUNCTIONS ********************
 *******************************************************************/
async function recieve_from_rpc(_messageId) {
    try {
        const broker = await rascal.connect(rascalConfig)
        const subscription = await rascal.subscribe(broker, "response", callback_response)
        subscription.on('message', callback_response)
    } catch (error) {
        alert.error(`recieve_from_rpc(${_messageId})`, error)
    }
}

/************************* LOW LEVEL FUNCTIONS ********************
 *******************************************************************/
async function callback_response(_message, _content, _ackOrNack) {
    if(_message.properties.messageId == msgId){
        try {
            alert.success("callback_response()", `recibido: ${_content}`)
            result = JSON.parse(_content)
            encrypt.hybrid_decrypt(result.encryptedData, result.encryptedPass, result.encryptedIv, privateKey)
            _ackOrNack()
        } catch (error) {
            alert.error(`callback_response(...)`, error)
        }
    }
}