'use strict';

const { inject } = require('./Provider');
const mongoose = require('mongoose');

const closeDBConnection = async () => {
    await mongoose.disconnect();
    process.exit(0);
};

process.on('SIGTERM', closeDBConnection);
process.on('SIGINT', closeDBConnection);

module.exports = () => new Promise((resolve, reject) => {
    inject(function connect2db (SysConfig) {
        mongoose.set('useCreateIndex', true);
        const { DB_USER_NAME, DB_PASSWD, DB_HOST, DB_PORT, DB_NAME } = SysConfig;
        if (!(DB_HOST && DB_PORT && DB_NAME)) {
            throw new Error('Missing required db connection config');
        }
        const db = mongoose.connection;
        db.on('error', err => {
            mylog.error(err);
            reject(err);
        });
        db.once('open', function () {
            mylog.info('数据库连接成功...');
            resolve(db);
        });
        mylog.info('开始连接数据库...');
        mongoose.connect(`mongodb://${DB_USER_NAME}:${DB_PASSWD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`, {
            useNewUrlParser: true,
            bufferMaxEntries: 0,
            autoReconnect: true,
            useFindAndModify: false,
            useUnifiedTopology: true
        });
    });
});
