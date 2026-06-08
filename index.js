import 'dotenv/config';
import {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} from 'discord.js';

import {
    startExchangeScheduler
} from './scheduler/exchangeScheduler.js';
import {
    getBCARates
} from './services/exchangeService.js'
import { registerServer, setChannel, setScheduleTime, deleteBot, getScheduleTime } from './connection/database.js'

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
    if (message.content.toLowerCase() === 'infokurs') {
        const data = await getBCARates();

        // 1. Check if data is valid and has keys
        if (!data || Object.keys(data).length === 0) {
            return message.channel.send("Failed to retrieve current rates.");
        }

        // 2. Convert the scraped object into an array of currency codes
        const currencies = Object.keys(data); // e.g., ['USD', 'SGD', 'EUR', 'AUD']
        let currentIndex = 0; // Start at the first currency (index 0)

        // 3. Helper function to generate the embed dynamically based on the current currency
        const generateEmbed = (currency) => {
            return new EmbedBuilder()
                .setColor(0x00569c) // Official BCA Blue
                .setTitle(`BCA Exchange Rates (${currency})`)
                .setURL('https://www.bca.co.id/id/informasi/kurs')
                .addFields(
                    { name: 'Buy Rate', value: data[currency].buy, inline: true },
                    { name: 'Sell Rate', value: data[currency].sell, inline: true }
                )
                .addFields({
                    name: 'Quick Guide',
                    value: '• **Buy Rate:** Bank buys from you\n• **Sell Rate:** Bank sells to you'
                })
                .setTimestamp()
                .setFooter({ text: `Page ${currentIndex + 1} of ${currencies.length} | Scraped from BCA` });
        };

        // 4. Helper function to generate the Next/Previous buttons
        const generateButtons = () => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev_currency')
                    .setEmoji('⬅️') // Switched to setEmoji for tighter padding
                    .setStyle(ButtonStyle.Secondary) // Switched to Secondary (Neutral Grey)
                    .setDisabled(currentIndex === 0),
                new ButtonBuilder()
                    .setCustomId('next_currency')
                    .setEmoji('➡️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentIndex === currencies.length - 1)
            );
        };

        // 5. Send the initial message with the first currency and the buttons
        const replyMessage = await message.channel.send({
            embeds: [generateEmbed(currencies[currentIndex])],
            components: [generateButtons()]
        });

        // 6. Create a collector to listen for button clicks (expires after 60 seconds)
        // 1. Increase the initial time to 5 minutes (300000 milliseconds)
        const collector = replyMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000 // Changed from 60000 to 300000
        });

        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ content: "These buttons aren't for you!", ephemeral: true });
            }

            // 2. ADD THIS LINE: Reset the countdown timer every time they click an arrow!
            collector.resetTimer();

            if (interaction.customId === 'prev_currency') {
                currentIndex--;
            } else if (interaction.customId === 'next_currency') {
                currentIndex++;
            }

            await interaction.update({
                embeds: [generateEmbed(currencies[currentIndex])],
                components: [generateButtons()]
            });
        });

        collector.on('end', () => {
            // Removes the buttons when the timer finally runs out
            replyMessage.edit({ components: [] }).catch(console.error);
        });
    }
    if (message.content === 'setchannel') {
        // 1. Safety Check: Only allow administrators to change the channel
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("You need Administrator permissions to use this command.");
        }

        const serverId = message.guild.id;
        const channelId = message.channel.id;
        const channelName = message.channel.name;

        await setChannel(serverId, channelId, channelName, message)
    }
    if (message.content.startsWith('getschedule')) {
        const serverId = message.guild.id;
        await getScheduleTime(serverId, message)
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
                        'Show this help message. \n\n' +
                        '`getschedule`\n' +
                        'Show current message schedule settings.'
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