import cron from 'node-cron';

import {
    EmbedBuilder
} from 'discord.js';

import {
    getBCARates
} from '../services/exchangeService.js';

export function startExchangeScheduler(client) {

    cron.schedule(
        '53 23 * * *',
        async () => {
            const channel = await client.channels.fetch(
                process.env.CHANNEL_ID
            );

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

                await channel.send({ embeds: [rateEmbed] });
            } else {
                await channel.send("Failed to retrieve rates. Please try again later.");
            }
        },
        {
            timezone: 'Asia/Jakarta'
        }
    );
}