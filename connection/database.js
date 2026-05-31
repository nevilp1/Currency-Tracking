import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import {
    ChannelType
} from 'discord.js';

export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export async function registerServer(guild) {
    console.log(`Bot invited to a new server: ${guild.name} (ID: ${guild.id})`);

    try {
        // 1. Register the Server in 'cb_discord_server'
        const { error: serverError } = await supabase
            .from('cb_discord_server')
            .insert([{ server_id: guild.id, server_name: guild.name }]);

        if (serverError && serverError.code !== '23505') {
            throw new Error(`Server registration failed: ${serverError.message}`);
        }

        // 2. Find the very top textual channel on the server
        const topChannel = guild.channels.cache
            .filter(c => c.type === ChannelType.GuildText && c.viewable)
            .sort((a, b) => a.position - b.position)
            .first();

        if (!topChannel) {
            console.error(`Could not locate an accessible text channel in ${guild.name}`);
            return;
        }

        // 3. Register the Top Channel in 'cb_discord_channel'
        const { error: channelError } = await supabase
            .from('cb_discord_channel')
            .insert([{
                channel_id: topChannel.id,
                server_id: guild.id,
                channel_name: topChannel.name
            }]);

        if (channelError && channelError.code !== '23505') {
            throw new Error(`Channel registration failed: ${channelError.message}`);
        }

        console.log(`Successfully mapped server ${guild.id} to top channel ${topChannel.id}`);

    } catch (err) {
        console.error(`Database transaction simulation error:`, err.message);
    }
}

export async function setChannel(serverId, channelId, channelName, message) {
    try {
        // 2. Perform an Upsert into Supabase
        // This updates the channel_id if the server_id exists, or inserts a new row if it doesn't.
        const { error } = await supabase
            .from('cb_discord_channel')
            .upsert(
                { server_id: serverId, channel_id: channelId, channel_name: channelName },
                { onConflict: 'server_id' } // Matches the unique database constraint
            );

        if (error) throw error;

        // 3. Success Feedback
        await message.reply(`Success! This channel has been set to receive the currency rate announcements.`);
        console.log(`Server ${serverId} updated currency channel to ${channelId}`);

    } catch (err) {
        console.error(`Database error during !setchannel:`, err.message);
        await message.reply("Failed to update the channel due to a database error.");
    }
}

export async function setScheduleTime(timeInput, serverId, message) {
    try {
        // 3. Update the targeted row inside Supabase
        const { data, error } = await supabase
            .from('cb_discord_channel')
            .update({ schedule_time: timeInput })
            .eq('server_id', serverId)
            .select();

        // If no matching rows are found, it means the server hasn't initialized a channel yet
        if (!data || data.length === 0) {
            return message.reply("No target notification channel found for this server. Please use `!setchannel` first.");
        }

        if (error) throw error;

        // 4. Success confirmation
        await message.reply(`Success! Your daily BCA currency rate announcement has been scheduled for **${timeInput}**.`);
        console.log(`Server ${serverId} updated schedule time to ${timeInput}`);

    } catch (err) {
        console.error(`Database error during !setschedule:`, err.message);
        await message.reply("Failed to update the schedule due to a system database error.");
    }
}

export async function getScheduleTime(serverId, message) {
    try {
        // 3. Update the targeted row inside Supabase
        const { data, error } = await supabase
            .from('cb_discord_channel')
            .select()
            .eq('server_id', serverId);

        if (error) throw error;

        if (data.length > 0)
            await message.reply(`Your daily BCA currency rate announcement has been scheduled for #${data[0].channel_name} at **${data[0].schedule_time.slice(0, 5)}** (Asia/Jakarta).`);

    } catch (err) {
        console.error(`Database error during getschedule:`, err.message);
        await message.reply("Failed to get the schedule due to a system database error.");
    }
}

export async function deleteBot(serverId) {
    try {
        // 1. Remove the channel configuration for this server
        const { error: channelError } = await supabase
            .from('cb_discord_channel')
            .delete()
            .eq('server_id', serverId);

        if (channelError) {
            console.error(`[Cleanup Error] Failed to delete channels for server ${serverId}:`, channelError.message);
        } else {
            console.log(`[Cleanup Success] Wiped discord_channel rows for server: ${serverId}`);
        }

        // 2. Remove the main server tracking record from discord_server
        const { error: serverError } = await supabase
            .from('cb_discord_server')
            .delete()
            .eq('server_id', serverId);

        if (serverError) {
            console.error(`[Cleanup Error] Failed to delete server entry for ${serverId}:`, serverError.message);
        } else {
            console.log(`[Cleanup Success] Wiped discord_server row for server: ${serverId}`);
        }

    } catch (err) {
        console.error(`[Cleanup Error] Critical exception during guildDelete cleanup:`, err);
    }
}
