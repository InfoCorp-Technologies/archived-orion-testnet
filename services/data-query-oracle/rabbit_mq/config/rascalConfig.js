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
            queues: {
                "request": {
                    "options": {
                        "durable": true,
                        "exclusive": false
                    }
                },
                "response": {
                    "options": {
                        "durable": true,
                        "exclusive": false
                    }
                }
            },
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