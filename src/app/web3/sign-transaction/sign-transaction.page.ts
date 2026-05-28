import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ApiPromise } from '@polkadot/api';
import { ISubmittableResult, SignerPayloadJSON, SignerPayloadRaw, SignerResult } from '@polkadot/types/types';
import { HexString } from '@polkadot/util/types';
import { Bytes } from '@polkadot/types-codec';
import { decodeAddress } from '@polkadot/util-crypto';

import {
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonList,
  IonItem,
  IonText,
  IonTextarea,
  IonLabel,
  IonAvatar,
  IonButton,
  IonButtons,
  IonCard,
  IonFooter,
  IonIcon,
  IonChip,
  IonSpinner,
  IonModal,
  IonTitle,
  IonToolbar,
  IonToast,
  IonLoading,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  cube,
  cubeOutline,
  arrowUpOutline,
  arrowDownOutline,
  globeOutline,
  flame,
  close, checkmarkCircleOutline, warningOutline, alertCircleOutline } from 'ionicons/icons';

import { Network } from 'src/models/network.model';
import { Chain } from 'src/models/chain.model';
import { Wallet, WalletSigner } from 'src/models/wallet.model';
import { SignerPayloadTransactionHex } from 'src/models/web3-transactions.model';

import { EnvironmentService } from 'src/app/api/environment/environment.service';
import { AuthService } from 'src/app/api/auth/auth.service';
import { BiometricService } from 'src/app/api/biometric/biometric.service';
import { UtilsService } from 'src/app/api/polkadot/utils/utils.service';
import { PolkadotJsService } from 'src/app/api/polkadot/blockchains/polkadot-js/polkadot-js.service';
import { PolkadotService } from 'src/app/api/polkadot/blockchains/polkadot-js/polkadot/polkadot.service';
import { AssethubPolkadotService } from 'src/app/api/polkadot/blockchains/polkadot-js/assethub-polkadot/assethub-polkadot.service';
import { XodePolkadotService } from 'src/app/api/polkadot/blockchains/polkadot-js/xode-polkadot/xode-polkadot.service';
import { HydrationPolkadotService } from 'src/app/api/polkadot/blockchains/polkadot-js/hydration-polkadot/hydration-polkadot.service';
import { XodePaseoService } from 'src/app/api/polkadot/blockchains/polkadot-js/xode-paseo/xode-paseo.service';
import { PolarisService } from 'src/app/api/polkadot/blockchains/polkadot-js/polaris/polaris.service';
import { EncryptionService } from 'src/app/api/encryption/encryption.service';
import { WalletsService } from 'src/app/api/wallets/wallets.service';
import { BalancesService } from 'src/app/api/balances/balances.service';
import { SettingsService } from 'src/app/api/settings/settings.service';
import { LocalNotificationsService } from 'src/app/api/local-notifications/local-notifications.service';

import { Auth } from 'src/models/auth.model';

import { PasswordSetupComponent } from 'src/app/security/shared/password-setup/password-setup.component';
import { PasswordLoginComponent } from 'src/app/security/shared/password-login/password-login.component';
import { PinSetupComponent } from 'src/app/security/shared/pin-setup/pin-setup.component';
import { PinLoginComponent } from 'src/app/security/shared/pin-login/pin-login.component';
import { BiometricLoginComponent } from 'src/app/security/shared/biometric-login/biometric-login.component';

import { TranslatePipe } from '@ngx-translate/core';
import { ChainsService } from 'src/app/api/chains/chains.service';

