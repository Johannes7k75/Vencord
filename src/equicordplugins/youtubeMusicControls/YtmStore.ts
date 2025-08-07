/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { proxyLazyWebpack } from "@webpack";
import { Flux, FluxDispatcher } from "@webpack/common";
import { Settings } from "Vencord";

enum MediaType {
    /**
     * Audio uploaded by the original artist
     */
    Audio = "AUDIO",
    /**
     * Official music video uploaded by the original artist
     */
    OriginalMusicVideo = "ORIGINAL_MUSIC_VIDEO",
    /**
     * Normal YouTube video uploaded by a user
     */
    UserGeneratedContent = "USER_GENERATED_CONTENT",
    /**
     * Podcast episode
     */
    PodcastEpisode = "PODCAST_EPISODE",
    OtherVideo = "OTHER_VIDEO",
}

interface Song {
    title: string;
    artist: string;
    views: number;
    uploadDate?: string;
    imageSrc?: string | null;
    isPaused?: boolean;
    songDuration: number;
    elapsedSeconds?: number;
    url?: string;
    album?: string | null;
    videoId: string;
    playlistId?: string;
    mediaType: MediaType;
}

export interface PlayerState {
    song: Song | null;
    isPlaying: boolean,
    muted: boolean,
    position: number,
    repeat: Repeat,
    volume: number,
}

export type Repeat = "NONE" | "ONE" | "ALL";

function getRepeatIterations(current: Repeat, wanted: Repeat): number {
    const repeats: Repeat[] = ["NONE", "ONE", "ALL"];
    const currentIndex = repeats.indexOf(current);
    const wantedIndex = repeats.indexOf(wanted);

    return (wantedIndex - currentIndex + repeats.length) % repeats.length;
}
const logger = new Logger("YoutubeMusicControls");

type Message = { type: "PLAYER_STATE"; } & PlayerState;

class YoutubeMusicSocket {
    public onChange: (e: Message) => void;
    public ready = false;

    private socket: WebSocket | undefined;

    constructor(onChange: typeof this.onChange) {
        this.reconnect();
        this.onChange = onChange;
    }

    public scheduleReconnect(ms: number) {
        setTimeout(() => this.reconnect(), ms);
    }

    public reconnect() {
        if (this.ready) return;
        this.initWs();
    }

    get routes() {
        return {
            "play": () => this.sendRequest("post", "/api/v1/play"),
            "pause": () => this.sendRequest("post", "/api/v1/pause"),
            "previous": () => this.sendRequest("post", "/api/v1/previous"),
            "next": () => this.sendRequest("post", "/api/v1/next"),
            "seek": (seconds: number) => this.sendRequest("post", "/api/v1/seek-to", { headers: { "Content-Type": "application/json" }, body: { seconds } }),
            "shuffle": () => this.sendRequest("post", "/api/v1/shuffle"),
            "mute": () => this.sendRequest("post", "/api/v1/toggle-mute"),
            "setVolume": (percent: number) => this.sendRequest("post", "/api/v1/volume", { headers: { "Content-Type": "application/json" }, body: { volume: percent } }),
            "repeat": (repeatIterations: number) => this.sendRequest("post", "/api/v1/switch-repeat", { headers: { "Content-Type": "application/json" }, body: { iteration: repeatIterations } }),
        };
    }

    sendRequest(method: "post" | "get" | "put", route: string, data: any = {}) {
        const url = Settings.plugins.YouTubeMusicControls.apiServerUrl;
        if (url === "") return;
        fetch(url + route, {
            method,
            ...data,
            ...(data.body && { body: JSON.stringify(data.body) })
        });
    }

