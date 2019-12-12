'use strict';
const User = require('./user.model');
const { Injectable } = require('@src/framework/Provider');

@Injectable()
class UserService {
    // eslint-disable-next-line no-unused-vars
    constructor (SysConfig) {
        this.SysConfig = SysConfig;
    }

    async getUserInfo (userId) {
        return User.findById(userId, 'id nickname phone inviteCode inviter').then(user => {
            return [user, null];
        }).catch(err => {
            return [null, err.errmsg];
        });
    }
}

module.exports = UserService;
