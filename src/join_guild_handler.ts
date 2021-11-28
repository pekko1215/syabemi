import { Client, Guild } from "discord.js";
import { psClient } from ".";

export class JoinGuildHandler {
	constructor(private bot: Client) {
		this.eventRegister();
	}

	async joinGuildEvent(guild: Guild) {
		const role = guild.id === process.env.DEV_GUILD_ID ? 1 : 0;
		return await psClient.activeGuild.upsert({
			where: {
				guildId: guild.id
			},
			create: {
				guildId: guild.id,
				updatedAt: new Date,
				role
			},
			update: {
				updatedAt: new Date,
				role
			}
		})
	}

	private eventRegister() {
		this.bot.on("guildCreate", async guild => {
			this.joinGuildEvent(guild);
		})
	}
}