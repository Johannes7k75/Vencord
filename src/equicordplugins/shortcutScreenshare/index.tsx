import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { VoiceState } from "@vencord/discord-types";
import { findByCodeLazy, findByPropsLazy, findStoreLazy } from "@webpack";
import { ChannelStore, Forms, PermissionsBits, PermissionStore, SearchableSelect, SelectedChannelStore, useEffect, UserStore, useState, VoiceStateStore } from "@webpack/common";


interface PickerProps {
    streamMediaSelection: any[];
    streamMedia: any[];
}

const natives = VencordNative.pluginHelpers.ShortcuteScreenshare as PluginNative<typeof import("./native")>;

const startStream = findByCodeLazy('type:"STREAM_START"');
const stopStream = findByCodeLazy('type:"STREAM_STOP"');
const mediaEngine = findByPropsLazy("getMediaEngine");
const getDesktopSources = findByCodeLazy("desktop sources");
const ApplicationStreamingStore = findStoreLazy("ApplicationStreamingStore");


const cl = classNameFactory("vc-shortcut-screenshare-");
let isRecordingGlobal: boolean = false;

const HotkeyRecordComponent = () => {
    const [isRecording, setIsRecording] = useState(false);
    const reloadShortcut = (Vencord.Plugins.plugins.ShortcuteScreenshare as typeof import("./index.tsx").default).reloadShortcut;

    const cleanupKeys = (keys: string[]) => {
        const existsAltGraph = keys.findIndex((key, i, keys) => key === 'control' && (keys.length >= i + 1 && keys[i + 1] === 'altgraph'));
        if (existsAltGraph !== -1) {
            keys.splice(existsAltGraph, 2, "altgr");
        }

        return keys;
    };

    const recordKeybind = (setIsRecording: (value: boolean) => void) => {
        const keys: Set<string> = new Set();
        const keyLists: string[][] = [];

        setIsRecording(true);
        isRecordingGlobal = true;

        const updateKeys = () => {
            if (keys.size === 0 || !document.querySelector(`.${cl("key-recorder-button")}`)) {
                const longestArray = keyLists.reduce((a, b) => a.length > b.length ? a : b);
                if (longestArray.length > 0) {
                    console.log("Update shortcuts");
                    settings.store.shortcut = cleanupKeys(longestArray.map(key => key.toLowerCase()));
                    reloadShortcut();
                }
                setIsRecording(false);
                isRecordingGlobal = false;
                document.removeEventListener("keydown", keydownListener);
                document.removeEventListener("keyup", keyupListener);
            }
            keyLists.push(Array.from(keys));
        };

        const keydownListener = (e: KeyboardEvent) => {
            console.log("Down", isRecordingGlobal, isRecording);
            const { key } = e;
            if (!keys.has(key)) {
                keys.add(key);
            }
            updateKeys();
        };

        const keyupListener = (e: KeyboardEvent) => {
            console.log("Up", isRecordingGlobal, isRecording);
            keys.delete(e.key);
            updateKeys();
        };

        document.addEventListener("keydown", keydownListener);
        document.addEventListener("keyup", keyupListener);
    };

    return (
        <div className={cl("key-recorder-container")} onClick={() => recordKeybind(setIsRecording)}>
            <div className={`${cl("key-recorder")} ${isRecording ? cl("recording") : ""}`}>
                {settings.store.shortcut.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" + ")}
                <button className={`${cl("key-recorder-button")} ${isRecording ? cl("recording-button") : ""}`} disabled={isRecording}>
                    {isRecording ? "Recording..." : "Record keybind"}
                </button>
            </div >
        </div >
    );
};

export async function getCurrentMedia() {
    const media = mediaEngine.getMediaEngine();
    const sources = [
        ...(await getDesktopSources(media, ["screen"], null) ?? []),
        ...(await getDesktopSources(media, ["window", "application"], null) ?? [])
    ];
    const streamMedia = sources.find(screen => screen.id === settings.store.streamMedia);
    console.log(sources);

    if (streamMedia) return streamMedia;

    new Logger("ShortcuteScreenshare").error(`Stream Media "${settings.store.streamMedia}" not found. Resetting to default.`);

    settings.store.streamMedia = sources[0];
    return sources[0];
}

