import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { AppUpdate, AppUpdateAvailability, AppUpdateInfo, AppUpdateResult } from '@capawesome/capacitor-app-update';

import packageJson from '../../../../package.json';

@Injectable({
  providedIn: 'root',
})
export class AppVersionService {

  async getAppUpdateInfo(): Promise<AppUpdateInfo | null> {
    if (!Capacitor.isNativePlatform()) return null;

    try {
      return await AppUpdate.getAppUpdateInfo();
    } catch (e: any) {
      console.warn('App update check skipped:', e?.message ?? e);
      return null;
    }
  }

  async openAppStore(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    await AppUpdate.openAppStore();
  }

  async performImmediateUpdate(): Promise<AppUpdateResult | void> {
    if (Capacitor.getPlatform() !== 'android') return;

    const result = await AppUpdate.getAppUpdateInfo();
    if (result.updateAvailability !== AppUpdateAvailability.UPDATE_AVAILABLE) return;
    if (result.immediateUpdateAllowed) {
      return await AppUpdate.performImmediateUpdate();
    }
  }

  async startFlexibleUpdate(): Promise<AppUpdateResult | void> {
    if (Capacitor.getPlatform() !== 'android') return;

    const result = await AppUpdate.getAppUpdateInfo();
    if (result.updateAvailability !== AppUpdateAvailability.UPDATE_AVAILABLE) return;
    if (result.flexibleUpdateAllowed) {
      return await AppUpdate.startFlexibleUpdate();
    }
  }

  async completeFlexibleUpdate(): Promise<void> {
    if (Capacitor.getPlatform() !== 'android') return;
    await AppUpdate.completeFlexibleUpdate();
  }

  async getAppVersion(): Promise<string> {
    if (!Capacitor.isNativePlatform()) return packageJson.version;

    try {
      const result = await AppUpdate.getAppUpdateInfo();
      return Capacitor.getPlatform() === 'android'
        ? result.currentVersionCode?.toString() ?? packageJson.version
        : result.currentVersionName ?? packageJson.version;
    } catch {
      return packageJson.version;
    }
  }
}