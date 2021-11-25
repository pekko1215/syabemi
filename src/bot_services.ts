import { Channel, Client } from "discord.js";
import { ReadUpService } from "./service/read_up";

export function BotServiceInitialize(bot: Client) {
	return {
		ReadUp: new ReadUpService(bot)
	}
}