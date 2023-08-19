/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

import VoiceActivityIcon from "../userVoiceShow/components/VoiceActivityIcon";


export default definePlugin({
    name: "voiceActivity",
    description: "",
    authors: [],

    patches: [
        {
            find: "PREMIUM_GUILD_SUBSCRIPTION_TOOLTIP.",
            replacement: [
                // Add Voice Icon to MemberList
                {
                    match: /\w{2}\(\{selected:\w/,
                    replace: "$&,children:[$self.VoiceActivityIcon({userId:this.props.user.id,context:'memberList'})]"

                },
            ],
        },
        {
            find: "PrivateChannel.renderAvatar",
            replacement: [
                // Add Voice Icon to Direct Messages
                {
                    match: /\w\?\(0,\w\.jsx\)\(\w{2},\{\}\):null,/,
                    replace: "$&$self.VoiceActivityIcon({userId:e.props?.user?.id,context:'dmList'}),"

                },
            ],
        },
    ],

    VoiceActivityIcon,
});
