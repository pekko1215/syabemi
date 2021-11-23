import { Routes } from "discord-api-types/v9";
import { ApplicationCommand, CacheType, Channel, Client, CommandInteraction, Interaction, MessageMentions, TextBasedChannel, TextChannel, ThreadManager } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders"
import { BotCommand } from "../bot_command";

export class SummonCommand extends BotCommand {
    constructor(bot: Client) {
        super(bot, "summon")
    }

    getApplicationCommands(): SlashCommandBuilder[] {
        return [
            new SlashCommandBuilder()
                .setName(this.commandName)
                .setDescription("読み上げBotを召喚します。")
        ]
    }

    async onCommand(interaction: CommandInteraction<CacheType>) {
        await interaction.deferReply();
        const channel = interaction.channel;
        if (channel?.type !== "GUILD_TEXT") return;

        const thread = await channel.threads.create({
            name: `${channel.name}読みあげスレッド`,
            autoArchiveDuration: 60,
            type: "GUILD_PUBLIC_THREAD",
        })
        await interaction.editReply(`<#${thread.id}>を作成しました。`)
    }
}