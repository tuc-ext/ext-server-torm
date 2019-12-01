# node.server
TIC Node | 时光节点.服务端

## GIT项目库导航
* 时光链 [tic/_tic](https://git.faronear.org/tic/_tic)
  * 星云节点 [tic/gnode](https://git.faronear.org/tic/gnode)
      * **<font size=5>服务端 [tic/node.server](https://git.faronear.org/tic/node.server)</font>**
      * 原型 [tic/node.console.design](https://git.faronear.org/tic/node.console.design)
      * 客户端 [tic/node.console.web](https://git.faronear.org/tic/node.console.web)

## 文档资料
* 编程接口 [.doc/API.md](./doc/API.md)

## Installation Guide | 安装指南

### Table of Content

1. [Requirements](#1-requirements)
2. [Preparation](#2-preparation)
3. [Launch](#3-launch)

### 1. Requirements

+ OS

  + It's cross-platform and can be installed in Linux, Windows, MacOS.

+ nodejs

  + For support on installing nodejs, see <https://git.faronear.org/lib/coding/src/master/JavaScript/nodejs.md>

+ git

  + For support on installing git, see <https://git.faronear.org/lib/coding/src/master/git>

+ database
  + By default, node.server uses embeded sqlite for blockchain data, you don't have to install a database. 
  + If you want to use MySQL/Redis/MongoDB, you need to install it.
    + redis: <https://git.faronear.org/lib/redis/src/master/redis.md>

### 2. Preparation

Open a command line interface on your system:
+ Windows: DOS or PowerShell
+ Linux: shell
+ MacOS: xterm

and execute commands below.

2.1 Download source code/下载源码

```
git clone https://git.faronear.org/tic/node.server
cd node.server
git checkout master
```

2.2 Install dependencies/安装依赖

```
npm install
```

2.3 Customize configuration/定制配置
 
Node.server can be configured in following places, while options in a latter place have higher priority over those set in an earlier place.

1. ConfigBasic.js: Default settings which you shouldn't change.
2. ConfigCustom.js: You can customize most options here.
3. ConfigSecret.js: You shall keep secret options here, for instance your secword (i.e. mnemonics).
4. command line options: You can also change some configuration in command line.

In most cases you don't have to change any settings. But if you are running node.server for testnet or mainnet, you MUST setup your secword in ConfigSecret.js:

```
module.exports = {
  ownerSecword: 'put your own secret word here to run tic node server instance',
}
```

特别注意：
+ 如果本节点是接入该网络(dev/test/main)的第一个节点，必须使用定义在 ConfigBasic.js 中的初始挖矿账户。
+ 如果本节点是用于钱包后台运营，请使用定义在 ConfigBasic.js 中的钱包运营账户。

### 3. Launch

+ `npm run dev` for development environment as a standalone devnet on a single local host.

+ `npm run daemon[.sup|.pm2])` is shortcut to a specific TIC net. Currently it runs in testnet. You can use daemon.sup/pm2 to launch in supervisor or pm2.

+ `npm run testnet[.sup|.pm2])` to join the testnet. 

+ `npm run mainnet[.sup|.pm2])` to join the mainnet.

+ `npm run testnet4wallet[.sup|.pm2]` to specifically launch a node server for wallet's bank service.


+ expert mode: You can launch with specific options in command line to override values in config files.
  
  + check available options:
  
    ```
    node server.js -h 
    ```
  
  + run with specific options:
  
    ```
    node server.js -p [port] -c [consensus] -e [epoch] -dbType [dbType] -n [netType] -s [seedSet] ......
    ```
