'use strict';
const path = require('path');
const app = require('express')();
const { mount } = require('./framework/router');

/** * 通用中间件 ***/
app.use(require('morgan')(app.get('env') === 'development' ? 'dev' : 'combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').json({ limit: '50mb', extended: true }));
app.use(require('cors')());
app.use(require('compression')());
app.use(require('express').static(path.join(__dirname, '../dist'), { index: 'index.html' }));
app.use('/static', require('express').static('userImages'));
app.use(require('helmet')());

app.all('*', function (req, res, next) {
    res.setHeader('Access-Control-Expose-Headers', 'token');
    next();
});

// 初始化所有路由
mount(app);

if (app.get('env') === 'development') {
    app.use(require('errorhandler')({
        dumpExceptions: true,
        showStack: true
    }));
}

module.exports = app;
