import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { StatusBar, Style } from '@capacitor/status-bar';
import { LocalNotifications } from '@capacitor/local-notifications';

import { Platform } from '@ionic/angular';
import {
  IonApp,
  IonRouterOutlet,
} from '@ionic/angular/standalone';

import { TranslateService } from '@ngx-translate/core';

import { EnvironmentService } from 'src/app/api/environment/environment.service';
import { DeepLinkService } from 'src/app/api/deep-link/deep-link.service';
import { WalletsService } from './api/wallets/wallets.service';
import { ChainsService } from './api/chains/chains.service';
import { SettingsService } from 'src/app/api/settings/settings.service';

import { SocialLogin } from '@capgo/capacitor-social-login';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonApp,
    IonRouterOutlet,
  ],
})
export class AppComponent {

  constructor(
    private platform: Platform,
    private environmentService: EnvironmentService,
    private deepLinkService: DeepLinkService,
    private translate: TranslateService,
    private walletsService: WalletsService,
    private chainsService: ChainsService,
    private settingsService: SettingsService,
  ) {
    this.initApp();
  }

  isChromeExtension = false;

  initApp() {
    this.platform.ready().then(async () => {
      this.isChromeExtension = this.environmentService.isChromeExtension();

      this.initLanguage();

      await this.initStatusBar();
      await this.initNotifications();

      this.initDeepLinks();
      this.initSocialLogin();

      await this.initWalletsMetadata();
    });
  }

  async initWalletsMetadata(): Promise<void> {
    const wallets = await this.walletsService.getAllWallets();

    if (wallets.length > 0) {
      for (const wallet of wallets) {
        const chain = this.chainsService.getChainByChainId(wallet.chain.chain_id);
        if (chain) {
          wallet.chain = chain;
          await this.walletsService.update(wallet.id, { chain });
        }
      }
    }

    const currentWallet = await this.walletsService.getCurrentWallet();
    if (currentWallet) {
      await this.walletsService.setCurrentWallet(currentWallet.id);
    }
  }

  async initLanguage(): Promise<void> {
    const settings = await this.settingsService.get();

    const language = settings?.user_preferences.language.code || 'en';

    this.translate.use(language);

    this.settingsService.currentSettingsObservable.subscribe(settings => {
      const newLanguage = settings?.user_preferences.language.code;
      if (newLanguage) {
        this.translate.use(newLanguage);
      }
    });
  }

  async initStatusBar(): Promise<void> {
    try {
      if (this.isChromeExtension) return;

      await StatusBar.setBackgroundColor({ color: '#1B1B1B' });
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setOverlaysWebView({ overlay: false });
    } catch (_) { }
  }

  async initNotifications(): Promise<void> {
    await LocalNotifications.requestPermissions();
  }

  initDeepLinks(): void {
    this.deepLinkService.initDeepLinks();
  }

  initSocialLogin(): void {
    SocialLogin.initialize({
      google: {
        // IMPORTANT: This must be a "Web application" OAuth client ID from GCP,
        // NOT the Android client ID. The Android client (with SHA-1) must also
        // exist in the same GCP project for Credential Manager to validate the app.
        webClientId: '89792893899-qf9nv28hnpk24pi0v85ge5dk3ihv05f1.apps.googleusercontent.com',
      }
    }).catch((err) => {
      console.error('[SocialLogin] Initialization failed:', err);
    });
  }
}
