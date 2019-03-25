/************************* USED LIBRARIES **************************
 *******************************************************************/
const rascal = require("./libraries/rascal.js")
const alert = require("./libraries/alert.js")

/************************* GLOBAL VARIABLES ************************
 *******************************************************************/
const msgId = process.argv[2] ? process.argv[2] :"1234"
const {
    livestockId,
    publicKey
} = require('./config/config')

const requestObj = {
    livestockId: livestockId,
    publicKey: publicKey
}
const rascalConfig = require('./config/rascalConfig');

/************************* MAIN FUNCTION CALL ********************
 *******************************************************************/
send_to_rpc("request", requestObj, msgId);

/************************* HIGH LEVEL FUNCTIONS ********************
 *******************************************************************/
async function send_to_rpc(_publication, _message, _messageId) {
    try {
        const broker = await rascal.connect(rascalConfig)
        const publication = await rascal.publish(broker, _publication, _message, _messageId)
        publication.on("success", () => alert.success(`send_to_rpc(${_publication}, _message, ${_messageId})`))
    } catch (error) {
        alert.error(`send_to_rpc(${_publication}, _message, ${_messageId})`, error)
    }
}

