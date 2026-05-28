import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';

import { Platform } from '@ionic/angular';

import {
  IonContent,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonGrid,
  IonRow,
  IonCol,
  IonList,
  IonItem,
  IonIcon,
  IonModal,
  IonToggle,
  IonLabel,
  AlertController,
  ToastController,
  ActionSheetController,
  ModalController,
  IonSpinner
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  close,
  logOutOutline,
  logoUsd,
  languageOutline,
  notificationsOutline,
  fingerPrintOutline,
  codeOutline,
  linkOutline,
  eyeOffOutline,
  logoChrome,
  logoGithub,
  logoDiscord,
  starOutline,
  keypadOutline,
  lockClosedOutline,
  swapVerticalOutline,
  cloudUploadOutline,
  cloudDownloadOutline
} from 'ionicons/icons';

import { CurrencyComponent } from './currency/currency.component';
import { LanguageComponent } from './language/language.component';
import { PinLoginComponent } from 'src/app/security/shared/pin-login/pin-login.component';
import { PinSetupComponent } from 'src/app/security/shared/pin-setup/pin-setup.component';
import { PasswordLoginComponent } from 'src/app/security/shared/password-login/password-login.component';
import { PasswordSetupComponent } from 'src/app/security/shared/password-setup/password-setup.component';
import { BiometricLoginComponent } from 'src/app/security/shared/biometric-login/biometric-login.component';
import { BiometricSetupComponent } from 'src/app/security/shared/biometric-setup/biometric-setup.component';
import { BackupComponent } from '../backup/backup.component';

import { Currency } from 'src/models/currency.model';
import { LanguageTranslation } from 'src/models/language-translation.model';
import { Network } from 'src/models/network.model';
import { Auth } from 'src/models/auth.model';

import { EnvironmentService } from 'src/app/api/environment/environment.service';
import { AuthService } from 'src/app/api/auth/auth.service';
import { SettingsService } from 'src/app/api/settings/settings.service';
import { WalletsService } from 'src/app/api/wallets/wallets.service';
import { BiometricService } from 'src/app/api/biometric/biometric.service';
import { EncryptionService } from 'src/app/api/encryption/encryption.service';
import { AppVersionService } from 'src/app/api/app-version/app-version.service';

import { TranslatePipe } from '@ngx-translate/core';
import { RestoreComponent } from '../restore/restore.component';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonGrid,
    IonRow,
    IonCol,
    IonList,
    IonItem,
    IonIcon,
    IonModal,
    IonToggle,
    IonLabel,
    CurrencyComponent,
    LanguageComponent,
    TranslatePipe,
    PinLoginComponent,
    PinSetupComponent,
    PasswordLoginComponent,
    PasswordSetupComponent,
    BiometricLoginComponent,
    BiometricSetupComponent,
    BackupComponent,
    RestoreComponent,
  ]
})

export class SettingsComponent implements OnInit {
  @ViewChild('currencyModal', { read: IonModal }) currencyModal!: IonModal;
  @ViewChild('languageModal', { read: IonModal }) languageModal!: IonModal;
  @ViewChild('backupAndRestoreModal', { read: IonModal }) backupAndRestoreModal!: IonModal;
  @ViewChild('backupModal', { read: IonModal }) backupModal!: IonModal;
  @ViewChild('restoreModal', { read: IonModal }) restoreModal!: IonModal;
  @ViewChild('confirmBiometricModal', { read: IonModal }) confirmBiometricModal!: IonModal;
  @ViewChild('confirmChangePinModal', { read: IonModal }) confirmChangePinModal!: IonModal;
  @ViewChild('confirmChangePasswordModal', { read: IonModal }) confirmChangePasswordModal!: IonModal;

