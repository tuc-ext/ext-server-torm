'use strict'

module.exports = {
  // 全大写字母的，代表系统常量，不要在 userConfig 或命令行参数里覆盖。小写驼峰的，是用户可以覆盖的。
  commanderOptions: [
    // 命令行里可以接受的参数。将传给 config.js 里的 commander。每个参数的定义格式是 [参数名，参数键，描述]，后两者用于传给commander，取值后覆盖掉Config里的同名变量。
    ['datastore', '-d, --datastore <string>', 'Datastore for permanent storage in JSON string.'],
    ['env', '--env <string>', 'Runtime environment: production|development.'],
    ['host', '-H, --host <string>', 'Host ip or domain name.'],
    ['protocol', '-P, --protocol <string>', 'Web Server protocol: http|https|httpall.'],
    ['port', '-p, --port <number>', 'HTTP port number.'],
    ['ssl', '--ssl <string>', 'SSL options in JSON string.'],
  ],

  protocol: 'http', // http|https|httpall
  host: 'localhost', // 本节点的从外部可访问的 IP or Hostname，用于告知邻居节点怎样连接本机。因此不能是 127.0.0.1 或 localhost
  port: 60564, // 本节点的 Web服务端口号
  // 数据库设置
  datastore: { type: 'sqlite', database: 'database/log.sqlite' },

  ETHERSCAN_APIKEY: '测试发现，其实胡编的也可以用，不管对主网还是测试网。但只有访问主网的apikey使用才会被etherscan记录。',
  ETH_NETTYPE: 'ropsten',
  ETH_TOKEN_INFO: {
    USDT_ON_ETH: {
      // created by myself in Ethereum's testnet 'ropsten'
      contract: '0xb16815dbeceb459d9e33b8bba45ed717c479ea1c',
      owner: '0xe72ba549597aec145b2ec62b99928bd8d1d16230',
    },
  },
  EPOCH: '2020-05-25T16:00:00.000Z', // 原为3/25
  depositCoinSet: {
    USDT_ON_ETH: { name: 'USDT', exchangeRate: 1000 },
    // USDT_ON_BTC: { name:'USDT(BTC)', exchangeRate: 1000 },
    // BTC: { name:'BTC', exchangeRate: 6000000 },
    // ETH: { name:'ETH', exchangeRate: 15 },
  },
  withdrawCoinSet: {
    LOG: { name: 'LOG', exchangeRate: 1 },
    USDT_ON_ETH: { name: 'USDT', exchangeRate: 1000 },
  },
  COMMUNITY_REWARD: 5,
  PROFIT_RATE: 0.05,
  FEE_RATE: 0.005,
  TAX_RATE: 0.005,

  production: {
    protocol: 'https',
    host: 'server.log.yuanjin.net',
    ssl: {
      type: 'file', // file
      file: {
        key: 'ssl/privkey.pem', // ssl key file,
        cert: 'ssl/fullchain.pem', // ssl cert file,
        ca: '', // ssl ca file,
      },
    },

    ETHERSCAN_APIKEY: '9M4QGPUVYPG5G9BIM5EJ96IA6TARPGZRBX',
    ETH_NETTYPE: undefined,
    ETH_TOKEN_INFO: {
      USDT_ON_ETH: { contract: '0xdac17f958d2ee523a2206206994597c13d831ec7' },
      EURT_ON_ETH: { contract: '0xabdf147870235fcfc34153828c769a70b3fae01f' },
      CNHT_ON_ETH: { contract: '0x6e109e9dd7fa1a58bc3eff667e8e41fc3cc07aef' },
    },
  },

  /* 数据库，HTTP 等设置（与时光链本身无关） */
  HTTP_BODY_LIMIT: '50mb',
  UPLOAD_LIMIT: 1048576, // 单位: Byte。
  SESSION_LIFETIME: 60 * 60 * 24 * 7, // 一星期
}
