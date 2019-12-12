'use strict';
const { Controller, Get, Post } = require('@src/framework/router');
const UserService = require('./user.service');

@Controller('user')
class UserController {
    constructor () {
        this.service = new UserService();
    }

    @Get('/info')
    async getUserInfo (req, res) {
        const { userId } = res.locals.user;
        const [data, error] = await this.service.getUserInfo(userId);
        if (data) {
            return res.json({
                code: 0,
                msg: 'success',
                data
            });
        } else {
            return res.json({
                code: 1,
                error
            });
        }
    }
}

module.exports = UserController;
