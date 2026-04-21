import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiPromise } from '@polkadot/api';
import { isAddress } from '@polkadot/util-crypto';

import { Subscription } from 'rxjs';

import { Clipboard } from '@capacitor/clipboard';
import {
  IonButton,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonItem,
  IonList,
  IonLabel,
  IonAvatar,
  IonInput,
  IonTextarea,
  // IonButtons,
  IonToast,
  IonModal,
  // IonContent,
  // IonTitle,
  // IonToolbar,
  IonChip,
  IonToggle,
  ToastController,
  AlertController
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import { clipboardOutline, scanOutline, chevronDownOutline, snowOutline, close } from 'ionicons/icons';

import { Balance } from 'src/models/balance.model';
import { Wallet } from 'src/models/wallet.model';
import { Network } from 'src/models/network.model';
import { Chain } from 'src/models/chain.model';

import { BalancesService } from 'src/app/api/balances/balances.service';
import { UtilsService } from 'src/app/api/polkadot/utils/utils.service';
import { PolkadotJsService } from 'src/app/api/polkadot/blockchains/polkadot-js/polkadot-js.service';
import { PolkadotService } from 'src/app/api/polkadot/blockchains/polkadot-js/polkadot/polkadot.service';
import { AssethubPolkadotService } from 'src/app/api/polkadot/blockchains/polkadot-js/assethub-polkadot/assethub-polkadot.service';
import { XodePolkadotService } from 'src/app/api/polkadot/blockchains/polkadot-js/xode-polkadot/xode-polkadot.service';
import { HydrationPolkadotService } from 'src/app/api/polkadot/blockchains/polkadot-js/hydration-polkadot/hydration-polkadot.service';
import { XodePaseoService } from 'src/app/api/polkadot/blockchains/polkadot-js/xode-paseo/xode-paseo.service';
import { PolarisService } from 'src/app/api/polkadot/blockchains/polkadot-js/polaris/polaris.service';
import { WalletsService } from 'src/app/api/wallets/wallets.service';
import { MultipayxApiService } from 'src/app/api/multipayx-api/multipayx-api.service';

import { ChainsComponent } from '../chains/chains.component';
import { Router } from '@angular/router';
import { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } from '@capacitor/barcode-scanner';
import { EnvironmentService } from 'src/app/api/environment/environment.service';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-send',
  templateUrl: './send.component.html',
  styleUrls: ['./send.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
    IonItem,
    IonList,
    IonLabel,
    IonAvatar,
    IonInput,
    IonTextarea,
    // IonButtons,
    IonToast,
    IonChip,
    IonToggle,
    // IonModal,
    // IonContent,
    // IonTitle,
    // IonToolbar,
    // ChainsComponent,
    TranslatePipe,
  ]
})
export class SendComponent implements OnInit {
  @Input() balance: Balance = new Balance();

  @Output() onClickSend = new EventEmitter<void>();
  @Output() onSendSuccessful = new EventEmitter<string>();

  @ViewChild('selectChainModal', { read: IonModal }) selectChainModal!: IonModal;

  constructor(
    private balancesService: BalancesService,
    private utilsService: UtilsService,
    private polkadotService: PolkadotService,
    private assethubPolkadotService: AssethubPolkadotService,
    private xodePolkadotService: XodePolkadotService,
    private hydrationPolkadotService: HydrationPolkadotService,
    private xodePaseoService: XodePaseoService,
    private polarisService: PolarisService,
    private walletsService: WalletsService,
    private multipayxApiService: MultipayxApiService,
    private toastController: ToastController,
    private router: Router,
    private environmentService: EnvironmentService,
    private alertController: AlertController
  ) {
    addIcons({
      clipboardOutline,
      scanOutline,
      chevronDownOutline,
      snowOutline,
      close
    });
  }

  private pjsApiMap: Map<number, ApiPromise> = new Map();
  get pjsApi(): ApiPromise | undefined {
    return this.pjsApiMap.get(this.currentWallet?.chain?.chain_id);
  }

  currentWallet: Wallet = new Wallet();
  currentWalletPublicAddress: string = '';

  selectedChain: Chain = new Chain();

  isTransferKeepAlive: boolean = true;

  balancesObservableTimeout: any = null;
  balancesSubscription: Subscription = new Subscription();
  transferSubscription: Subscription = new Subscription();

  recipientAddress: string = "";
  formattedAmountValue: string = "0";
  estimatedFee: number = 140000000;

  isProcessing: boolean = false;
  isChromeExtension = false;

  openSelectChainModal() {
    this.selectChainModal.present();
  }

