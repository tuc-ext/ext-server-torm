## Usage: expect this.sh [hostname] [password]

set timeout 30
spawn ssh adot@[lindex $argv 0]
expect {
  "(yes/no)?"
  {send "yes\n";exp_continue}
  "password:"
  {send "[lindex $argv 1]\n"}
  ":~]"
  {send "su\n";exp_continue}
  "Password:"
  {send "[lindex $argv 1]\n"}
  "密码："
  {send "[lindex $argv 1]\ncd /faronear/tac/log.server.oo && git pull && npx pm2 restart all\nexit\nexit\n"}
}
interact