function StreamSimplePicker({ streamMediaSelection, streamMedia }: PickerProps) {
    const options = streamMediaSelection.map(screen => ({
        label: screen.name,
        value: screen.id,
        default: streamMediaSelection[0],
    }));

    return (
        <SearchableSelect
            placeholder="Select a media source to stream "
            maxVisibleItems={5}
            options={options}
            value={options.find(o => o.value === streamMedia)}
            onChange={v => settings.store.streamMedia = v}
            closeOnSelect
        />
    );
}

function ScreenSetting() {
    const { streamMedia } = settings.use(["streamMedia"]);
    const media = mediaEngine.getMediaEngine();
    const [streamMediaSelection, setStreamMediaSelection] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        async function fetchMedia() {
            setLoading(true);
            const sources = [
                ...(await getDesktopSources(media, ["screen"], null) ?? []),
                ...(await getDesktopSources(media, ["window", "application"], null) ?? [])
            ];

            if (active) {
                setStreamMediaSelection(sources);
                setLoading(false);
            }
        }
        fetchMedia();
        return () => { active = false; };
    }, []);

    if (loading) return <Forms.FormText>Loading media sources...</Forms.FormText>;
    if (!streamMediaSelection.length) return <Forms.FormText>No Media found.</Forms.FormText>;

    return <StreamSimplePicker streamMediaSelection={streamMediaSelection} streamMedia={streamMedia} />;
}

export const settings = definePluginSettings({
    shortcut: {
        description: "The shortcut to start the Screenshare.",
        type: OptionType.COMPONENT,
        default: ["CommandOrControl", "PageUp"],
        component: HotkeyRecordComponent
    },
    streamMedia: {
        type: OptionType.COMPONENT,
        component: () => {
            return (
                <Forms.FormSection>
                    <Forms.FormTitle>Media source to stream</Forms.FormTitle>
                    <Forms.FormText>Resets to main screen if not found</Forms.FormText>
                    <ScreenSetting />
                </Forms.FormSection>
            );
        },
    }
});

export default definePlugin({
    name: "ShortcuteScreenshare",
    description: "Start a screenshare via an hotkey",
    authors: [],
    settings,

    async start() {
        natives.registerShortcuts("TestString", settings.store.shortcut.join("+"));
    },

    async stop() {
        natives.unregisterShortcut();
    },

    reloadShortcut() {
        natives.registerShortcuts("TestString", settings.store.shortcut.join("+"));
    },

    async startScreenshare() {
        console.log("Start Screenshare");
        const selected = SelectedChannelStore.getVoiceChannelId();
        console.log("Selected voice channel", selected);
        if (!selected) return;
        const channel = ChannelStore.getChannel(selected);
        const user = UserStore.getCurrentUser();

        const ChannelTypes = {
            CallVoice: 1,
            GuildVoice: 2,
            GuildStageVoice: 13,
        };

        console.log("ChannelType:", channel.type, "Can user stream:", PermissionStore.can(PermissionsBits.STREAM, channel));
        if (channel.type === ChannelTypes.GuildStageVoice || (channel.type !== ChannelTypes.CallVoice && !PermissionStore.can(PermissionsBits.STREAM, channel))) return;

        const voicestates: Record<string, VoiceState> = VoiceStateStore.getVoiceStatesForChannel(channel.id);
        const voicestate = Object.values(voicestates).find(voicestate => voicestate.userId === user.id);

        console.log("Voicestate:", voicestate);

        if (voicestate?.selfStream) {
            type StreamType = {
                streamType: 'call', channelId: string, ownerId: string, state: string;
            } | {
                streamType: 'guild', guildId: string, channelId: string, ownerId: string, state: string;
            };
            const activeStream: StreamType = ApplicationStreamingStore.getCurrentUserActiveStream();

            let streamKey: string;
            if (activeStream.streamType === 'call') {
                streamKey = `call:${activeStream.channelId}:${activeStream.ownerId}`;
            } else if (activeStream.streamType === "guild") {
                streamKey = `guild:${activeStream.guildId}:${activeStream.channelId}:${activeStream.ownerId}`;
            } else {
                return;
            }

            stopStream(streamKey);
        } else {
            const streamMedia = await getCurrentMedia();

            startStream(channel.guild_id, selected, {
                "pid": null,
                "sourceId": streamMedia.id,
                "sourceName": streamMedia.name,
                "audioSourceId": null,
                "sound": true,
                "previewDisabled": false
            });
        }

    }
});