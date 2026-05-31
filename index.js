import 'dotenv/config';
import {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    PermissionFlagsBits
} from 'discord.js';

import {
    startExchangeScheduler
} from './scheduler/exchangeScheduler.js';
import {
    getBCARates
} from './services/exchangeService.js'
import { registerServer, setChannel, setScheduleTime, deleteBot } from './connection/database.js'

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.login(process.env.DISCORD_TOKEN);

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

    startExchangeScheduler(client);
});

client.on('guildCreate', async (guild) => {
    await registerServer(guild)
});

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
    if (message.content === 'setchannel') {
        // 1. Safety Check: Only allow administrators to change the channel
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("You need Administrator permissions to use this command.");
        }

        const serverId = message.guild.id;
        const channelId = message.channel.id;

        await setChannel(serverId, channelId, message)
    }
    if (message.content.startsWith('setschedule')) {

        // 1. Permissions Guard: Only allow Server Administrators
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("You need Administrator permissions to modify the schedule.");
        }

        // Split arguments to find the time string (e.g., ["!setschedule", "16:30"])
        const args = message.content.split(' ');
        const timeInput = args[1];

        if (!timeInput) {
            return message.reply("Please provide a time. Usage: `!setschedule HH:MM` (e.g., `!setschedule 14:30`)");
        }

        // 2. Format Validation: Validate HH:MM (24-hour style format)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(timeInput)) {
            return message.reply("Invalid time format! Please use 24-hour clock formatting: `HH:MM` (from `00:00` to `23:59`).");
        }

        const serverId = message.guild.id;
        await setScheduleTime(timeInput, serverId, message)
    }
    if (message.content === 'helpkurs' || message.content === 'kurshelp') {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x00569c)
            .setTitle('BCA Exchange Rate Bot Help')
            .setDescription('A Discord bot that fetches and broadcasts BCA USD exchange rates.')
            .addFields(
                {
                    name: 'Public Commands',
                    value:
                        '`infokurs`\n' +
                        'Show the latest BCA USD buy and sell rates.\n\n' +
                        '`helpkurs` or `kurshelp`\n' +
                        'Show this help message.'
                },
                {
                    name: 'Admin Commands',
                    value:
                        '`setchannel`\n' +
                        'Set the current channel as the automatic broadcast channel.\n\n' +
                        '`setschedule HH:MM`\n' +
                        'Set the daily broadcast time using 24-hour format.\n' +
                        'Example: `setschedule 10:00`'
                },
                {
                    name: 'Schedule Timezone',
                    value: 'Automatic broadcasts use **Asia/Jakarta / WIB** timezone.'
                },
                {
                    name: 'Quick Guide',
                    value:
                        '• **Buy Rate:** Bank buys USD from you\n' +
                        '• **Sell Rate:** Bank sells USD to you'
                }
            )
            .setFooter({ text: 'BCA rates are scraped from the official BCA website' })
            .setTimestamp();

        return message.channel.send({ embeds: [helpEmbed] });
    }
});

client.on('guildDelete', async (guild) => {
    const serverId = guild.id;
    console.log(`[Bot Kicked/Left] Bot was removed from server: ${guild.name} (${serverId})`);
    await deleteBot(serverId)
});