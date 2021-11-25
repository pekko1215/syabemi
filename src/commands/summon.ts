import { Routes } from "discord-api-types/v9";
import { ApplicationCommand, CacheType, Channel, Client, CommandInteraction, GuildMember, Interaction, Message, MessageMentions, TextBasedChannel, TextChannel, ThreadManager } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders"
import { BotCommand } from "../bot_command";
import { BotServices, psClient } from "..";
import { joinVoiceChannel } from "@discordjs/voice";

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

	async onCommand(interaction: CommandInteraction) {

		await interaction.deferReply()
		const channel = interaction.channel;
		if (channel?.type !== "GUILD_TEXT") {
			interaction.editReply("このコマンドはテキストチャンネルのみ有効です")
			await new Promise(r => setTimeout(r, 5000));
			interaction.deleteReply();
			return;
		}

		const guild = this.bot.guilds.cache.get(interaction.guildId);
		if (!guild) throw new Error(`Unknown Guild from guildId: ${interaction.guildId}`);

		const activeGuild = await psClient.activeGuild.findUnique({ where: { guildId: guild.id } });
		if (!activeGuild) throw new Error(`Not found ActiveGuild Data from guildId: ${interaction.guildId}`);

		const user = guild.members.cache.get(interaction.member.user.id)!;

		const voice = user.voice;

		if (!voice.channel) {
			interaction.editReply("ボイスチャンネルに入った状態で実行する必要があります")
			await new Promise(r => setTimeout(r, 5000));
			interaction.deleteReply();
			return;
		}

		const enteringRoom = await psClient.enteringRoom.findUnique({
			where: { channelId: voice.channel.id }
		})

		if (enteringRoom) {
			await psClient.enteringRoom.delete({ where: { id: enteringRoom.id } })
		}

		if (voice.channel.members.has(this.bot.user!.id)) {
			interaction.editReply("すでにボイスチャンネルに参加しています。")
			await new Promise(r => setTimeout(r, 5000));
			interaction.deleteReply();
			return;
		}

		await joinVoiceChannel({
			channelId: voice.channel.id,
			guildId: guild.id,
			adapterCreator: voice.channel.guild.voiceAdapterCreator
		})

		const thread = await channel.threads.create({
			name: `${voice.channel!.name}読みあげスレッド`,
			autoArchiveDuration: 60,
			type: "GUILD_PUBLIC_THREAD",
		})

		await psClient.enteringRoom.create({
			data: {
				channelId: voice.channelId!,
				guildId: guild.id,
				hostId: user.id,
				updatedAt: new Date,
				threadId: thread.id
			}
		})

		await thread.send({
			content: `<@${interaction.user.id}> <#${thread.id}>を作成しました。`,
		})

		await interaction.editReply(`<#${thread.id}>を作成しました。`);
		await new Promise(r => setTimeout(r, 5000));
		interaction.deleteReply();
	}

	async onMessage(message: Message) {
		if (message.content === "") return;
		if (message.author.bot || !message.channel.isThread()) return;
		const enteringRoom = await psClient.enteringRoom.findUnique({
			where: { threadId: message.channelId }
		})
		if (!enteringRoom) return;
		await psClient.readUpQueue.create({
			data: {
				guildId: enteringRoom.guildId,
				priority: 1,
				text: message.content,
			}
		})

		BotServices.ReadUp.taskVacuum();
	}
}