    private async initWs() {
        const url = Settings.plugins.YouTubeMusicControls.apiServerUrl;
        if (!url) {
            return;
        }

        try {
            this.socket = new WebSocket(new URL("/ws", url));
        } catch (e) {
            console.log("Failed to connect to YouTube Music WebSocket", e);
            return;
        }

        this.socket.addEventListener("open", () => {
            this.ready = true;
            this.routes.pause();
            this.routes.play();
        });

        this.socket.addEventListener("error", e => {
            this.ready = false;
            if (!this.ready) this.scheduleReconnect(5_000);
            this.onChange({ type: "PLAYER_STATE", song: null, isPlaying: false, position: 0, repeat: "NONE", volume: 0, muted: false });

        });

        this.socket.addEventListener("close", e => {
            this.ready = false;
            if (!this.ready) this.scheduleReconnect(10_000);
            this.onChange({ type: "PLAYER_STATE", song: null, isPlaying: false, position: 0, repeat: "NONE", volume: 0, muted: false });
        });


        this.socket.addEventListener("message", e => {
            let message: Message;
            try {
                message = JSON.parse(e.data) as Message;

                switch (message.type) {
                    case "PLAYER_STATE":
                        this.onChange(message);
                        break;
                }
            } catch (err) {
                logger.error("Invalid JSON:", err, `\n${e.data}`);
                return;
            }
        });
    }
}

export const YoutubeMusicStore = proxyLazyWebpack(() => {
    const { Store } = Flux;

    class YoutubeMusicStore extends Store {
        public mPosition = 0;
        private start = 0;

        public song: Song | null = null;
        public isPlaying = false;
        public repeat: Repeat = "NONE";
        public shuffle = false;
        public volume = 0;
        public muted = false;

        public socket = new YoutubeMusicSocket((message: Message) => {
            if (message.song) {
                store.song = message.song;
                store.position = message.song.elapsedSeconds ?? 0;
            }
            if (message.isPlaying != null) store.isPlaying = message.isPlaying;
            if (message.position && message.position !== store.position) store.position = message.position ?? 0;
            if (message.volume) store.volume = message.volume ?? 0;
            if (message.repeat) store.repeat = message.repeat;
            if (message.muted != null) store.muted = message.muted;

            store.emitChange();
        });

        public openExternal(path: string) {
            const videoId = path.match(/watch\?v=([\w-]+)/);

            const url = (Settings.plugins.YouTubeMusicControls.useYoutubeMusicUri || Vencord.Plugins.isPluginEnabled("OpenInApp")) && videoId
                ? encodeURI("youtubemusic://openVideo " + videoId[1])
                : "https://music.youtube.com" + path;

            VencordNative.native.openExternal(url);
        }

        set position(p: number) {
            this.mPosition = p * 1000;
            this.start = Date.now();
        }

        get position(): number {
            let pos = this.mPosition;
            if (this.isPlaying) {
                pos += Date.now() - this.start;
            }
            return pos;
        }

        previous() {
            if (!this.ensureSocketReady()) return;
            this.socket.routes.previous();
        }
        next() {
            if (!this.ensureSocketReady()) return;
            this.socket.routes.next();
        }
        setVolume(percent: number) {
            if (!this.ensureSocketReady()) return;
            this.socket.routes.setVolume(Math.round(percent));
            this.volume = percent;
            this.emitChange();
        }
        setPlaying(playing: boolean) {
            if (!this.ensureSocketReady()) return;
            this.socket.routes[playing ? "play" : "pause"]();
            this.isPlaying = playing;
        }
        setRepeat(state: Repeat) {
            if (!this.ensureSocketReady()) return;
            this.socket.routes.repeat(getRepeatIterations(this.repeat, state));
            this.repeat = state;
            this.emitChange();
        }
        setShuffle(state: boolean) {
            if (!this.ensureSocketReady()) return;
            this.socket.routes.shuffle();
            this.shuffle = state;
            this.emitChange();
        }
        seek(ms: number) {
            if (!this.ensureSocketReady()) return;
            this.socket.routes.seek(Math.floor(ms / 1000));
        }
        setMute(muted: boolean) {
            if (!this.ensureSocketReady()) return;
            this.socket.routes.mute();
            this.muted = muted;
            this.emitChange();
        }

        private ensureSocketReady(): boolean {
            if (!this.socket || !this.socket.ready) {
                return false;
            }
            return true;
        }
    }

    const store = new YoutubeMusicStore(FluxDispatcher);

    return store;
});
