import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonGrid,
  IonRow,
  IonCol,
  IonList,
  IonItem,
  IonButton,
  IonIcon,
  IonInputOtp,
  ToastController, 
  IonSpinner 
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';
import { WalletBackupService } from 'src/app/api/wallet-backup/wallet-backup.service';

@Component({
  selector: 'app-restore',
  templateUrl: './restore.component.html',
  styleUrls: ['./restore.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonGrid,
    IonRow,
    IonCol,
    IonList,
    IonItem,
    IonButton,
    IonIcon,
    IonInputOtp,
    TranslatePipe,
    IonSpinner,
  ],
})
export class RestoreComponent implements OnInit {
  @Output() onRestoreComplete = new EventEmitter<boolean>();
  @Output() onRestoreProcessing = new EventEmitter<boolean>();

  constructor(
    private walletBackupService: WalletBackupService,
    private toastController: ToastController
  ) { }

  pinSetup: string = '';

  isProcessing = false;

  maskPin(event: any) {
    const inputs = document.querySelectorAll<HTMLInputElement>('#otpInput input');
    inputs.forEach((input) => {
      input.type = 'password';
    });
  }

  async restore() {
    if (!this.pinSetup) {
      const toast = await this.toastController.create({
        message: 'Please enter a PIN.',
        color: 'warning',
        duration: 1500,
        position: 'top',
      });
      await toast.present();
      return;
    }

    if (this.pinSetup.length < 6) {
      const toast = await this.toastController.create({
        message: 'PIN must be 6 digits.',
        color: 'warning',
        duration: 1500,
        position: 'top',
      });
      await toast.present();
      return;
    }

    this.isProcessing = true;
    this.onRestoreProcessing.emit(true);

    const result = await this.walletBackupService.restore(this.pinSetup);

    this.pinSetup = '';

    this.isProcessing = false;
    this.onRestoreProcessing.emit(false);

    const toast = await this.toastController.create({
      message: result.success
        ? `Restore successful! ${result?.restoredCount ?? 0} wallet(s) restored.`
        : `Restore failed: ${result.error}`,
      color: result.success ? 'success' : 'danger',
      duration: 2500,
      position: 'top',
    });
    await toast.present();

    this.onRestoreComplete.emit(result.success);
  }

  onPinSetup(event: any) {
    this.pinSetup = event.detail.value;
  }
  ngOnInit() { }

}
