import { REST } from "@discordjs/rest";
import { ApplicationCommand, Client } from "discord.js";
import { BotCommand } from "./bot_command";
import { SlashCommandBuilder } from "@discordjs/builders"
import { SummonCommand } from "./commands/summon"
import { Routes } from "discord-api-types/v9";

export async function CommandRegister(bot: Client) {
	const RestClient = new REST({ version: "9" }).setToken(bot.token!)
	const commandClasses = [SummonCommand];
	const commands: BotCommand[] = [];
	const builders: SlashCommandBuilder[] = [];

	for (const commandClass of commandClasses) {
		const command = new commandClass(bot);
		const builderList = command.getApplicationCommands();
		commands.push(command);
		builders.push(...builderList);
		bot.on("interactionCreate", command.onInteraction.bind(command))
		bot.on("messageCreate", command.onMessage.bind(command))
	}

	const body = builders.map(b => b.toJSON())

	if (process.env.DEV_MODE) {
		await RestClient.put(Routes.applicationGuildCommands(bot.application!.id, process.env.DEV_GUILD_ID!), { body })
	} else {
		await RestClient.put(Routes.applicationCommands(bot.application!.id), { body })
	}
}