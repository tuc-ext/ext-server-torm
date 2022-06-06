# ext-server-torm ｜ 永存.服务端.torm

导航路径 [Organizations](https://git.faronear.org/explore/organizations)

- 应用链 [tuc/_tuc](https://git.faronear.org/tuc/_tuc)
  - 永存 [tuc-ext/ext](https://git.faronear.org/tuc-ext/ext)
    - **<font size=5>服务端.torm [tuc-ext/ext-server-torm](https://git.faronear.org/tuc-ext/ext-server-torm)</font>**

---
## 备注

- NFT: 记录创作、转让的交易。OwnerAction
- Action: 记录NFT的付费解密的交易。VisitorAction
- Coin: 记录资金流转的交易

第一次创作：要提供 cid 作为证明
转让：要提供买家和卖家各自的签名

解密：提供支付证明。

## 兼容
- win11 + node16|17.2 + python 3.9.9: fail at bcrypto. 
- win11 + node16|17.2 (+ python 3.9.9 可选已装或未装，不影响) + python 2.7.16(手工安装): pass! 似乎编译bcrypto时会去 C:\python27\ 目录下找 python.exe
- win11 + node14 + python 3.9.9｜2.7.16｜同时存在: pass
- deb11 + node16 + python 2.7.18: pass 
- mac10.15 + node14|16 + python 2.7.16: pass
