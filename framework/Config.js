const fs = require('fs');
const commander = require('commander');
const deepmerge = require('deepmerge');

class Config {
    constructor () {
        mylog.info('[Config]初始化配置: 依次载入系统配置、用户配置、命令行参数');
        this.VERSION = '0.0.1';
        this._config = {};
        this.loadConfigFile();
        this.loadCommander();
    }

    static getInstance () {
        if (!Config.instance) {
            Config.instance = new Config();
        }
        return Config.instance;
    }

    loadConfigFile () {
        // 读取配置文件
        try {
            // CAUTION!!! fs.existsSync的base在文件根目录下！！！！
            if (fs.existsSync('baseConfig.js')) {
                this._config = require('../../baseConfig.js');
                mylog.info('基本配置加载完成');
            }
            if (fs.existsSync('secConfig.js')) { // 如果存在，覆盖掉 ConfigBasic 里的默认参数
                this._config = deepmerge(this._config, require('../../secConfig.js')); // 注意，objectMerge后，产生了一个新的对象，而不是在原来的Config里添加
                mylog.info('隐私配置加载完成');
            }
        } catch (err) {
            throw new Error('配置加载出错: ' + err.message);
        }
        return this._config;
    }

    loadCommander () {
        commander
            .version(this.VERSION, '-v, --version')
            .option('--dbType <type>', 'Database type: mysql|sqlite. ')
            .option('--dbName <name>', 'Database name')
            .option('-H, --host <host>', 'Host ip or domain name. ')
            .option('-P, --protocol <protocol>', 'Server protocol: http|https|httpall. ')
            .option('-p, --port <port>', 'Server port number.')
            .option('--sslType <type>', 'SSL provider type: file|greenlock')
            .option('--sslCert <cert>', 'SSL certificate file. ')
            .option('--sslKey <key>', 'SSL private key file. ')
            .option('--sslCA <ca>', 'SSL ca bundle file')
            .parse(process.argv);

        // 把命令行参数 合并入配置。
        this._config.dbType = commander.dbType || this._config.dbType;
        this._config.dbName = commander.dbName || this._config.dbName;
        this._config.protocol = commander.protocol || this._config.protocol;
        this._config.port = parseInt(commander.port) || parseInt(this._config.port) || (this._config.protocol === 'http' ? 80 : this._config.protocol === 'https' ? 443 : undefined); // 端口默认为http 80, https 443, 或80|443(httpall)
        this._config.sslCert = commander.sslCert || this._config.sslCert;
        this._config.sslKey = commander.sslKey || this._config.sslKey;
        this._config.sslCA = commander.sslCA || this._config.sslCA;
    }

    get config () {
        return this._config;
    }
}

module.exports = Config.getInstance();