@Component({
  selector: 'app-sign-transaction',
  templateUrl: './sign-transaction.page.html',
  styleUrls: ['./sign-transaction.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonList,
    IonItem,
    IonText,
    IonTextarea,
    IonLabel,
    IonAvatar,
    IonButton,
    IonButtons,
    IonCard,
    IonFooter,
    IonIcon,
    IonChip,
    IonSpinner,
    IonModal,
    IonTitle,
    IonToolbar,
    IonToast,
    IonLoading,
    PasswordSetupComponent,
    PasswordLoginComponent,
    PinSetupComponent,
    PinLoginComponent,
    BiometricLoginComponent,
    TranslatePipe,
  ],
})
export class SignTransactionPage implements OnInit {
  @ViewChild('confirmSignTransactionModal', { read: IonModal }) confirmSignTransactionModal!: IonModal;
  @ViewChild('postSignModal', { read: IonModal }) postSignModal!: IonModal;
  @ViewChild('noWalletModal', { read: IonModal }) noWalletModal!: IonModal;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private environmentService: EnvironmentService,
    private chainsService: ChainsService,
    private authService: AuthService,
    private biometricService: BiometricService,
    private utilsService: UtilsService,
    private polkadotService: PolkadotService,
    private assethubPolkadotService: AssethubPolkadotService,
    private xodePolkadotService: XodePolkadotService,
    private hydrationPolkadotService: HydrationPolkadotService,
    private xodePaseoService: XodePaseoService,
    private polarisService: PolarisService,
    private walletsService: WalletsService,
    private encryptionService: EncryptionService,
    private balancesService: BalancesService,
    private settingsService: SettingsService,
    private localNotificationsService: LocalNotificationsService,
    private toastController: ToastController,
    private loadingController: LoadingController,
  ) {
    addIcons({warningOutline,alertCircleOutline,arrowUpOutline,globeOutline,flame,close,checkmarkCircleOutline,cube,cubeOutline,arrowDownOutline});
  }

  private pjsApiMap: Map<number, ApiPromise> = new Map();
  get pjsApi(): ApiPromise | undefined {
    return this.pjsApiMap.get(this.currentWallet?.chain?.chain_id);
  }

  isChromeExtension = false;

  currentAuth: Auth | null = null;
  isBiometricAvailable = false;

  currentWallet: Wallet = new Wallet();
  currentWalletPublicAddress: string = '';

  extrinsic: string = "";
  estimatedFee: number = 0;
  isLoadingFee: boolean = true;

  rawData: string | null = null;

  isProcessing: boolean = false;

  paramsIsXterium: boolean = false;
  paramsSigningType: 'signPayload' | 'signRaw' | 'signTransactionHex' | null = null;
  paramsPayload: SignerPayloadJSON | SignerPayloadRaw | SignerPayloadTransactionHex | null = null;
  paramsCallbackUrl: string | null = null;

  postSignature: string = '';
  postSignedHex: string = '';
  postCallbackUrl: string | null = null;

  isWalletNotFound: boolean = false;

  async encodePublicAddressByChainFormat(publicKey: string, chain: Chain): Promise<string> {
    const publicKeyUint8 = new Uint8Array(
      publicKey.split(',').map(byte => Number(byte.trim()))
    );

    const ss58Format = typeof chain.address_prefix === 'number' ? chain.address_prefix : 0;
    return await this.utilsService.encodePublicAddressByChainFormat(publicKeyUint8, ss58Format);
  }

  async getCurrentWallet(): Promise<void> {
    const currentWallet = await this.walletsService.getCurrentWallet();
    if (currentWallet) {
      this.currentWallet = currentWallet;
      this.currentWalletPublicAddress = await this.encodePublicAddressByChainFormat(this.currentWallet.public_key, this.currentWallet.chain)
    }
  }

  async checkWalletExists(address: string, genesisHash: HexString): Promise<boolean> {
    const decodedAddress = decodeURIComponent(address);
    const selectedPublicKey = decodeAddress(decodedAddress);

    const allWallets = await this.walletsService.getAllWallets();
    if (allWallets.length === 0) return false;

    const walletsByChain = allWallets.filter(wallet => wallet.chain.genesis_hash === genesisHash);
    if (walletsByChain.length === 0) return false;

    const index = walletsByChain.findIndex(wallet => {
      const walletPublicKey = new Uint8Array(
        wallet.public_key.split(',').map(byte => Number(byte.trim()))
      );
      return walletPublicKey.length === selectedPublicKey.length &&
        walletPublicKey.every((byte, i) => byte === selectedPublicKey[i]);
    });

    return index >= 0;
  }

  async replaceCurrentWallet(address: string, genesisHash: HexString): Promise<void> {
    const decodedAddress = decodeURIComponent(address);
    const selectedPublicKey = decodeAddress(decodedAddress);

    const allWallets = await this.walletsService.getAllWallets();
    if (allWallets.length > 0) {
      const walletsByChain = allWallets.filter(wallet => wallet.chain.genesis_hash === genesisHash);
      if (walletsByChain.length > 0) {
        const walletsPublicAddresses = await Promise.all(
          walletsByChain.map(wallet => this.encodePublicAddressByChainFormat(wallet.public_key, wallet.chain))
        );

        const index = walletsByChain.findIndex(wallet => {
          const walletPublicKey = new Uint8Array(
            wallet.public_key.split(',').map(byte => Number(byte.trim()))
          );

          return walletPublicKey.length === selectedPublicKey.length &&
            walletPublicKey.every((byte, i) => byte === selectedPublicKey[i]);
        });

        if (index >= 0) {
          this.currentWallet = walletsByChain[index];
          this.currentWalletPublicAddress = walletsPublicAddresses[index];
        }
      }
    }
  }

  truncateAddress(address: string): string {
    return this.utilsService.truncateAddress(address);
  }

  formatBalance(amount: number, decimals: number): number {
    return this.balancesService.formatBalance(amount, decimals);
  }

  async initSecurity() {
    const auth = await this.authService.getAuth();
    if (auth) {
      this.currentAuth = auth;
    }

    const availability = await this.biometricService.isAvailable();
    this.isBiometricAvailable = availability.available;
  }

  async handleWalletNotFound(): Promise<never> {
    this.isWalletNotFound = true;
    this.isLoadingFee = false;
   
    throw new Error('Wallet not found.');
  }

  async initTransaction(): Promise<void> {
    await this.getCurrentWallet();

    this.route.queryParams.subscribe(async params => {
      if (params['isXterium']) {
        this.paramsIsXterium = params['isXterium'] === 'true';
      }

      if (params['signingType']) {
        const decodedSigningType = decodeURIComponent(params['signingType']);
        if (decodedSigningType === 'signPayload' || decodedSigningType === 'signRaw' || decodedSigningType === 'signTransactionHex') {
          this.paramsSigningType = decodedSigningType;
        } else {
          this.paramsSigningType = null;
        }
      }

      let service: PolkadotJsService | null = null;

      if (this.currentWallet.chain.network === Network.Polkadot && this.currentWallet.chain.chain_id === 0) service = this.polkadotService;
      if (this.currentWallet.chain.network === Network.Polkadot && this.currentWallet.chain.chain_id === 1000) service = this.assethubPolkadotService;
      if (this.currentWallet.chain.network === Network.Polkadot && this.currentWallet.chain.chain_id === 3417) service = this.xodePolkadotService;
      if (this.currentWallet.chain.network === Network.Polkadot && this.currentWallet.chain.chain_id === 2034) service = this.hydrationPolkadotService;
      if (this.currentWallet.chain.network === Network.Paseo && this.currentWallet.chain.chain_id === 5109) service = this.xodePaseoService;
      if (this.currentWallet.chain.network === Network.Rococo && this.currentWallet.chain.chain_id === 2000) service = this.polarisService;

      if (!service) return;

      let pjsApi = this.pjsApiMap.get(this.currentWallet.chain.chain_id);
      if (!pjsApi) {
        pjsApi = await service.connect();
        this.pjsApiMap.set(this.currentWallet.chain.chain_id, pjsApi);
      }

      if (!pjsApi.isConnected) {
        await pjsApi.connect()
      };

      if (params['payload']) {
        if (this.paramsSigningType === 'signPayload') {
          this.paramsPayload = JSON.parse(decodeURIComponent(params['payload']));
          const payloadJSON = this.paramsPayload as SignerPayloadJSON;

          const wallet = await this.checkWalletExists(payloadJSON.address, payloadJSON.genesisHash);
          if (!wallet) await this.handleWalletNotFound();
          await this.replaceCurrentWallet(payloadJSON.address, payloadJSON.genesisHash);

          if (!payloadJSON.method) {
            this.isLoadingFee = false;
            return;
          }

          const convertedHex = this.utilsService.normalizeToExtrinsicHex(payloadJSON.method, pjsApi);

          const extrinsic = pjsApi.registry.createType('Extrinsic', convertedHex);
          this.extrinsic = `${extrinsic.method.section}(${extrinsic.method.method})`;

          const estimatedFee = await service.getEstimatedFees(pjsApi, convertedHex, this.currentWalletPublicAddress, null);
          this.estimatedFee = estimatedFee;
          this.isLoadingFee = false;
        }

        if (this.paramsSigningType === 'signRaw') {
          this.paramsPayload = JSON.parse(decodeURIComponent(params['payload']));
          const payloadRaw = this.paramsPayload as SignerPayloadRaw;

          const genesisHash = pjsApi.genesisHash.toHex() as `0x${string}`;
          const wallet = await this.checkWalletExists(payloadRaw.address, genesisHash);
          if (!wallet) await this.handleWalletNotFound();
          await this.replaceCurrentWallet(payloadRaw.address, genesisHash);

          let decoded = new Bytes(pjsApi.registry, payloadRaw.data).toUtf8();
          if (decoded.startsWith('<Bytes>')) {
            decoded = decoded
              .replace(/^<Bytes>/, '')
              .replace(/<\/Bytes>$/, '');
          }

          this.rawData = decoded;
          this.isLoadingFee = false;
        }

        if (this.paramsSigningType === 'signTransactionHex') {
          this.paramsPayload = JSON.parse(decodeURIComponent(params['payload']));
          const payloadTransactionHex = this.paramsPayload as SignerPayloadTransactionHex;

          const wallet = await this.checkWalletExists(payloadTransactionHex.address, payloadTransactionHex.genesis_hash);
          if (!wallet) await this.handleWalletNotFound();
          await this.replaceCurrentWallet(payloadTransactionHex.address, payloadTransactionHex.genesis_hash);

          const convertedHex = this.utilsService.normalizeToExtrinsicHex(payloadTransactionHex.transaction_hex, pjsApi);

          const extrinsic = pjsApi.registry.createType('Extrinsic', convertedHex);
          this.extrinsic = `${extrinsic.method.section}(${extrinsic.method.method})`;

          const estimatedFee = await service.getEstimatedFees(pjsApi, convertedHex, this.currentWalletPublicAddress, null);
          this.estimatedFee = estimatedFee;
          this.isLoadingFee = false;
        }
      }

      if (params['callbackUrl']) {
        this.paramsCallbackUrl = decodeURIComponent(params['callbackUrl']);
      }
    });
  }

  navigateToOnboarding(modal: IonModal) {
    modal.dismiss();
    this.router.navigate(['/onboarding']);
  }

  async signTransactions() {
    if (this.isChromeExtension) {
      const result = await chrome.storage.session.get(["decrypted_password"]);
      const decryptedPassword = result["decrypted_password"];
      if (typeof decryptedPassword === "string") {
        this.confirmSignTransaction(decryptedPassword);
      } else {
        this.confirmSignTransactionModal.present();
      }
    } else {
      this.confirmSignTransactionModal.present();
    }
  }

  async confirmSignTransaction(decryptedPassword: string) {
    this.isProcessing = true;

    const loading = await this.loadingController.create({
      message: 'Processing your transaction...',
    });
    await loading.present();

    let service: PolkadotJsService | null = null;

    if (this.currentWallet.chain.network === Network.Polkadot && this.currentWallet.chain.chain_id === 0) service = this.polkadotService;
    if (this.currentWallet.chain.network === Network.Polkadot && this.currentWallet.chain.chain_id === 1000) service = this.assethubPolkadotService;
    if (this.currentWallet.chain.network === Network.Polkadot && this.currentWallet.chain.chain_id === 3417) service = this.xodePolkadotService;
    if (this.currentWallet.chain.network === Network.Polkadot && this.currentWallet.chain.chain_id === 2034) service = this.hydrationPolkadotService;
    if (this.currentWallet.chain.network === Network.Paseo && this.currentWallet.chain.chain_id === 5109) service = this.xodePaseoService;
    if (this.currentWallet.chain.network === Network.Rococo && this.currentWallet.chain.chain_id === 2000) service = this.polarisService;

    if (!service) return;

    const decryptedMnemonicPhrase = await this.encryptionService.decrypt(this.currentWallet.mnemonic_phrase, decryptedPassword);
    const decryptedPrivateKey = await this.encryptionService.decrypt(this.currentWallet.private_key, decryptedPassword);
    const walletSigner: WalletSigner = {
      mnemonic_phrase: decryptedMnemonicPhrase,
      public_key: this.currentWallet.public_key,
      private_key: decryptedPrivateKey,
      derivation_path: this.currentWallet.derivation_path,
    };

    let pjsApi = this.pjsApiMap.get(this.currentWallet.chain.chain_id);
    if (!pjsApi) {
      pjsApi = await service.connect();
      this.pjsApiMap.set(this.currentWallet.chain.chain_id, pjsApi);
    }

    if (!pjsApi.isConnected) {
      await pjsApi.connect()
    };

    let signedResult: SignerResult | HexString | null = null;

    if (this.paramsSigningType === 'signPayload') {
      const payloadJSON = this.paramsPayload as SignerPayloadJSON;
      signedResult = service.sign(
        pjsApi,
        payloadJSON,
        walletSigner
      );
    } else if (this.paramsSigningType === 'signRaw') {
      const payloadRaw = this.paramsPayload as SignerPayloadRaw;
      signedResult = service.sign(
        pjsApi,
        payloadRaw,
        walletSigner
      );
    } else if (this.paramsSigningType === 'signTransactionHex') {
      const payloadTransactionHex = this.paramsPayload as SignerPayloadTransactionHex;
      const convertedHex = this.utilsService.normalizeToExtrinsicHex(payloadTransactionHex.transaction_hex, pjsApi);

      signedResult = await service.signAsync(pjsApi, convertedHex as HexString, walletSigner);
    } else {
      const toast = await this.toastController.create({
        message: 'Invalid signing type.',
        color: 'danger',
        duration: 1500,
        position: 'top',
      });
      await toast.present();
    }

    if (signedResult) {
      if (this.paramsCallbackUrl && this.paramsCallbackUrl !== null) {
        setTimeout(async () => {
          await loading.dismiss();
          this.confirmSignTransactionModal.dismiss();
        }, 1500);

        this.postSignature = signedResult.signature.toString();

        if (signedResult.signedTransaction) {
          this.postSignedHex = signedResult.signedTransaction.toString();
          this.postCallbackUrl = `${this.paramsCallbackUrl}?signedTransactionHex=${encodeURIComponent(this.postSignedHex)}`;
        } else {
          this.postCallbackUrl = `${this.paramsCallbackUrl}?signature=${encodeURIComponent(this.postSignature)}`;
        }

        setTimeout(() => {
          if (this.postSignModal) {
            this.postSignModal.canDismiss = false;
            this.postSignModal.present();
          }
        }, 500);
      } else {
        if (this.isChromeExtension && !this.paramsIsXterium) {
          chrome.runtime.sendMessage({
            method: "signed-transaction",
            payload: signedResult
          });

          this.router.navigate(['/xterium/balances']);
          return;
        }

        if (signedResult.signedTransaction) {
          service.signAndSend(pjsApi, signedResult.signedTransaction.toString(), walletSigner).subscribe({
            next: async (event) => {
              setTimeout(async () => {
                await loading.dismiss();
                this.confirmSignTransactionModal.dismiss();
              }, 1500);

              this.router.navigate(['/xterium/balances']);

              this.handleTransactionEvent(event);
            },
            error: async (err) => {
              this.isProcessing = false;
            }
          });
        } else {
          this.postSignature = signedResult.signature.toString();

          setTimeout(async () => {
            await loading.dismiss();
            this.confirmSignTransactionModal.dismiss();
          }, 1500);

          setTimeout(() => {
            if (this.postSignModal) {
              this.postSignModal.canDismiss = false;
              this.postSignModal.present();
            }
          }, 500);
        }
      }
    } else {
      const toast = await this.toastController.create({
        message: 'Signing failed. Please try again.',
        color: 'danger',
        duration: 1500,
        position: 'top',
      });
      await toast.present();

      this.isProcessing = false;
    }
  }

  continueToApp() {
    if (this.postCallbackUrl) {
      window.open(this.postCallbackUrl, '_blank');
    }

    if (this.postSignModal) {
      this.postSignModal.canDismiss = true;
      this.postSignModal.dismiss();
    }

    setTimeout(() => {
      this.router.navigate(['/xterium/balances']);
    }, 500);
  }

  dismissPostSignModal() {
    this.postSignModal.canDismiss = true;
    this.postSignModal.dismiss();

    setTimeout(() => {
      this.router.navigate(['/xterium/balances']);
    }, 500);
  }

  async handleTransactionEvent(event: ISubmittableResult) {
    let title = '';
    let body = '';

    const eventStatus = event.status.type.toString();
    const txHashValue = event.txHash.toHex();
    const shortTxHash = `${txHashValue.slice(0, 6)}...${txHashValue.slice(-4)}`;

    switch (eventStatus) {
      case "Broadcast":
        title = "📤 Sending Your Transaction";
        body = `We’re starting to send your transaction. It’s on its way and will be processed shortly.\nRef: ${shortTxHash}`;
        break;

      case "InBlock":
        title = "✅ Transaction Sent";
        body = `Your transaction has been successfully sent and is now reflected in your account. You can check your updated balance.\nRef: ${shortTxHash}`;
        break;

      case "Finalized":
        title = "🎉 Transaction Completed";
        body = `Everything is finalized! Your transaction is fully confirmed and recorded. No further action is needed.\nRef: ${shortTxHash}`;
        break;

      default:
        title = "⏳ Processing";
        body = `We’re still working on your transaction. Please hold on a moment while we complete the process.\nRef: ${shortTxHash}`;
    }

    const id = Math.floor(Math.random() * 100000);

    const settings = await this.settingsService.get();
    if (settings?.user_preferences.notifications_enabled === true) {
      await this.localNotificationsService.presentNotification(title, body, id);
    }
  }

  cancelTransaction() {
    if (this.isChromeExtension) {
      chrome.runtime.sendMessage({
        method: "cancel-signing",
        payload: null,
      });
    }

    this.router.navigate(['/xterium/balances']);
  }

  ngOnInit() {
    this.isChromeExtension = this.environmentService.isChromeExtension();
    this.initSecurity();

    this.initTransaction();
  }
}
