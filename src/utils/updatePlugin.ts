import { registerPlugin } from '@capacitor/core';

export interface UpdatePluginContract {
    checkUpdate(): Promise<{ status: string }>;
    downloadUpdate(options: { url: string }): Promise<{ status: string }>;
    getAppVersion(): Promise<{ versionName: string; versionCode: number }>;
}

export const UpdatePlugin = registerPlugin<UpdatePluginContract>('UpdatePlugin');
