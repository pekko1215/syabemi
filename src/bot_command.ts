import { CacheType, Client, CommandInteraction, Interaction } from "discord.js";
import { REST } from "@discordjs/rest"
import { SlashCommandBuilder } from "@discordjs/builders"


export abstract class BotCommand {
    protected restClient: REST;
    commandId!: string;

    constructor(protected bot: Client, public commandName: string) {
        this.restClient = new REST({ version: "9" }).setToken(bot.token!)
    }
    abstract getApplicationCommands(): SlashCommandBuilder[];

    setCommandId(commandId: string) {
        this.commandId = commandId;
    }

    async onInteraction(interation: Interaction<CacheType>) {
        if (interation.isCommand()) {
            if (interation.commandName === this.commandName) {
                this.onCommand(interation)
            }
        }
    }

    async onCommand(interation: CommandInteraction<CacheType>) {
        throw new Error("Method not implemented.");
    }
}