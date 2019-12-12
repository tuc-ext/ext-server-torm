'use strict';

const { Injectable } = require('@src/framework/Provider');
const { createToken } = require('../../utils/jwt');
const Crypto = require('../../utils/crypto');
const Lock = require('../../utils/mutexlock');
const lock = new Lock();

@Injectable()
class AuthService {
    // eslint-disable-next-line no-unused-vars
    constructor (SysConfig) { }

    issueToken (data) {
        const { JWT_SECRET } = this.SysConfig;
        return createToken({
            address: data.address,
            pubkey: data.pubkey
        }, JWT_SECRET, {});
    }

    verifyUser (requestBody) {
        const { sig, pubkey, timestamp } = requestBody;
        const address = Crypto.verify(timestamp, sig, pubkey);
        const trueAddress = Crypto.pubkey2address(pubkey, { coin: 'ETH' });
        return address === trueAddress && Date.now() - new Date(timestamp) < 60 * 1000;
    }
}

module.exports = AuthService;
