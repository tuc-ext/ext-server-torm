'use strict';

const Action = require('./Action.model');
const { Injectable } = require('@src/framework/Provider');

@Injectable()
class ActionService {
    constructor () { }

    createAction (actCode, data) {
        switch (actCode) {
        case 0: return createTransferAction(data);
        }
    }
}

module.exports = ActionService;
