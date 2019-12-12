const fs = require('fs');
const express = require('express');
const Provider = require('./Provider');
// const middlewares = require('../middleware');
const middlewares = {};
const ROOT_API_PATH = '/api';
const rootRouter = express.Router();

// 如果功能需要在方法装饰器执行完毕后还要依赖类装饰器，则给返回的方法加一个isWrapped属性，如果具有isWrapped的方法，类装饰器内会执行
const wrapFunction = fn => {
    fn.isWrapped = true;
    return fn;
};

// 方法装饰器先执行 类装饰器最后执行
function Controller (controllerPath = '') {
    return target => {
        Provider.inject(target);
        const singleton = new target.prototype.constructor(); // 实例化对象作为路由函数的执行上下文
        const funcs = Object.getOwnPropertyDescriptors(target.prototype);
        const controllerRouter = express.Router();
        for (const func in funcs) {
            // exclude constructor function
            if (func !== 'constructor' && typeof funcs[func].value === 'function') {
                const fn = funcs[func].value;
                if (!controllerPath.startsWith('/')) {
                    controllerPath = '/' + controllerPath;
                }
                fn.isWrapped && fn(controllerPath, singleton, controllerRouter); // 利用GET/POST等装饰其原型方法，this绑定到类实例
            }
        }
        rootRouter.use(controllerRouter);
        return target;
    };
}
function Catch (param) {
    return (target, property, descriptor) => {
        const fn = descriptor.value;
        descriptor.value = wrapFunction((req, res, next) => {
            try {
                Promise.resolve(fn(req, res, next)).catch(err => { throw new Error(err); });
            } catch (error) {
                return res.status(500).json({
                    code: 500,
                    msg: 'Internal Error'
                });
            }
        });
    };
}
function getHttpMethod (method) {
    return (path = '') => function (target, property, descriptor) {
        const fn = descriptor.value;
        descriptor.value = wrapFunction((controllerPath, ctx, router) => {
            if (!path.startsWith('/')) {
                path = '/' + path;
            }
            router[method](`${controllerPath}${path}`, fn.bind(ctx));
            return fn;
        });
    };
}

const mount = app => {
    mylog.info('挂载全局中间件...');
    for (const mw in middlewares) {
        rootRouter.use(middlewares[mw]);
    }
    mylog.info('挂载控制器...');
    fs.readdirSync('./src/module').map(m => {
        // 遍历去require服务，让他们在控制器启动前被实例化后注册在Provider里
        if (fs.existsSync(`./src/module/${m}/${m}.service.js`)) {
            require(`../module/${m}/${m}.service.js`);
        }
        if (fs.existsSync(`./src/module/${m}/${m}.controller.js`)) {
            require(`../module/${m}/${m}.controller.js`);
        }
    });
    app.use(ROOT_API_PATH, rootRouter);
    return app;
};

module.exports = {
    Controller,
    mount: mount.bind(this),
    Put: getHttpMethod('put'),
    Get: getHttpMethod('get'),
    Post: getHttpMethod('post'),
    Delete: getHttpMethod('delete'),
    Catch
};
