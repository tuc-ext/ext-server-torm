'use strict'

const LOG_PORT_STANDARD = 60564

module.exports = { // 全大写字母的，代表系统常量，不要在 userConfig 或命令行参数里覆盖。小写驼峰的，是用户可以覆盖的。
  protocol: 'http', // http|https|httpall
  host: 'localhost', // 本节点的从外部可访问的 IP or Hostname，用于告知邻居节点怎样连接本机。因此不能是 127.0.0.1 或 localhost
  port: LOG_PORT_STANDARD, // 本节点的 Web服务端口号
  tasking: 'single', // single|cluster: 单进程或多进程
  // 数据库设置
  dbType: 'sqlite',
  dbName: 'data.sqlite/log.sqlite',

  ETHERSCAN_APIKEY: '9M4QGPUVYPG5G9BIM5EJ96IA6TARPGZRBX',
  ETH_TOKEN_INFO: {
    USDT: { // created by myself in Ethereum's testnet 'ropsten'
      contract: '0xb16815dbeceb459d9e33b8bba45ed717c479ea1c',
      owner: '0xe72ba549597aec145b2ec62b99928bd8d1d16230',
    }
  },

  production: {
    protocol: 'https',
    host: 'server.log.yuanjin.net',
    sslType: 'file', // file|greenlock
    sslDomainList: ['server.log.yuanjin.net'],
    /* 注意，浏览器认识，但我们自己的后台，比如 钱包后台wallet.server，不认识 letsencrypt 提供的 ssl证书。
    解决办法：  https://stackoverflow.com/questions/31673587/error-unable-to-verify-the-first-certificate-in-nodejs
    简单的解法：  https://www.npmjs.com/package/ssl-root-cas
    sslCert 不要使用 cert.pem，而使用 fullchain.pem, 把所有中间证书都带上，即可！
    */
    sslKey: '/etc/letsencrypt/live/server.log.yuanjin.net/privkey.pem', // ssl key file,
    sslCert: '/etc/letsencrypt/live/server.log.yuanjin.net/fullchain.pem', // ssl cert file,
    sslCA: '', // ssl ca file,

    ETH_TOKEN_INFO: {
      USDT: { contract: '0xdac17f958d2ee523a2206206994597c13d831ec7' },
      EURT: { contract: '0xabdf147870235fcfc34153828c769a70b3fae01f' },
      CNHT: { contract: '0x6e109e9dd7fa1a58bc3eff667e8e41fc3cc07aef' },
    },
  },

    /* 数据库，HTTP 等设置（与时光链本身无关） */
    HTTP_BODY_LIMIT: '50mb',
    UPLOAD_LIMIT: 1048576, // 单位: Byte。
    SESSION_LIFETIME: 60 * 60 * 24 * 7, // 一星期
    // todo: 改名为 DB_*
    LIMIT_DEFAULT: 12,
    LIMIT_MAX: 1000,
    MARK_DELETED: 'MARK_DELETED',
    MARK_LINKED: 'MARK_LINKED', // 建立了关系（care, know, join 等）
    MARK_RELEASED: 'MARK_RELEASED', // 解除了关系（care, know, join 等）  

}
