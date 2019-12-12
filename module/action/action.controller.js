'use strict';

const { Controller, Get, Post } = require('@src/framework/router');
const ActionService = require('./action.service');

@Controller('action')
class ActionController {
    constructor () {
        this.service = new ActionService();
    }
}

module.exports = ActionController;
