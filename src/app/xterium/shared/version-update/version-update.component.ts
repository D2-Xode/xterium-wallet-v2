import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonIcon, IonBadge
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  cloudDownloadOutline
} from 'ionicons/icons';

import { Capacitor } from '@capacitor/core';

import { AppVersionService } from 'src/app/api/app-version/app-version.service';

@Component({
  selector: 'app-version-update',
  templateUrl: './version-update.component.html',
  styleUrls: ['./version-update.component.scss'],
  imports: [IonBadge,
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
  ],
})
export class VersionUpdateComponent implements OnInit {
  @Input() currentVersion: string = '';
  @Input() availableVersion: string = '';
  @Output() dismiss = new EventEmitter<void>();

  constructor(
    private appVersionService: AppVersionService
  ) {
    addIcons({
      cloudDownloadOutline,
    });
  }

  async onUpdateNow(): Promise<void> {
    if (Capacitor.getPlatform() === 'android') {
      await this.appVersionService.performImmediateUpdate();
    } else {
      await this.appVersionService.openAppStore();
    }
  }

  async onMaybeLater(): Promise<void> {
    this.dismiss.emit();
  }

  ngOnInit() {
  }

}
