'use strict';

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    address: {
        type: String
    },
    pubkey: {
        type: String
    },
    password: {
        type: String
    },
    nickname: {
        type: String
    },
    mfa: {
        type: {}
    },
    option: {
        type: {}
    }
}, {
    timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    }
});

const UserModel = mongoose.model('User', UserSchema);

module.exports = UserModel;
