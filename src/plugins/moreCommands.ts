/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated, Samu and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import {
    ApplicationCommandInputType,
    findOption,
    OptionalMessageOption,
    RequiredMessageOption,
    sendBotMessage,
} from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

function mock(input: string): string {
    let output = "";
    for (let i = 0; i < input.length; i++) {
        output += i % 2 ? input[i].toUpperCase() : input[i].toLowerCase();
    }
    return output;
}

export default definePlugin({
    name: "MoreCommands",
    description: "echo, lenny, mock",
    authors: [Devs.Arjix, Devs.echo, Devs.Samu],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "echo",
            description: "Sends a message as Clyde (locally)",
            options: [OptionalMessageOption],
            inputType: ApplicationCommandInputType.BOT,
            execute: (opts, ctx) => {
                const content = findOption(opts, "message", "");

                sendBotMessage(ctx.channel.id, { content });
            },
        },
        {
            name: "zip_emojis",
            description: "Zip all server emojis",
            inputType: ApplicationCommandInputType.BOT,
            execute: (opts, ctx) => {
                async function zipServerEmojis(id) {
                    await fetch("https://unpkg.com/fflate@0.8.0")
                        .then(r => r.text())
                        .then(eval);
                    const emojis =
                        Vencord.Webpack.Common.EmojiStore.getGuilds()[id]
                            ?.emojis;
                    if (!emojis) {
                        return console.log("Server not found!");
                    }

                    const fetchEmojis = async e => {
                        const filename = e.id + (e.animated ? ".gif" : ".png");
                        const emoji = await fetch(
                            "https://cdn.discordapp.com/emojis/" +
                            filename +
                            "?size=512&quality=lossless"
                        ).then(res => res.blob());
                        return {
                            file: new Uint8Array(await emoji.arrayBuffer()),
                            filename,
                        };
                    };
                    const emojiPromises = emojis.map(e => fetchEmojis(e));

                    Promise.all(emojiPromises)
                        .then(results => {
                            const emojis = fflate.zipSync(
                                Object.fromEntries(
                                    results.map(({ file, filename }) => [
                                        filename,
                                        file,
                                    ])
                                )
                            );
                            const blob = new Blob([emojis], {
                                type: "application/zip",
                            });
                            const link = document.createElement("a");
                            link.href = URL.createObjectURL(blob);
                            link.download = `emojis-${id}.zip`;
                            link.click();
                            link.remove();

                        })
                        .catch(error => {
                            console.error(error);
                        });
                }
                zipServerEmojis(ctx.guild?.id);
            },
        },
        {
            name: "lenny",
            description: "Sends a lenny face",
            options: [OptionalMessageOption],
            execute: opts => ({
                content: findOption(opts, "message", "") + " ( ͡° ͜ʖ ͡°)",
            }),
        },
        {
            name: "mock",
            description: "mOcK PeOpLe",
            options: [RequiredMessageOption],
            execute: opts => ({
                content: mock(findOption(opts, "message", "")),
            }),
        },
    ],
});
