'use strict';
/**
    在 auth.service.js 中 @Injectable() 装饰器声明 AuthService 类是一个可以由Provider IoC容器管理的类。
    在 auth.controller.js 中 AuthController 声明了一个依赖于 AuthService 令牌(token)的构造函数注入:
 */
const { Controller, Post, Get } = require('@src/framework/router');
const AuthService = require('./auth.service');

@Controller('auth')
class AuthController {
    constructor (AuthService) {
        this.AuthService = AuthService;
    }

    @Post('in')
    signIn (req, res) {
        this.xxyy = 0;
        return this.AuthService.verifyUser(req.body)
            ? res.json({ code: 0, token: AuthService.issueToken(req.body) })
            : res.json({ code: 1, msg: 'authentication failed' });
    }

    @Get('test/:id')
    test (req, res) {
        return res.json(req.params.id);
    }
}

module.exports = AuthController;
