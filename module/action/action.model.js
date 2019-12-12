'use strict';

const mongoose = require('mongoose');

const ActionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    type: {
        type: String
    },
    pubkey: {
        type: String
    },
    signature: {
        type: String
    },
    op: {
        type: Number
    },
    data: {
        type: {}
    }
}, {
    timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    }
});

const actionSchema = mongoose.model('Action', ActionSchema);

module.exports = actionSchema;
