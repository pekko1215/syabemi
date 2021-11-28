import { Client, VoiceState } from "discord.js";
import { psClient } from "..";
import { TextToSpeechClient } from "@google-cloud/text-to-speech"
import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, entersState, getVoiceConnection, getVoiceConnections, joinVoiceChannel, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import { EnteringRoom, ReadUpQueue } from "@prisma/client";
import { Duplex } from "stream"


export class ReadUpService {
	private speechClient: TextToSpeechClient;
	private audioPlayerMap = new Map<string, AudioPlayer>();
	constructor(private bot: Client) {
		this.speechClient = new TextToSpeechClient();
		this.bot.on("voiceStateUpdate", async (oldState, newState) => {
			this.disconnectCheck(newState);
		})
	}

	async disconnectCheck(state: VoiceState) {
		if (state.member?.user.id === this.bot.user?.id) return;
		if (!state.channelId) return;
		const channel = await this.bot.channels.fetch(state.channelId);
		if (!channel || !channel.isVoice()) return;

		const members = channel.members;
		if (!members) return;
		if (members.size === 1 && members.has(this.bot.user!.id)) {
			await this.disconnectRoom(state.guild.id);
		}
	}

	async disconnectRoom(guildId: string) {
		this.audioPlayerMap.delete(guildId);
		getVoiceConnection(guildId)?.disconnect();
		const activeGuild = await psClient.activeGuild.findUnique({
			where: { guildId }
		})
		if (activeGuild) {
			await psClient.enteringRoom.delete({ where: { activeGuildId: activeGuild.id } });
		}
	}

	async resumeSpeechClient() {
		const rooms = await psClient.enteringRoom.findMany({ include: { activeGuild: true } });
		await Promise.all(rooms.map(async room => {
			const [thread, channel] = await Promise.all([
				await this.bot.channels.fetch(room.threadId),
				await this.bot.channels.fetch(room.channelId)
			])
			if (!thread || !thread.isThread() || thread.archived || !channel || !channel.isVoice() || channel.members.size === 0) {
				await this.disconnectRoom(room.activeGuild.guildId)
				return
			}
			if (channel.members.size === 1 && channel.members.has(this.bot.user!.id)) {
				await this.disconnectRoom(room.activeGuild.guildId);
				return
			}
			const guild = await this.bot.guilds.fetch(room.activeGuild.guildId);
			const connection = await joinVoiceChannel({
				channelId: room.channelId,
				guildId: room.activeGuild.guildId,
				adapterCreator: guild.voiceAdapterCreator
			})
			this.createAudioPlayerWithListener(connection);
		}))
	}

	async taskVacuum(guildId: string) {
		const connection = await getVoiceConnection(guildId);
		if (!connection) return;
		this.setAudioPlayerToConnection(connection);
	}

	async readUpTask(player: AudioPlayer, queue: ReadUpQueue) {
		const [voice] = await this.readAPIRequest(queue.text);

		const { audioContent } = voice;
		if (!audioContent) return;

		const stream = new Duplex();

		player.play(createAudioResource(stream));
		stream.push(audioContent);
		stream.push(null);
	}

	async createAudioPlayerWithListener(connection: VoiceConnection) {
		const player = createAudioPlayer();
		const vacuumeFunction = async () => {
			const data = await psClient.readUpQueue.findFirst({
				orderBy: { priority: "asc" },
				where: { completed: false }
			})

			if (!data) {
				this.audioPlayerMap.delete(connection.joinConfig.guildId);
				return;
			}

			await psClient.readUpQueue.update({
				where: { id: data.id },
				data: { completed: true }
			})
			this.readUpTask(player, data);
		}
		player.on("stateChange", async (oldStatus, newStatus) => {
			switch (newStatus.status) {
				case AudioPlayerStatus.Idle:
					await vacuumeFunction()
					break
			}
		})
		connection.on(VoiceConnectionStatus.Disconnected, async () => {
			try {
				await Promise.race([
					entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
					entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
				]);
				// 自動再接続に成功
			} catch (error) {
				// 切断された
				await psClient.enteringRoom.delete({ where: { channelId: connection.joinConfig.channelId! } });
				this.audioPlayerMap.delete(connection.joinConfig.guildId);
				connection.destroy();
			}
		})
		this.audioPlayerMap.set(connection.joinConfig.guildId, player);
		connection.subscribe(player);
		await vacuumeFunction();
		return player;
	}
	private setAudioPlayerToConnection(connection: VoiceConnection) {
		return this.audioPlayerMap.get(connection.joinConfig.guildId) || this.createAudioPlayerWithListener(connection);
	}

	async readAPIRequest(text: string) {
		if (text.length > 64) {
			text = text.slice(0, 64) + " 以下略"
		}
		return this.speechClient.synthesizeSpeech({
			input: { text },
			voice: { languageCode: "ja" },
			audioConfig: { audioEncoding: "OGG_OPUS" }
		})
	}
}