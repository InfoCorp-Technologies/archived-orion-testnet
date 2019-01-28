const alert = require("./alert")
var Rascal = require('rascal');
module.exports = {

    /**
     * @function connects to a rabbitMQ server with default confg,
     * it can be overwitten in rascalConfig file. 
     * @param {*} _rascalConfig 
     */
    connect: async function (_rascalConfig) {
        try {
            if(!_rascalConfig)
                _rascalConfig = NULL
            const broker = await Rascal.BrokerAsPromised.create(Rascal.withDefaultConfig(_rascalConfig));
            broker.on('error', (error) => alert.error(`connect(${_rascalConfig ? "_rascalConfig" : NULL})`, error))
            return broker;
        } catch (error) {
            alert.error(`catched on connect(${_rascalConfig ? "_rascalConfig" : NULL})`, error)
        }
    },
    /**
     * @returns instance to a subscription.
     * @param {*} _broker 
     * @param {*} _subscription 
     */
    subscribe: async function (_broker, _subscription) {
        try {
            const subscription =  await _broker.subscribe(_subscription);
            subscription.on('error',(error) => alert.error(`subscribe(${_broker? "broker" : "undefined broker"}, ${_subscription})`, error))
            return subscription
        } catch (error) {
            alert.error(`catched on subscribe(${_broker? "broker" : "undefined broker"}, ${_subscription})`, error)
        }
    },
    /**
     * Sends _message to a _publication with _messageId
     * @param {*} _broker 
     * @param {*} _publication 
     * @param {*} _message 
     * @param {*} _correlationId 
     */
    publish: async function(_broker, _publication, _message, _correlationId){
        try {
            const publication = await _broker.publish(_publication,_message, {
                options: {
                    messageId: _correlationId,
                }
            })
            publication.on('error',(error)=> alert.error(`publish(${_broker? "broker" : "undefined broker"}, ${_publication}, ${JSON.stringify(_message).slice(0, 15)}, ${_correlationId})`, error))
            return publication
        } catch (error) {
            alert.error(`catched on publish(${_broker? "broker" : "undefined broker"}, ${_publication}, ${JSON.stringify(_message).slice(0, 15)}, ${_correlationId})`, error)
        }
    },
};

