import { PrismaClient } from "@prisma/client"
import { Client, Intents } from "discord.js";
import DotEnv from "dotenv";
import { CommandRegister } from "./command_register";

DotEnv.config()

const psClient = new PrismaClient();

async function main() {
    const bot = new Client({ intents: [Intents.FLAGS.GUILDS] })
    bot.once("ready", () => {
        console.log("Bot Ready!!!!!!!!!!");
    })
    await bot.login(process.env.BOT_TOKEN);
    await CommandRegister(bot)

    console.log(await psClient.activeGuild.findMany())
}

main().finally(async () => {
    await psClient.$disconnect();
});