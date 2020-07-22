#!/usr/bin/expect

## Usage: expect this.sh

set timeout 30
spawn ssh adot@server.log.yuanjin.net
expect {
  "(yes/no)?"
  {send "yes\n";exp_continue}
  "password:"
  {send "yuan&jin52O\n"}
  ":~]"
  {send "su\n";exp_continue}
  "Password:"
  {send "yuan&jin52O\ncd /faronear/tac/log.server.oo && git pull && npx pm2 restart all && npx pm2 log\n"}
}
interact
