'use strict'

module.exports = {
  // 全大写字母的，代表系统常量，不要在 userConfig 或命令行参数里覆盖。小写驼峰的，是用户可以覆盖的。
  commanderOptions: [
    // 命令行里可以接受的参数。将传给 config.js 里的 commander。每个参数的定义格式是 [参数名，参数键，描述]，后两者用于传给commander，取值后覆盖掉Config里的同名变量。
    ['datastore', '-d, --datastore <string>', 'Permanent storage in JSON string.'],
    ['host', '-H, --host <string>', 'Host ip or domain name.'],
    ['port', '-p, --port <number>', 'HTTP port number.'],
    ['protocol', '-P, --protocol <string>', 'Web Server protocol: http|https|httpall.'],
    ['ssl', '--ssl <string>', 'SSL options in JSON string.'],
  ],

  protocol: 'http', // http|https|httpall
  host: 'localhost', // 本节点的从外部可访问的 IP or Hostname，用于告知邻居节点怎样连接本机。因此不能是 127.0.0.1 或 localhost
  port: 60824, // 本节点的 Web服务端口号
  // 数据库设置
  datastore: { type: 'sqlite', database: 'database/ubi.sqlite' },
  logstore: { type: 'file', root: 'logbook', file: 'log.txt' },

  production: {
    protocol: 'https',
    host: 'server.ubi.yuanjin.net',
    ssl: {
      type: 'file', // file
      file: {
        key: 'ssl/privkey.pem', // ssl key file,
        cert: 'ssl/fullchain.pem', // ssl cert file,
        ca: '', // ssl ca file,
      },
    },
  },
}
