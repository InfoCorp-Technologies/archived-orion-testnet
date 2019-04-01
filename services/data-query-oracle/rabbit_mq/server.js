/************************* USED LIBRARIES **************************
 *******************************************************************/
const rascal = require("./libraries/rascal")
const alert = require("./libraries/alert")
const encrypt = require("./libraries/encrypt")
const request = require('request-promise')

/************************* GLOBAL VARIABLES ************************
 *******************************************************************/
const {
    //crosspay database url
    databaseUrl
} = require('./config/config')
const rascalConfig = require('./config/rascalConfig');

/************************* MAIN FUNCTION CALL ********************
 *******************************************************************/
manage_request(rascalConfig, "request", databaseUrl);

/************************* HIGH LEVEL FUNCTIONS ********************
 *******************************************************************/
/**
 * @function manage incoming request publishing encrypted response
 * @param {*} _subscription
 * @param {*} _databaseUrl
 */
async function manage_request(_rascalConfig, _subscription, _databaseUrl) {
    try {
        const broker = await rascal.connect(_rascalConfig);
        const subscription = await rascal.subscribe(broker, _subscription)
        subscription.on('message', async function (_message, _content, _ackOrNack) {
            alert.success("manage_request", `Recieved: ${_content}, msgId: ${_message.properties.messageId}`)
            const apiResponse = await call_api(_content.livestockId, _databaseUrl)
            const encryptedData = encrypt.hybrid_encryption(JSON.stringify(apiResponse), _content.publicKey)
            const publication = await rascal.publish(broker, "response", JSON.stringify(encryptedData), _message.properties.messageId)
            publication.on("success", () => _ackOrNack())
        })
    } catch (error) {
       alert.error("manage_request", error)
    }
}


/************************* LOW LEVEL FUNCTIONS **********************
 *******************************************************************/
/**
 * @function call_api
 * @param {string} _url: endpoint of the API call
 * @returns: Body of the API response.
 */
async function call_api(_livestockId, _databaseUrl) {
    try {
        const url = `${_databaseUrl}/${_livestockId}`
        const body = await request.get(url, {
            json: true
        })
        alert.success(`call_api(${_livestockId})`, `BODY:` +
            `${JSON.stringify(body).substring(0,35)}...}`)
        return body
    } catch (error) {
        alert.error("cacthed on call_api()", error)
        return null
    }
}