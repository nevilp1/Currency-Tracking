import 'dotenv/config';
import {
    Client,
    GatewayIntentBits,
    EmbedBuilder
} from 'discord.js';

import {
    startExchangeScheduler
} from './scheduler/exchangeScheduler.js';
import {
    getBCARates
} from './services/exchangeService.js'

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

    startExchangeScheduler(client);
});

client.login(process.env.DISCORD_TOKEN);

client.on('messageCreate', async (message) => {
    if (message.content === 'infokurs') {
        const data = await getBCARates();

        if (data && data['USD']) {
            const rateEmbed = new EmbedBuilder()
                .setColor(0x00569c) // Official BCA Blue
                .setTitle('BCA Exchange Rates (USD)')
                .setURL('https://www.bca.co.id/id/informasi/kurs')
                // Using standard bold fields to make the rates dominant
                .addFields(
                    { name: 'Buy Rate', value: data['USD'].buy, inline: true },
                    { name: 'Sell Rate', value: data['USD'].sell, inline: true }
                )
                // Secondary information section
                .addFields({
                    name: 'Quick Guide',
                    value: '• **Buy Rate:** Bank buys from you\n• **Sell Rate:** Bank sells to you'
                })
                .setTimestamp()
                .setFooter({ text: 'Data directly scraped from BCA' });

            await message.channel.send({ embeds: [rateEmbed] });
        } else {
            await message.channel.send("Failed to retrieve current rates.");
        }
    }
});