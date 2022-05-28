'use strict'

const coretool = require('core.tool')
const Sys_Code_Name = 'ext'

module.exports = {
  // 全大写字母的，代表系统常量，不要在 userConfig 或命令行参数里覆盖。小写驼峰的，是用户可以覆盖的。
  Commander_Option_List: [
    // 命令行里可以接受的参数。将传给 config.js 里的 commander。每个参数的定义格式是 [参数名，参数键，描述]，后两者用于传给commander，取值后覆盖掉Config里的同名变量。
    ['Data_Store', '-d, --Data_Store <string>', 'Permanent storage in JSON string.'],
    ['Base_Hostname', '-H, --Base_Hostname <string>', 'Host ip or domain name.'],
    ['Base_Port', '-p, --Base_Port <number>', 'HTTP port number.'],
    ['Base_Protocol', '-P, --Base_Protocol <string>', 'Base server protocol: http|https|httpall.'],
    ['Base_Ssl', '--Base_Ssl <string>', 'SSL options in JSON string.'],
  ],

  Base_Protocol: 'http', // http|https|httpall
  Base_Hostname: 'localhost', // 本节点的从外部可访问的 IP or Hostname，用于告知邻居节点怎样连接本机。因此不能是 127.0.0.1 或 localhost
  Base_Port: 6000 + parseInt(coretool.name2port(Sys_Code_Name)), // 本节点的 Web服务端口号
  // 数据库设置
  Data_Store: { type: 'sqlite', database: `_datastore/db.sqlite` },
  // Log_Store: { type: 'file', root: '_logstore', file: 'ext-server.log' }, // 换用 pm2 的日志记录

  File_Store: '_filestore',

  ENV_PRODUCTION: {
    Base_Protocol: 'https',
    Base_Hostname: `${Sys_Code_Name}-server.bittic.org`,
    Base_Ssl: {
      type: 'file', // file
      file: {
        key: 'ssl/privkey.pem', // ssl key file,
        cert: 'ssl/fullchain.pem', // ssl cert file,
        ca: '', // ssl ca file,
      },
    },
  },
}