/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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


import "./styles.css";

import { addContextMenuPatch, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { openImageModal } from "@utils/discord";
import { copyWithToast } from "@utils/misc";
import definePlugin from "@utils/types";
import { Menu, showToast } from "@webpack/common";
import { Guild, User } from "discord-types/general";
import React from "react";

function isGifUrl(url: string) {
    return new URL(url).pathname.endsWith(".gif");
}

const GuildImageContext: NavContextMenuPatchCallback = (children, props: { guild: Guild; }) => () => {
    // console.log(props.guild);
    if (!props.guild.icon) return;

    const imageUrl = props.guild.getIconURL(4069, false);
    const animatedImageUrl = props.guild.getIconURL(4069, true) ?? imageUrl;




    children.push(
        <Menu.MenuItem
            id="imageUtils"
            label="Image Actions"
        // action={() => {
        //     const key = openModal(modalProps => (
        //         <ImageModal
        //             rootProps={modalProps}
        //             close={() => closeModal(key)}
        //             guild={props.guild}
        //         />
        //     ));
        // }}
        >
            {!isGifUrl(animatedImageUrl) ? imageOption(imageUrl, props.guild.icon) : (
                <>
                    <Menu.MenuItem id="vc-IU-guild-png" label="Icon PNG">{imageOption(imageUrl, props.guild.icon)}</Menu.MenuItem>
                    <Menu.MenuItem id="vc-IU-guild-gif" label="Icon GIF">{imageOption(animatedImageUrl, props.guild.icon)}</Menu.MenuItem>
                </>)}
        </Menu.MenuItem>);

};

const UserImageContext: NavContextMenuPatchCallback = (children, props: { user: User; }) => () => {
    // console.log(props.user);
    if (!props.user.avatar) return;

    const imageUrl = props.user.getAvatarURL(props.user.id, undefined, false);
    const animatedImageUrl = props.user.getAvatarURL(props.user.id, undefined, true) ?? imageUrl;




    children.push(
        <Menu.MenuItem
            id="imageUtils"
            label="Image Actions"
        // action={() => {
        //     const key = openModal(modalProps => (
        //         <ImageModal
        //             rootProps={modalProps}
        //             close={() => closeModal(key)}
        //             guild={props.guild}
        //         />
        //     ));
        // }}
        >
            {!isGifUrl(animatedImageUrl) ? imageOption(imageUrl, props.user.id) : (
                <>
                    <Menu.MenuItem id="vc-IU-user-png" label="Icon PNG">{imageOption(imageUrl, props.user.id)}</Menu.MenuItem>
                    <Menu.MenuItem id="vc-IU-user-gif" label="Icon GIF">{imageOption(animatedImageUrl, props.user.id)}</Menu.MenuItem>
                </>)}
        </Menu.MenuItem>);

};

function imageOption(url: string, fileName: string): React.ReactElement {

    return (<>
        <Menu.MenuItem label="Copy Link" id="vc-IU-copyLink" action={() => {
            copyWithToast(url, "Copied link to clipboard!");
        }}></Menu.MenuItem>
        <Menu.MenuItem label="Open Link" id="vc-IU-openLink" action={() => {
            try {
                VencordNative.native.openExternal(url);
                showToast("Opened link!", 1);
            } catch {
                showToast("Couldnt open linkl!", 2);
            }
        }}></Menu.MenuItem>
        <Menu.MenuItem label="View Image" id="vc-IU-viewImage" action={() => {
            openImageModal(url, {
                height: 512
            });
            showToast("Opened Image", 1);
        }}></Menu.MenuItem>
        <Menu.MenuItem label="Save Image" id="vc-IU-saveImage" action={async () => {
            const data = await fetchImage(url);
            if (!data) return showToast("Failed to download image!", 2);
            window.DiscordNative.fileManager.saveWithDialog(new Uint8Array(data), `${fileName}.${isGifUrl(url) ? "gif" : "png"}`);
            showToast("Downloaded image!", 1);
        }}>
            { }
        </Menu.MenuItem>
    </>);
}

async function fetchImage(url: string): Promise<ArrayBuffer | undefined> {
    const res = await fetch(url);
    if (res.status !== 200) return;

    return await res.arrayBuffer();
}


// https://cdn.discordapp.com/icons/604751506117230602/a_c588639778429438ed666cc704a35a33.png?size=4096
export default definePlugin({
    name: "Image Utilities",
    description: "This plugin is absolutely epic",
    authors: [
        {
            id: 12345n,
            name: "Your Name",
        },
    ],
    patches: [],
    // Delete these two below if you are only using code patches
    start() {
        addContextMenuPatch("guild-context", GuildImageContext);
        addContextMenuPatch("user-context", UserImageContext);
    },
    stop() { },
});
