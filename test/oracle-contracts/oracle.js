const Oracle = artifacts.require('Oracle');
const assert = require('chai').assert;
const truffleAssert = require('truffle-assertions');

contract('Oracle', async (accounts) => {
    let oracle;

    const OWNER_ACCOUNT = accounts[0];
    const ORACLE_ACCOUNT = accounts[1];

    const USER = 'user';
    const ATTESTATOR = 'attestator';
    const LIVESTOCK = 'livestock';
    const API_MAP = {
        'user': 'http://104.211.59.231/user/',
        'attestator': 'http://104.211.59.231/attestator/',
        'livestock': 'http://104.211.59.231/livestock/'
    };

    const WALLET_ADR = '1BJqxEK6cEeuNvsxQS2Fs1CjSi7wLXJiJ8i6oq';

    const PUBKEY = '-----BEGIN PUBLIC KEY-----\r\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAhduRshn7DGqtLZQxtJdu\r\nwwp/oY2LLwgd0l/3ejhScZtw8XOC4z380O3uG9NMIJOKnrIpU3og0EN1uEkL8tNY\r\n1YpfnrdHQYS1C+cJuv4f8wh2/p3BtczyaXS8M+VEZR9aPniVoT6HMYi9gqLvPhVx\r\n3qGD91Wixm38VEUXhBy+imB0XyxDLy5qsq3YLCBqTSsA/c7ihsTbHoGh/GBHmOgB\r\nzz2TGPypb90UiJSLWIPAzy85TC+jtUAM4TvzMO1T8lCud6ONQJ7syPcdw/xvE6ka\r\ne3lcccQMjP5XEpRaV5QQR6JwotQLEH19r6ALLDtmwX0EMOAp9VVPfpwbnqXkaQEP\r\nmQIDAQAB\r\n-----END PUBLIC KEY-----\r\n';

    const RESULT = '{data: "data"}';

    beforeEach(async function () {
        oracle = await Oracle.new(OWNER_ACCOUNT, ORACLE_ACCOUNT);
    });

    it('testAPI', async function () {
        let actual1 = await oracle.api.call(USER);
        let expected1 = API_MAP[USER];
        assert.strictEqual(actual1, expected1);

        let actual2 = await oracle.api.call(ATTESTATOR);
        let expected2 = API_MAP[ATTESTATOR];
        assert.strictEqual(actual2, expected2);

        let actual3 = await oracle.api.call(LIVESTOCK);
        let expected3 = API_MAP[LIVESTOCK];
        assert.strictEqual(actual3, expected3)
    });

    it('testQuery', async function () {
        let tx = await oracle.query(USER, WALLET_ADR, PUBKEY);
        truffleAssert.eventEmitted(tx, 'Query', (ev) => {
            return ev.queryid && ev.url === (API_MAP[USER] + WALLET_ADR) && ev.pubkey === PUBKEY;
        })
    });

    it('testCallbackWithValidQuery_usingValidOracleAccount', async function () {
        let queryTx = await oracle.query(USER, WALLET_ADR, PUBKEY);
        let queryEv = null;
        truffleAssert.eventEmitted(queryTx, 'Query', async (ev) => {
            queryEv = ev;
            return ev.queryid && ev.url === (API_MAP[USER] + WALLET_ADR) && ev.pubkey === PUBKEY;
        }); // this function is synchronized with the context

        assert.isNotNull(queryEv, 'ERROR: Missed catching Query event');

        if (queryEv) {
            let callbackTx = await oracle.callback(queryEv.queryid, RESULT, { from: ORACLE_ACCOUNT });
            truffleAssert.eventEmitted(callbackTx, 'Result', (ev) => {
                return ev.queryid === queryEv.queryid && ev.result === RESULT;
            });
        }
    });

    it('testCallback_invalidQueryId', async function () {
        let invalidQueryId = 0; // non-existent queryId
        try {
            await oracle.callback(invalidQueryId, RESULT, { from: ORACLE_ACCOUNT });
        } catch (err) {
            assert.ok(err instanceof Error);
        }
    });

    it('testCallbackWithValidQuery_notUsingOracleAccount', async function () {
        let queryTx = await oracle.query(USER, WALLET_ADR, PUBKEY);
        let queryEv = null;
        truffleAssert.eventEmitted(queryTx, 'Query', async (ev) => {
            queryEv = ev;
            return ev.queryid && ev.url === (API_MAP[USER] + WALLET_ADR) && ev.pubkey === PUBKEY;
        }); // this function is synchronized with the context

        assert.isNotNull(queryEv, 'ERROR: Missed catching Query event');

        if (queryEv) {
            try {
                await oracle.callback(queryEv.queryid, RESULT, { from: OWNER_ACCOUNT }); // not using ORACLE_ACCOUNT
            } catch (err) {
                assert.ok(err instanceof Error);
            }
        }
    });
});
