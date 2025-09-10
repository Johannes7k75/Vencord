<<<<<<< HEAD
<<<<<<< HEAD
import { FluxStore } from "..";

export class StreamerModeStore extends FluxStore {
    enabled: boolean;
    autoToggle: boolean;
=======
=======
>>>>>>> 00340d6b09cebfb22b83e4f87c5f15d12dff1cde
import { FluxStore } from "@vencord/discord-types";

export class StreamerModeStore extends FluxStore {
    get autoToggle(): boolean;
    get disableNotifications(): boolean;
    get disableSounds(): boolean;
    get enableContentProtection(): boolean;
    get enabled(): boolean;
    get hideInstantInvites(): boolean;
    get hidePersonalInformation(): boolean;
<<<<<<< HEAD
>>>>>>> fbc2dbe78189dcfe9dc907058770e951730995bd
=======
>>>>>>> 00340d6b09cebfb22b83e4f87c5f15d12dff1cde
}