  constructor(
    private environmentService: EnvironmentService,
    private authService: AuthService,
    private settingsService: SettingsService,
    private walletsService: WalletsService,
    private actionSheetController: ActionSheetController,
    private toastController: ToastController,
    private alertController: AlertController,
    private encryptionService: EncryptionService,
    private biometricService: BiometricService,
    private appVersionService: AppVersionService,
    private modalController: ModalController,
    private router: Router,
    private platform: Platform

  ) {
    addIcons({
      close,
      logOutOutline,
      logoUsd,
      languageOutline,
      notificationsOutline,
      fingerPrintOutline,
      codeOutline,
      linkOutline,
      eyeOffOutline,
      logoChrome,
      logoGithub,
      logoDiscord,
      starOutline,
      keypadOutline,
      lockClosedOutline,
      swapVerticalOutline,
      cloudUploadOutline,
      cloudDownloadOutline,
    });
  }

  isChromeExtension = false;

  selectedCurrency: Currency = new Currency();
  selectedLanguage: LanguageTranslation = new LanguageTranslation();
  code: string = '';

  isZeroBalancesHidden: boolean = false;

  isNotificationsEnabled: boolean = false;

  isTestnetEnabled: boolean = false;

  currentAuth: Auth | null = null;

  isBiometricEnabled: boolean = false;
  biometricState: 'enabled' | 'disabled' | 'setup-pin' | 'setup-password' | 'setup-biometric' | null = null;
  decryptedPin: string = '';
  decryptedBiometricCredentials: string = '';

  changePinState: 'pin' | 'setup-pin' | null = null;

  decryptedPassword: string = '';
  changePasswordState: 'password' | 'setup-password' | null = null;

  isBackupProcessing: boolean = false;
  isRestoreProcessing: boolean = false;

  appVersion: string = '';

  async openBackupAndRestoreModal() {
    this.backupAndRestoreModal.present();
  }

  async openBackupModal() {
    this.backupModal.present();
  }

  async openRestoreModal() {
    this.restoreModal.present();
  }

  async confirmLogout() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Are you sure you want to logout?',
      subHeader: 'You will need to login again.',
      buttons: [
        {
          text: 'Logout',
          role: 'destructive',
          handler: async () => {
            await this.authService.logout();

            actionSheet.dismiss();

            const toast = await this.toastController.create({
              message: 'Logged out successfully!',
              color: 'success',
              duration: 1500,
              position: 'top'
            });

            await toast.present();
          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  async openCurrencyModal() {
    this.currencyModal.present();
  }

  async openLanguageModal() {
    this.languageModal.present();
  }

  async goToConnectAccounts() {
    this.modalController.dismiss();

    let origin = window.location.origin;

    if (this.isChromeExtension) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tabs[0].url;

      if (url) {
        origin = new URL(url).origin;
      }
    }

    this.router.navigate(['/web3/connect-accounts'], {
      queryParams: {
        origin: origin
      }
    });
  }

  async selectCurrency(currency: Currency) {
    const currencies = await this.settingsService.get();

    if (currencies) {
      currencies.user_preferences.currency.code = currency.code;
      currencies.user_preferences.currency.symbol = currency.symbol;

      await this.settingsService.set(currencies);
    }

    this.selectedCurrency = currency;
    this.currencyModal.dismiss();
  }

  async selectLanguage(language: LanguageTranslation) {
    const languages = await this.settingsService.get();

    if (languages) {
      languages.user_preferences.language.code = language.code;
      languages.user_preferences.language.name = language.name;
      languages.user_preferences.language.nativeName = language.nativeName;

      await this.settingsService.set(languages);
    }

    this.selectedLanguage = language;
    this.languageModal.dismiss();
  }

  async hideZeroBalances(event: any): Promise<void> {
    const isHidden = event.detail.checked;
    const settings = await this.settingsService.get();

    if (settings) {
      settings.user_preferences.hide_zero_balances = isHidden;
      await this.settingsService.set(settings);

      this.isZeroBalancesHidden = isHidden;
    }
  }

  async enableNotifications(event: any): Promise<void> {
    const isEnabled = event.detail.checked;
    const settings = await this.settingsService.get();

    if (settings) {
      settings.user_preferences.notifications_enabled = isEnabled;
      await this.settingsService.set(settings);

      this.isNotificationsEnabled = isEnabled;
    }
  }

  async enableTestnet(event: any): Promise<void> {
    const settings = await this.settingsService.get();
    if (settings) {
      settings.user_preferences.testnet_enabled = event.target.checked;
      await this.settingsService.set(settings);

      if (event.detail.checked) {
        const alert = await this.alertController.create({
          header: 'Enable Testnet',
          message: 'By enabling testnet, you can access test networks like Rococo and Paseo. Please note that test networks may be unstable and are intended for development and testing purposes only.',
          buttons: [
            {
              text: 'Ok',
              role: 'confirm'
            },
          ],
        });

        await alert.present();
        this.isTestnetEnabled = true;
      } else {
        const wallets = await this.walletsService.getAllWallets();
        if (wallets.length > 0) {
          const currentWallet = await this.walletsService.getCurrentWallet();
          if (currentWallet) {
            if (currentWallet.chain.network !== Network.Polkadot) {
              const firstWallet = wallets[0];
              if (firstWallet) {
                await this.walletsService.setCurrentWallet(firstWallet.id);
              }
            }
          }
        }
        this.isTestnetEnabled = false;
      }
    }
  }

  async enableBiometric(event: any) {
    const enable = event.detail.checked;

    if (enable) {
      const alert = await this.alertController.create({
        header: 'Enable Biometric',
        message: 'Are you sure you want to enable biometric authentication?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => {
              this.isBiometricEnabled = false;
            }
          },
          {
            text: 'Yes',
            role: 'confirm',
            handler: async () => {
              this.biometricState = 'enabled';
              this.getCurrentAuth();

              await this.confirmBiometricModal.present();
            }
          }
        ]
      });

      await alert.present();
      return;
    }

