import { IpcMainInvokeEvent } from "electron";
import { globalShortcut } from "electron";

let registeredGlobalShortcut: string | null = null;

export function registerShortcuts(e: IpcMainInvokeEvent, s, shortcut: string) {
    e.sender.executeJavaScript(`console.log('${s}', '${shortcut}')`);

    if (registeredGlobalShortcut) {
        unregisterShortcut(e);
    }
    registeredGlobalShortcut = shortcut;

    const startScreenshare = () => e.sender.executeJavaScript("Vencord.Plugins.plugins.ShortcuteScreenshare.startScreenshare()");

    globalShortcut.register(registeredGlobalShortcut, async () => {
        startScreenshare();
    });
}

export function unregisterShortcut(_: IpcMainInvokeEvent) {
    if (!registeredGlobalShortcut) {
        globalShortcut.unregisterAll();
        return;
    };
    if (globalShortcut.isRegistered(registeredGlobalShortcut)) globalShortcut.unregister(registeredGlobalShortcut);
    registeredGlobalShortcut = null;
}