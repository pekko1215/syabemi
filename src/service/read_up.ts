import { Client } from "discord.js";
import { psClient } from "..";
import { TextToSpeechClient } from "@google-cloud/text-to-speech"
import { AudioPlayer, createAudioPlayer, createAudioResource, getVoiceConnection } from "@discordjs/voice";
import { ReadUpQueue } from "@prisma/client";
import { Duplex } from "stream"
export class ReadUpService {
	private speechClient: TextToSpeechClient;
	constructor(private bot: Client) {
		this.speechClient = new TextToSpeechClient();
	}
	async taskVacuum() {
		const data = await psClient.readUpQueue.findFirst({
			orderBy: { priority: "asc" },
			where: { completed: false }
		})
		if (!data) return;
		await psClient.readUpQueue.update({
			where: { id: data.id },
			data: { completed: true }
		})
		this.readUpTask(data);
		this.taskVacuum();
	}
	async readUpTask(queue: ReadUpQueue) {
		const [voice] = await this.readAPIRequest(queue.text);
		const connection = await getVoiceConnection(queue.guildId);
		if (!connection) return;
		const { audioContent } = voice;
		if (!audioContent) return;
		const stream = new Duplex();
		const player = createAudioPlayer();
		player.play(createAudioResource(stream));
		stream.push(audioContent);
		stream.push(null);
		connection.subscribe(player);
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