import { PrismaClient } from "@prisma/client"
import { Client, Intents } from "discord.js";

const psClient = new PrismaClient();

async function main() {
    const bot = new Client({ intents: [Intents.FLAGS.GUILDS] })
    bot.once("ready", () => {
        console.log("Bot Ready!!!!!!!!!!");
    })
    bot.login(process.env.BOT_TOKEN);
    console.log(await psClient.activeGuild.findMany())
}

main().finally(async () => {
    await psClient.$disconnect();
});