import { generateDependencyReport } from "@discordjs/voice";
import { PrismaClient } from "@prisma/client"
import { Client, Intents } from "discord.js";
import DotEnv from "dotenv";
import { BotServiceInitialize } from "./bot_services";
import { CommandRegister } from "./command_register";
import { JoinGuildHandler } from "./join_guild_handler";

DotEnv.config()

export const psClient = new PrismaClient();
const bot = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGES] })
export const BotServices = BotServiceInitialize(bot);

console.warn(generateDependencyReport());

async function main() {
	bot.once("ready", () => {
		console.log("Bot Ready!!!!!!!!!!");
	})
	const joinHandler = await new JoinGuildHandler(bot);
	await bot.login(process.env.BOT_TOKEN);
	await CommandRegister(bot)
}

main().finally(async () => {
	await psClient.$disconnect();
});