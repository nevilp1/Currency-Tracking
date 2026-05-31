import cron from 'node-cron';
import { EmbedBuilder } from 'discord.js';
import { getBCARates } from '../services/exchangeService.js';
import { supabase } from '../connection/database.js';

export function startExchangeScheduler(client) {
    // Run the cron job every minute
    cron.schedule(
        '* * * * *',
        async () => {
            try {
                // 1. Get the current time formatted exactly as HH:MM:00 in Jakarta timezone
                const nowInJakarta = new Date().toLocaleTimeString('en-US', {
                    timeZone: 'Asia/Jakarta',
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const currentTimeString = `${nowInJakarta}:00`;

                // 2. Query Supabase for all channels scheduled for this exact minute
                const { data: channels, error } = await supabase
                    .from('cb_discord_channel')
                    .select('channel_id')
                    .eq('schedule_time', currentTimeString);

                if (error) {
                    console.error('Database query error in scheduler:', error.message);
                    return;
                }

                // If no channels are scheduled for this minute, exit early cleanly
                if (!channels || channels.length === 0) return;

                console.log(`[Scheduler] Found ${channels.length} channel(s) scheduled for ${nowInJakarta}.`);

                // 3. Fetch the BCA rates once for this minute batch
                const data = await getBCARates();

                // Build the presentation message layout
                const rateEmbed = new EmbedBuilder()
                    .setColor(0x00569c) // Official BCA Blue
                    .setTitle('BCA Exchange Rates (USD)')
                    .setURL('https://www.bca.co.id/id/informasi/kurs')
                    .addFields(
                        { name: 'Buy Rate', value: data && data['USD'] ? data['USD'].buy : 'Unavailable', inline: true },
                        { name: 'Sell Rate', value: data && data['USD'] ? data['USD'].sell : 'Unavailable', inline: true }
                    )
                    .addFields({
                        name: 'Quick Guide',
                        value: '• **Buy Rate:** Bank buys from you\n• **Sell Rate:** Bank sells to you'
                    })
                    .setTimestamp()
                    .setFooter({ text: 'Data directly scraped from BCA' });

                const msgPayload = data && data['USD']
                    ? { embeds: [rateEmbed] }
                    : { content: "Failed to retrieve rates. Please try again later." };

                // 4. Distribute the message to all matched channels concurrently
                await Promise.allSettled(
                    channels.map(async (row) => {
                        const channelId = String(row.channel_id).trim();

                        try {
                            console.log(`[Scheduler] Fetching channel ID: "${channelId}"`);

                            const targetChannel = await client.channels.fetch(channelId, {
                                force: true,
                                cache: true
                            });

                            if (!targetChannel) {
                                console.error(`[Scheduler] Channel ${channelId} returned null`);
                                return;
                            }

                            console.log(`[Scheduler] Fetched channel:`, {
                                id: targetChannel.id,
                                type: targetChannel.type,
                                guildId: targetChannel.guildId,
                                name: targetChannel.name
                            });

                            if (!targetChannel.isTextBased()) {
                                console.error(`[Scheduler] Channel ${channelId} is not text-based`);
                                return;
                            }

                            await targetChannel.send(msgPayload);
                        } catch (chanError) {
                            console.error(`[Scheduler] Failed sending to channel ${channelId}:`, {
                                name: chanError.name,
                                message: chanError.message,
                                code: chanError.code,
                                status: chanError.status,
                                method: chanError.method,
                                url: chanError.url
                            });
                        }
                    })
                );

            } catch (globalError) {
                console.error('[Scheduler] Critical runtime exception:', globalError);
            }
        },
        {
            timezone: 'Asia/Jakarta'
        }
    );
}