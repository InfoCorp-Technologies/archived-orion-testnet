const { ERROR_MSG } = require('../setup')
const Oracle = artifacts.require('DataQuery');
const assert = require('chai').assert;
const truffleAssert = require('truffle-assertions');

contract('Oracle', async (accounts) => {
    let oracle;
    const OWNER_ACCOUNT = accounts[0];
    const ORACLE_ACCOUNT = accounts[1];

    const LIVESTOCK_ID = '1UoDLyX3PWrCsWW1aB6ChpxFC8qY2z72W8Tdqj'
    const RESULT = '{"encryptedKey":"spLsTPtpqVvUE+MVBcdZmkkLX+Ntvwh89YlgHjkYzIamkR4d6UA4mDamIwT6a2olt3o/ktknCAUNG3PTR3Sfd0LOWISA6HO+zmk7l6BdjCNyVLlmJ6gXbLWgo3S/0jUio5l+PFNKHlplin835pkjD1rbnYZUy9sbD0clMds8TTrl3ufk1gBn1FA1LDlRxiYysdPQDc49Si3ckNJpebvS+Q1DDenjTKRYmhfauT5TNdIpTZ5hpV6rwtqqYdgsq8w/dVIPWFTg+xf/1+k3DIMjNpunk+LeBEDB18Cdq5xZYqPCjZ0qoNBtjDfiWeQiTvV3ci82jGdPRO53YqDo8+1Z9pnpPjOWf3gSgoUb96N4GQ+wrlHHDShO3beRygQJSCYz2Ei5NaO9u3qiFnxjTWkWvazTsHilFsiorGOHJeCAWq4nGZcGbrfE/rmToxqbB3E7aQjIJi+RAf9T3ODG7a+I8hs3jpXCrvz+GyrX1lNCkEn3qLi2RQuMnjsP6yrO8qX2ID5LfLNYzMnVuRbnrzHhGKBrtcPGuYcBjWHJv4e8vJS5xIk+y0YtG3L/aY9p+8rZlbnETB21D5i4Db0+ZDpRYdrXaSt9rWqiKuhVK6REc8tJGhyd9QbPp3ftwtRD75ZYWGfh0w5mfweGfv0XEXBuY+gj6Xj8AHn4QiDg/NL1Kzs=","encryptedData":"66a1d2b09643e432b3f44efdbeda1cc6b04de56a09b0ba139344608ddeb5aa57eab674cf448bc416c52f8a0888cd2149d0c75e917c7e450109432a2d8eed4a088d4e1485feb90d7affc28e196af9571c78d686a42a082b16a197bf12a0707f617abe8ca3bf815dec3f3a80e401bb198de4dde760188f144164c27cae4e62b46527d14f5f7fd28576bbdcff538c164c39bbbcdda25963a6e847ff5bf351d9647e39ffb7af4b5f72e5488ba3bc883376"}'

    const PUBKEY = '-----BEGIN PUBLIC KEY-----\r\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAhduRshn7DGqtLZQxtJdu\r\nwwp/oY2LLwgd0l/3ejhScZtw8XOC4z380O3uG9NMIJOKnrIpU3og0EN1uEkL8tNY\r\n1YpfnrdHQYS1C+cJuv4f8wh2/p3BtczyaXS8M+VEZR9aPniVoT6HMYi9gqLvPhVx\r\n3qGD91Wixm38VEUXhBy+imB0XyxDLy5qsq3YLCBqTSsA/c7ihsTbHoGh/GBHmOgB\r\nzz2TGPypb90UiJSLWIPAzy85TC+jtUAM4TvzMO1T8lCud6ONQJ7syPcdw/xvE6ka\r\ne3lcccQMjP5XEpRaV5QQR6JwotQLEH19r6ALLDtmwX0EMOAp9VVPfpwbnqXkaQEP\r\nmQIDAQAB\r\n-----END PUBLIC KEY-----\r\n';

    beforeEach(async function () {
        oracle = await Oracle.new(ORACLE_ACCOUNT, {
            from: OWNER_ACCOUNT
        })
    });

    it('testing Query', async function () {
        let tx = await oracle.query(LIVESTOCK_ID, PUBKEY);
        truffleAssert.eventEmitted(tx, 'Query', (ev) => {
            return ev.queryId && ev.livestockId === LIVESTOCK_ID && ev.pubkey === PUBKEY;
        })
    });

    it('testing Callback With Valid Query using Valid Oracle Account', async function () {
        let queryTx = await oracle.query(LIVESTOCK_ID, PUBKEY);
        let queryEv = null;
        truffleAssert.eventEmitted(queryTx, 'Query', async (ev) => {
            queryEv = ev;
            return ev.queryId && ev.livestockId === LIVESTOCK_ID && ev.pubkey === PUBKEY;
        });

        assert.isNotNull(queryEv, 'ERROR: Missed catching Query event');

        if (queryEv) {
            let callbackTx = await oracle.callback(queryEv.queryId, RESULT, 0, {
                from: ORACLE_ACCOUNT
            })
            truffleAssert.eventEmitted(callbackTx, 'Result', async (ev) => {
                return ev.queryId === queryEv.queryId && ev.result === RESULT;
            });
        }
    });

    it('test Callback not Using Oracle Account', async function () {
        let queryTx = await oracle.query(LIVESTOCK_ID, PUBKEY);
        let queryEv = null;
        truffleAssert.eventEmitted(queryTx, 'Query', async (ev) => {
            queryEv = ev;
            return ev.queryId && ev.livestockId ===  LIVESTOCK_ID && ev.pubkey === PUBKEY;
        }); // this function is synchronized with the context

        assert.isNotNull(queryEv, 'ERROR: Missed catching Query event');

        if (queryEv) {
            try {
                await oracle.callback(queryEv.queryId, RESULT,0, {
                    from: OWNER_ACCOUNT
                }); // not using ORACLE_ACCOUNT
            } catch (err) {
                assert.ok(err instanceof Error);
            }
        }
    });
});