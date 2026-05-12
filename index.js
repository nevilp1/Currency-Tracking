import 'dotenv/config';

import {
    Client,
    GatewayIntentBits
} from 'discord.js';

import {
    startExchangeScheduler
} from './scheduler/exchangeScheduler.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

    startExchangeScheduler(client);
});

client.login(process.env.DISCORD_TOKEN);