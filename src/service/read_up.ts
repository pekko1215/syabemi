import { Client } from "discord.js";
import { psClient } from "..";
import { TextToSpeechClient } from "@google-cloud/text-to-speech"
import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, getVoiceConnection, VoiceConnection } from "@discordjs/voice";
import { ReadUpQueue } from "@prisma/client";
import { Duplex } from "stream"


export class ReadUpService {
	private speechClient: TextToSpeechClient;
	private audioPlayerMap = new Map<string, AudioPlayer>();
	constructor(private bot: Client) {
		this.speechClient = new TextToSpeechClient();
		console.log(this)
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