import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonButton,
  AlertController
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import { qrCode, cloudUpload } from 'ionicons/icons';

import { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } from '@capacitor/barcode-scanner';
import QrScanner from "qr-scanner";
import BANK_SWIFT_TO_NAME_MAP_JSON from 'src/data/banks.data.json'

import { EnvironmentService } from 'src/app/api/environment/environment.service';

import { PayDetails } from 'src/models/pay.model';

import { MultipayxApiService } from 'src/app/api/multipayx-api/multipayx-api.service';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-pay',
  templateUrl: './pay.page.html',
  styleUrls: ['./pay.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonButton,
    TranslatePipe,
  ]
})
export class PayPage implements OnInit {

  constructor(
    private router: Router,
    private environmentService: EnvironmentService,
    private alertController: AlertController,
    private multipayxService: MultipayxApiService
  ) {
    addIcons({
      qrCode,
      cloudUpload,
    });
  }

  isChromeExtension = false;

  BANK_SWIFT_TO_NAME_MAP: Record<string, string> = BANK_SWIFT_TO_NAME_MAP_JSON;

  formatEMVQR(data: string) {
    const parsed: any = {};
    let i = 0;

    while (i < data.length) {
      const tag = data.substring(i, i + 2);
      const len = parseInt(data.substring(i + 2, i + 4), 10);
      const value = data.substring(i + 4, i + 4 + len);

      if (['26', '27', '28', '62', '51'].includes(tag)) {
        parsed[tag] = this.formatEMVQR(value);
      } else {
        parsed[tag] = value;
      }

      i += 4 + len;
    }

    return parsed;
  }

  getBankCode(emv: any): string {
    const parentTags = ['26', '27', '28'];

    for (const tag of parentTags) {
      if (emv[tag]) {
        const pan = emv[tag]['01'];
        if (pan && typeof pan === 'string') {
          return pan.substring(0, 11);
        }
      }
    }

    return '';
  }

  getBankName(bankCode: string): string {
    if (!bankCode) return '';

    if (this.BANK_SWIFT_TO_NAME_MAP[bankCode]) {
      return this.BANK_SWIFT_TO_NAME_MAP[bankCode];
    }
    const shortCode = bankCode.substring(0, 8);
    const matchedKey = Object.keys(this.BANK_SWIFT_TO_NAME_MAP).find(key =>
      key.startsWith(shortCode)
    );

    return matchedKey ? this.BANK_SWIFT_TO_NAME_MAP[matchedKey] : '';
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

    if (!result?.ScanResult) {
      return;
    }

    const parsedEMVQR = this.formatEMVQR(result.ScanResult);
    const bankSwift = this.getBankCode(parsedEMVQR);
    const bankName = this.getBankName(bankSwift);
    const bankDetails = await this.multipayxService.getBankCodeAndLogo(bankName);
    const bankCode = bankDetails.length > 0 ? bankDetails[0].bankCode : '';
    const bankIcon = bankDetails.length > 0 ? bankDetails[0].bankIcon : '';
    const payDetails: PayDetails = {
      recipient_name: parsedEMVQR?.['59'] || '',
      account_number:
        parsedEMVQR?.['26']?.['04'] ||
        parsedEMVQR?.['26']?.['01'] ||
        parsedEMVQR?.['27']?.['04'] ||
        parsedEMVQR?.['27']?.['01'] ||
        '',
      bank_swift: bankSwift,
      bank_name: bankName,
      bank_code: bankCode,
      bank_icon: bankIcon,
      amount: parsedEMVQR?.['54'] ? parseFloat(parsedEMVQR['54']) : 0,
    };

    if (!payDetails.account_number && !payDetails.recipient_name) {
      const alert = await this.alertController.create({
        header: 'Invalid QR',
        message: 'The QR code does not contain valid account information.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    setTimeout(() => {
      this.router.navigate(['/xterium/payment-details'], {
        queryParams: {
          payDetails: JSON.stringify(payDetails)
        }
      });
    }, 500);
  }

  async upload() {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;

        try {
          const qrText = await QrScanner.scanImage(file);

          const parsedEMVQR = this.formatEMVQR(qrText);
          const bankSwift = this.getBankCode(parsedEMVQR);
          const bankName = this.getBankName(bankSwift);
          const bankDetails = await this.multipayxService.getBankCodeAndLogo(bankName);
          const bankCode = bankDetails.length > 0 ? bankDetails[0].bankCode : '';
          const bankIcon = bankDetails.length > 0 ? bankDetails[0].bankIcon : '';
          const payDetails: PayDetails = {
            recipient_name: parsedEMVQR?.['59'] || '',
            account_number:
              parsedEMVQR?.['26']?.['04'] ||
              parsedEMVQR?.['26']?.['01'] ||
              parsedEMVQR?.['27']?.['04'] ||
              parsedEMVQR?.['27']?.['01'] || '',
            bank_swift: bankSwift,
            bank_name: bankName,
            bank_code: bankCode,
            bank_icon: bankIcon,
            amount: parsedEMVQR?.['54'] ? parseFloat(parsedEMVQR['54']) : 0,
          };

          if (!payDetails.account_number && !payDetails.recipient_name) {
            const alert = await this.alertController.create({
              header: 'Invalid QR',
              message: 'The QR code does not contain valid account information.',
              buttons: ['OK']
            });
            await alert.present();
            return;
          }

          this.router.navigate(['/xterium/payment-details'], {
            queryParams: {
              payDetails: JSON.stringify(payDetails)
            }
          });

        } catch (err) {
          const alert = await this.alertController.create({
            header: 'Invalid QR',
            message: 'Unable to decode the QR from the image.',
            buttons: ['OK']
          });
          alert.present();
        }
      };

      input.click();
    } catch (error) { }
  }

  ngOnInit() {
    this.isChromeExtension = this.environmentService.isChromeExtension();
  }

}
