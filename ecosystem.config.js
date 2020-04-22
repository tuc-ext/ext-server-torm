module.exports = {
  apps : [{
    name: 'log.server',
    script: 'server.js',

    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }],

  deploy : {
    production : {
      user : 'adot',
      host : 'killer-sDeb10-vMac.local', // or [...]
      ref  : 'origin/master',
      repo : 'https://git.faronear.org/tac/log.server.oo',
      path : '/faronear/log.server',
      'pre-setup': null,
      'post-setup': null,
      'pre-deploy-local': null,
      'post-deploy' : 'cnpm install && npm run daemon.pm2 && npx pm2 log'
    }
  }
};
