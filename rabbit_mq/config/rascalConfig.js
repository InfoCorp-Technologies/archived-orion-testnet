module.exports = {
    vhosts: {
        "/": {
            connection: {
                heartbeat: 1,
                socketOptions: {
                    timeout: 1000
                }
            },
            exchanges: ["request", "response"],
            queues: ["request", "response"],
            bindings: [
                "request -> request",
                "response -> response"
            ],
            publications: {
                "request": {
                    "exchange": "request"
                },
                "response": {
                    "exchange": "response"
                }
            },
            subscriptions: {
                "request": {
                    "queue": "request"
                },
                "response": {
                    "queue": "response"
                }
            }
        }
    }
}