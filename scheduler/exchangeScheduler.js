import cron from 'node-cron';

import {
    EmbedBuilder
} from 'discord.js';

import {
    getUsdToIdr
} from '../services/exchangeService.js';

export function startExchangeScheduler(client) {

    cron.schedule(
        '20 11 * * *',
        async () => {

            const rates = await getUsdToIdr();

            const channel = await client.channels.fetch(
                process.env.CHANNEL_ID
            );

            if (!channel) return;

            const exchangeRateValue =
                rates.exchangeRateApi
                    ? `Rp ${rates.exchangeRateApi.toLocaleString('id-ID')}`
                    : 'Failed';

            const currencyFreaksValue =
                rates.currencyFreaks
                    ? `Rp ${rates.currencyFreaks.toLocaleString('id-ID')}`
                    : 'Failed';

            const embed = new EmbedBuilder()
                .setTitle('💱 USD to IDR Rate')
                .addFields(
                    {
                        name: 'ExchangeRate API',
                        value: exchangeRateValue,
                        inline: true
                    },
                    {
                        name: 'CurrencyFreaks',
                        value: currencyFreaksValue,
                        inline: true
                    }
                )
                .setColor(0x00AE86)
                .setTimestamp();

            await channel.send({
                embeds: [embed]
            });

        },
        {
            timezone: 'Asia/Jakarta'
        }
    );
}