  onSelectedChain(chain: Chain) {
    this.selectedChain = chain;
    this.selectChainModal.dismiss();
  }

  async enableTransferKeepAlive(event: any): Promise<void> {
    const isEnabled = event.detail.checked;

    this.isTransferKeepAlive = isEnabled;
  }

  async pasteFromClipboard() {
    const { type, value } = await Clipboard.read();

    if (type === 'text/plain') {
      this.recipientAddress = value;
    }
  }

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

      this.selectedChain = this.currentWallet.chain;
    }
  }

  async fetchData(): Promise<void> {
    clearTimeout(this.balancesObservableTimeout);
    if (!this.balancesSubscription.closed) this.balancesSubscription.unsubscribe();

    await this.getCurrentWallet();
    await this.getAndWatchBalances();
    await this.getPrice();
  }

  async getAndWatchBalances(): Promise<void> {
    let service: PolkadotJsService | null = null;

    if (this.currentWallet.chain.network === Network.Polkadot && this.currentWallet.chain.chain_id === 0) service = this.polkadotService;
    if (this.currentWallet.chain.network === Network.Polkadot && this.currentWallet.chain.chain_id === 1000) service = this.assethubPolkadotService;
    if (this.currentWallet.chain.network === Network.Polkadot && this.currentWallet.chain.chain_id === 3417) service = this.xodePolkadotService;
    if (this.currentWallet.chain.network === Network.Polkadot && this.currentWallet.chain.chain_id === 2034) service = this.hydrationPolkadotService;
    if (this.currentWallet.chain.network === Network.Paseo && this.currentWallet.chain.chain_id === 5160) service = this.xodePaseoService;
    if (this.currentWallet.chain.network === Network.Rococo && this.currentWallet.chain.chain_id === 1000) service = this.polarisService;

    if (!service) return;

    let pjsApi = this.pjsApiMap.get(this.currentWallet.chain.chain_id);
    if (!pjsApi) {
      pjsApi = await service.connect();
      this.pjsApiMap.set(this.currentWallet.chain.chain_id, pjsApi);
    }

    if (!pjsApi.isConnected) {
      await pjsApi.connect()
    };

    this.balancesObservableTimeout = setTimeout(() => {
      if (this.balancesSubscription.closed) {
        this.balancesSubscription = service.watchBalance(
          pjsApi,
          this.balance.token,
          this.currentWalletPublicAddress
        ).subscribe(balance => {
          this.balance.quantity = balance.quantity;
        });
      }
    }, 5000);
  }

  async getPrice(): Promise<void> {
    let pricePerCurrency = await this.multipayxApiService.getPricePerCurrency("USD");
    if (pricePerCurrency.data.length > 0) {
      let price = pricePerCurrency.data.filter(item => item.symbol.toLowerCase() === this.balance.token.symbol.toLowerCase())
      if (price) {
        this.balance.price = price[0].price;
      }
    }
  }

  formatBalanceWithSuffix(amount: number, decimals: number): string {
    return this.balancesService.formatBalanceWithSuffix(amount, decimals);
  }

  onAmountFocus(event: any) {
    let rawValue = this.formattedAmountValue;
    rawValue = rawValue.replace(/,/g, '');
    if (rawValue.endsWith('.00')) {
      rawValue = rawValue.slice(0, -3);
    }
    this.formattedAmountValue = rawValue;
  }

  onAmountInput(event: any) {
    const inputEl = event.target as HTMLInputElement;
    let rawValue = inputEl.value;

    if (rawValue.startsWith('0') && rawValue.length > 1 && !rawValue.startsWith('0.')) {
      rawValue = rawValue.replace(/^0+/, '');
      if (rawValue === '') rawValue = '0';
    }

    this.formattedAmountValue = rawValue;
  }

  onAmountBlur() {
    let rawValue = this.formattedAmountValue;

    if (!rawValue || rawValue === '') {
      this.formattedAmountValue = '0.00';
      return;
    }

    const [integer, decimal] = rawValue.split('.');
    const withCommas = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    this.formattedAmountValue = decimal !== undefined ? `${withCommas}.${decimal}` : `${withCommas}.00`;
  }

  onAmountKeyDown(event: KeyboardEvent) {
    const inputEl = event.target as HTMLInputElement;
    const value = inputEl.value;

    if (
      event.key === 'Backspace' ||
      event.key === 'Tab' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'Delete'
    ) {
      return;
    }

    if (event.key === '.' && !value.includes('.')) return;

    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  fillAmount(percentage: number) {
    const totalAmount = this.balance.quantity;
    const fillAmount = (totalAmount * percentage) / 100;

    this.formattedAmountValue = this.formatBalanceWithSuffix(fillAmount, this.balance.token.decimals);
  }

  async scan() {
    if (this.isChromeExtension) {
      const alert = await this.alertController.create({
        header: 'Scanning Not Supported',
        subHeader: 'Chrome Extension Limitation',
        message: 'Scanning QR codes is not supported in the Chrome Extension version of the app. Please use the mobile app to scan QR codes.',
        backdropDismiss: true,
        buttons: ['Ok'],
      });

      await alert.present();
      return;
    }

    const result = await CapacitorBarcodeScanner.scanBarcode({
      hint: CapacitorBarcodeScannerTypeHint.ALL
    });

    if (!result?.ScanResult) return;

    const scannedAddress = result.ScanResult.trim();

    if (!this.utilsService.isValidAddress(scannedAddress)) {
      const alert = await this.alertController.create({
        header: 'Invalid Address',
        message: 'The scanned QR code does not contain a valid Substrate/Polkadot address.',
        buttons: ['Ok'],
      });

      await alert.present();
      return;
    }

    this.recipientAddress = scannedAddress;
  }

  async send(): Promise<void> {
    if (this.recipientAddress === "") {
      const toast = await this.toastController.create({
        message: 'Recipient address is required!',
        color: 'warning',
        duration: 1500,
        position: 'top',
      });

      await toast.present();
      return;
    }

    if (!isAddress(this.recipientAddress)) {
      const toast = await this.toastController.create({
        message: 'Invalid recipient address format.',
        color: 'warning',
        duration: 1500,
        position: 'top',
      });

      await toast.present();
      return;
    }

    if (this.formattedAmountValue === "0" || this.formattedAmountValue === "0.00") {
      const toast = await this.toastController.create({
        message: 'Amount is required.',
        color: 'warning',
        duration: 1500,
        position: 'top',
      });

      await toast.present();
      return;
    }

    this.isProcessing = true;

    let service: PolkadotJsService | null = null;

    if (this.currentWallet.chain.network === Network.Polkadot && this.currentWallet.chain.chain_id === 0) service = this.polkadotService;
    if (this.currentWallet.chain.network === Network.Polkadot && this.currentWallet.chain.chain_id === 1000) service = this.assethubPolkadotService;
    if (this.currentWallet.chain.network === Network.Polkadot && this.currentWallet.chain.chain_id === 3417) service = this.xodePolkadotService;
    if (this.currentWallet.chain.network === Network.Polkadot && this.currentWallet.chain.chain_id === 2034) service = this.hydrationPolkadotService;
    if (this.currentWallet.chain.network === Network.Paseo && this.currentWallet.chain.chain_id === 5160) service = this.xodePaseoService;
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

    const rawAmount = this.formattedAmountValue.replace(/,/g, '');
    const parseAmount = this.balancesService.parseBalance(Number(rawAmount), this.balance.token.decimals);


    const transferTransaction = service.transfer(pjsApi, this.balance, this.recipientAddress, parseAmount, this.isTransferKeepAlive);

    let existentialDeposit = 0;
    let estimatedFee = 0;

    if (this.balance.token.type === 'native') {
      estimatedFee = await service.getEstimatedFees(pjsApi, transferTransaction.toHex(), this.currentWalletPublicAddress, this.balance.token);

      if (this.isTransferKeepAlive) {
        existentialDeposit = await service.getExistentialDepositOfNativeToken(pjsApi);
      }
    }

    const balanceAmountRequired = parseAmount + existentialDeposit + estimatedFee;

    if (this.isTransferKeepAlive) {
      if (balanceAmountRequired > this.balance.quantity) {
        const formattedBalanceRequired = this.balancesService.formatBalance(Number(balanceAmountRequired), this.currentWallet.chain.decimal);
        const toast = await this.toastController.create({
          message: `Insufficient balance. You need at least ${formattedBalanceRequired.toFixed(5)} ${this.currentWallet.chain.unit}`,
          color: 'danger',
          duration: 2500,
          position: 'top',
        });

        await toast.present();
        this.isProcessing = false;
        return;
      }
    }

    const payload = JSON.stringify(await this.utilsService.createSignerPayload(pjsApi, transferTransaction, this.currentWalletPublicAddress));
    this.router.navigate(['/web3/sign-transaction'], {
      queryParams: {
        isXterium: true,
        signingType: 'signPayload',
        payload: encodeURIComponent(payload),
      }
    });

    this.onClickSend.emit();
  }

  ngOnInit() {
    this.isChromeExtension = this.environmentService.isChromeExtension();
    this.fetchData();
  }
}