    const alert = await this.alertController.create({
      header: 'Disable Biometric',
      message: 'Are you sure you want to disable biometric authentication?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            this.isBiometricEnabled = false;
          }
        },
        {
          text: 'Yes',
          role: 'confirm',
          handler: async () => {
            this.biometricState = 'disabled';
            this.getCurrentAuth();

            await this.confirmBiometricModal.present();
          }
        }
      ]
    });

    await alert.present();
  }

  async confirmBiometriclDismiss(event: any): Promise<void> {
    const settings = await this.settingsService.get();
    if (settings) {
      this.isBiometricEnabled = settings.user_preferences.biometric_enabled;
    }
  }

  async confirmBiometric(oldPassword: string) {
    this.decryptedBiometricCredentials = oldPassword;

    this.biometricState = 'setup-pin';
    if (this.isChromeExtension) {
      this.biometricState = 'setup-password';
    }
  }

  async onPinOrPasswordSetup(newPassword: string) {
    if (!newPassword) {
      const toast = await this.toastController.create({
        message: 'PIN was not provided. Please try again.',
        color: 'danger',
        duration: 2000,
        position: 'top',
      });

      await toast.present();
      return;
    }

    const wallets = await this.walletsService.getAllWallets();

    const decryptedWallets = await Promise.all(
      wallets.map(async wallet => ({
        id: wallet.id,
        mnemonic: await this.encryptionService.decrypt(wallet.mnemonic_phrase, this.decryptedBiometricCredentials),
        privateKey: await this.encryptionService.decrypt(wallet.private_key, this.decryptedBiometricCredentials)
      }))
    );

    const encryptedPassword = await this.encryptionService.encrypt(newPassword, newPassword);
    await this.authService.setupPassword(encryptedPassword, 'pin');

    for (const wallet of decryptedWallets) {
      const encryptedMnemonic = await this.encryptionService.encrypt(wallet.mnemonic, newPassword);
      const encryptedPrivateKey = await this.encryptionService.encrypt(wallet.privateKey, newPassword);

      await this.walletsService.update(wallet.id, {
        mnemonic_phrase: encryptedMnemonic,
        private_key: encryptedPrivateKey
      });
    }

    const settings = await this.settingsService.get();
    if (settings) {
      settings.user_preferences.biometric_enabled = false;
      await this.settingsService.set(settings);

      this.isBiometricEnabled = false;
    }

    this.decryptedBiometricCredentials = '';
    await this.getCurrentAuth();
    await this.confirmBiometricModal.dismiss();

    await this.biometricService.disableBiometric();

    const toast = await this.toastController.create({
      message: 'Biometric disabled.',
      color: 'success',
      duration: 1500,
      position: 'top',
    });

    await toast.present();
  }

  async confirmPinOrPassword(oldPassword: string) {
    this.decryptedPin = oldPassword;
    this.biometricState = 'setup-biometric';
  }

  async onBiometricSetup(newPassword: string) {
    const wallets = await this.walletsService.getAllWallets();

    const decryptedWallets = await Promise.all(
      wallets.map(async wallet => ({
        id: wallet.id,
        mnemonic: await this.encryptionService.decrypt(wallet.mnemonic_phrase, this.decryptedPin),
        privateKey: await this.encryptionService.decrypt(wallet.private_key, this.decryptedPin)
      }))
    );

    for (const wallet of decryptedWallets) {
      const encryptedMnemonic = await this.encryptionService.encrypt(wallet.mnemonic, newPassword);
      const encryptedPrivateKey = await this.encryptionService.encrypt(wallet.privateKey, newPassword);
      await this.walletsService.update(wallet.id, {
        mnemonic_phrase: encryptedMnemonic,
        private_key: encryptedPrivateKey
      });
    }

    const settings = await this.settingsService.get();
    if (settings) {
      settings.user_preferences.biometric_enabled = true;
      await this.settingsService.set(settings);

      this.isBiometricEnabled = true;
    };

    this.decryptedPin = '';
    await this.getCurrentAuth();
    await this.confirmBiometricModal.dismiss();

    const toast = await this.toastController.create({
      message: 'Biometric enable.',
      color: 'success',
      duration: 1500,
      position: 'top',
    });
    await toast.present();
  }

  async getCurrentAuth(): Promise<void> {
    const auth = await this.authService.getAuth();
    if (auth) {
      this.currentAuth = auth;
    }
  }

  async changePinModal() {
    await this.getCurrentAuth();
    this.changePinState = 'pin';
    await this.confirmChangePinModal.present()
  }

  async confirmPin(oldPin: string) {
    this.decryptedPin = oldPin;
    this.changePinState = 'setup-pin';
  }

  async onChangePinSetup(newPin: string) {
    if (!newPin) {
      const toast = await this.toastController.create({
        message: 'PIN was not provided. Please try again.',
        color: 'danger',
        duration: 2000,
        position: 'top',
      });

      await toast.present();
      return;
    }

    const wallets = await this.walletsService.getAllWallets();

    const decryptedWallets = await Promise.all(
      wallets.map(async wallet => ({
        id: wallet.id,
        mnemonic: await this.encryptionService.decrypt(wallet.mnemonic_phrase, this.decryptedPin),
        privateKey: await this.encryptionService.decrypt(wallet.private_key, this.decryptedPin)
      }))
    );

    const encryptedPassword = await this.encryptionService.encrypt(newPin, newPin);
    await this.authService.setupPassword(encryptedPassword, 'pin');

    for (const wallet of decryptedWallets) {
      const encryptedMnemonic = await this.encryptionService.encrypt(wallet.mnemonic, newPin);
      const encryptedPrivateKey = await this.encryptionService.encrypt(wallet.privateKey, newPin);

      await this.walletsService.update(wallet.id, {
        mnemonic_phrase: encryptedMnemonic,
        private_key: encryptedPrivateKey
      });
    }

    this.decryptedPin = '';
    await this.confirmChangePinModal.dismiss();

    const toast = await this.toastController.create({
      message: 'PIN changed successfully.',
      color: 'success',
      duration: 1500,
      position: 'top',
    });

    await toast.present();
  }

  async changePasswordModal() {
    await this.getCurrentAuth();
    this.changePasswordState = 'password';
    await this.confirmChangePasswordModal.present()
  }

  async confirmPassword(oldPassword: string) {
    this.decryptedPassword = oldPassword;
    this.changePasswordState = 'setup-password';
  }

  async onChangePasswordSetup(newPassword: string) {
    if (!newPassword) {
      const toast = await this.toastController.create({
        message: 'Password was not provided. Please try again.',
        color: 'danger',
        duration: 2000,
        position: 'top',
      });

      await toast.present();
      return;
    }

    const wallets = await this.walletsService.getAllWallets();

    const decryptedWallets = await Promise.all(
      wallets.map(async wallet => ({
        id: wallet.id,
        mnemonic: await this.encryptionService.decrypt(wallet.mnemonic_phrase, this.decryptedPassword),
        privateKey: await this.encryptionService.decrypt(wallet.private_key, this.decryptedPassword)
      }))
    );

    const encryptedPassword = await this.encryptionService.encrypt(newPassword, newPassword);
    await this.authService.setupPassword(encryptedPassword, 'password');

    for (const wallet of decryptedWallets) {
      const encryptedMnemonic = await this.encryptionService.encrypt(wallet.mnemonic, newPassword);
      const encryptedPrivateKey = await this.encryptionService.encrypt(wallet.privateKey, newPassword);

      await this.walletsService.update(wallet.id, {
        mnemonic_phrase: encryptedMnemonic,
        private_key: encryptedPrivateKey
      });
    }

    this.decryptedPassword = '';
    await this.confirmChangePasswordModal.dismiss();

    const toast = await this.toastController.create({
      message: 'Password changed successfully.',
      color: 'success',
      duration: 1500,
      position: 'top',
    });

    await toast.present();
  }

  rateUs() {
    if (this.platform.is('android')) {
      window.open(
        'https://play.google.com/store/apps/details?id=com.xterium.wallet',
        '_blank'
      );
    } else if (this.platform.is('ios')) {
      window.open(
        'https://apps.apple.com/ph/app/xterium/id6745164228',
        '_blank'
      );
    } else {
      window.open(
        'https://chromewebstore.google.com/detail/xterium/klfhdmiebenifpdmdmkjicdohjilabdg/reviews',
        '_blank'
      );
    }
  }

  goToDiscord() {
    window.open('https://discord.gg/xPDSf5BZ', '_blank');
  }

  goToWebsite() {
    window.open('https://xterium.app', '_blank');
  }

  goToGithub() {
    window.open('https://github.com/Xode-DAO/xterium-wallet-v2', '_blank');
  }

  async fetchData(): Promise<void> {
    this.isChromeExtension = this.environmentService.isChromeExtension();

    const settings = await this.settingsService.get();
    if (settings) {
      this.selectedCurrency = settings.user_preferences.currency;
      this.selectedLanguage = settings.user_preferences.language;
      this.isZeroBalancesHidden = settings.user_preferences.hide_zero_balances;
      this.isNotificationsEnabled = settings.user_preferences.notifications_enabled;
      this.isTestnetEnabled = settings.user_preferences.testnet_enabled;

      await this.getCurrentAuth();

      if (this.currentAuth) {
        if (this.currentAuth.type === 'biometric') {
          settings.user_preferences.biometric_enabled = true;
          this.isBiometricEnabled = true;
        }
      }

      await this.settingsService.set(settings);
    }

    this.appVersion = await this.appVersionService.getAppVersion();
  }

  ngOnInit() {
    this.fetchData();
  }
}
