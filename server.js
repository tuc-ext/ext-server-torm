'use strict';

const fs = require('fs');
const app = require('./app.js');
const Socket = require('socket.io');
const inject = require('./framework/Provider').inject;
// const cluster = require('cluster')

module.exports = () => inject(function runServer (SysConfig) { // 配置并启动 Web 服务
    mylog.info('Starting Server');

    /** * 启动 Web 服务 ***/
    SysConfig.port = parseInt(SysConfig.port) || (SysConfig.protocol === 'http' ? 80 : SysConfig.protocol === 'https' ? 443 : undefined);
    const protocol = SysConfig.protocol;
    const serverConfig = protocol === 'https' ? {
        key: fs.readFileSync(SysConfig.sslKey),
        cert: fs.readFileSync(SysConfig.sslCert)
    } : {};
    const webServer = require(protocol).createServer(serverConfig, app).listen(SysConfig.port, function (err) {
        if (err) mylog.info(err);
        else mylog.info(`Server listening on ${SysConfig.protocol}://${SysConfig.host}:${SysConfig.port} with  for ${app.settings.env} environment`);
    });
    // const socket = Socket(webServer);
    return webServer;
});
