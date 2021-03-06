const Express = require('express');
const Axios = require('axios');


class Client {
  constructor(client, secret, autopostStats, webhookPort, webhookPath) {
    this.base_url = 'https://disbots.gg';

    // require and validate client
    if (typeof(client) != 'object' || !client.guilds) {
      throw new TypeError('argument "client" should be of the type "Discord.Client"');
    }
    this.client = client;

    // require and validate secret
    if (typeof(secret) != 'string') {
      throw new TypeError('argument "secret" should be of the type "string"');
    }

    // optionalize and validate/uniform autopostStats
    this.autopostStats = Boolean(autopostStats);
    // if autopostStats make it post the count to api every 30 min
    client.on('ready', () => {
      if (this.autopostStats) {
        const postTime = 1000 // 30*60*1000
        //If no shard, just send it
        if (this.client.shard === undefined) setInterval(this.postServerCount, postTime, this.client.guilds.cache.size, secret); // *60*1000
        // if shard, get all values, then send
        else setInterval(() => function {
          this.client.shard.fetchClientValues('guilds.cache.size').then(results => {
            this.postServerCount(results.reduce((acc, guildCount) => acc + guildCount, 0), secret)
          })
        }, postTime)
      }
    });

    // optionalize and validate webhookPort
    if (webhookPort && typeof(webhookPort) != 'number') {
      throw new TypeError('argument "webhookPort" should be of the type "number"');
    }

    // validate range
    if (webhookPort < 1 || webhookPort > 65535) {
      throw new RangeError('argument "webhookPort" should be a number between 1 and 65535');
    }
    this.webhookPort = webhookPort;

    // optionalize and set webhookPath if webhooks are gonna be a thing and webhookPath isn't already set
    if (!webhookPath && webhookPort) {
      webhookPath = '/disbots_hook';
    }

    // validate webhookPath
    if (typeof(webhookPath) != 'string') {
      throw new TypeError('argument "webhookPath" should be of the type "string"');
    }
    this.webhookPath = webhookPath;

    // webhook listener will be set up
    if (webhookPort) {
      this.webhook_server = Express();

      this.webhook_server.post(this.webhookPath, (req, res, next) => {
        if (req.get('Authorization') != this.secret) {
          res.status(401).end();
          return;
        }

        let data = req.body;

        if (req.body.type == 'like') {
          this.client.emit('disbots_like', data);
        } else {
          this.client.emit('disbots_test', data);
        }
      });

      this.webhook_server.listen(this.webhookPort, () => {});
    }
  }

  postServerCount(serverCount, secret) {
    if (!serverCount) {
      throw new TypeError('argument "serverCount" should be of the type "number" or be a number inside a string');
    }

    Axios.put('https://disbots.gg/api/stats', {servers: '123'}, {headers: {Authorization: secret}})
    .then(res => {
      return {success: true, message: 'Posted server count to the API sucessfully', response: res};
    })
    .catch(e => {
      if (e.response) {
        if (e.response.status == 401) throw new Error('401 Unauthorized (Your secret is invalid)');
      }

      throw new Error(`Unknown error occurred: ${e}`);
    });
  }
}

module.exports.Client = Client;
