import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';

import { WalletsService } from '../wallets/wallets.service';
import { EncryptionService } from '../encryption/encryption.service';
import { Wallet } from 'src/models/wallet.model';

export interface BackupResult {
  success: boolean;
  walletCount?: number;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  restoredCount?: number;
  skippedCount?: number;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class WalletBackupService {

  private readonly BACKUP_FILE_NAME = 'xterium_backup.json';
  private readonly DRIVE_FOLDER_NAME = 'Xterium';
  private readonly DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
  private readonly DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  private readonly MULTIPART_BOUNDARY = 'wallet_backup_boundary';

  private readonly GOOGLE_SCOPES = [
    'profile',
    'email',
    'https://www.googleapis.com/auth/drive.file',
  ];

  constructor(
    private readonly http: HttpClient,
    private readonly walletsService: WalletsService,
    private readonly encryptionService: EncryptionService,
  ) { }

  async backup(backupPin: string): Promise<BackupResult> {
    if (!this.isAndroid()) {
      return { success: false, error: 'Backup is only supported on Android.' };
    }

    try {
      const wallets = await this.walletsService.getAllWallets();
      if (!wallets.length) {
        return { success: false, error: 'No wallets found — nothing to back up.' };
      }

      const token = await this.getAccessToken();
      if (!token) return { success: false, error: 'Google sign-in failed.' };

      const encryptionKey = await this.encryptionService.hash(backupPin);
      const encryptedJson = await this.encryptionService.encrypt(
        JSON.stringify(wallets),
        encryptionKey
      );

      const folderId = await this.getOrCreateDriveFolder(token);
      const existingId = await this.findBackupFile(token, folderId);

      if (existingId) {
        await this.updateDriveFile(token, existingId, encryptedJson);
      } else {
        await this.createDriveFile(token, folderId, encryptedJson);
      }

      return { success: true, walletCount: wallets.length };

    } catch (error) {
      console.error('Backup failed:', error);

      return {
        success: false,
        error: 'Backup failed. Please check your PIN and try again.'
      };
    }
  }

  async restore(backupPin: string): Promise<RestoreResult> {
    if (!this.isAndroid()) {
      return { success: false, error: 'Restore is only supported on Android.' };
    }

    const token = await this.getAccessToken();
    if (!token) return { success: false, error: 'Google sign-in failed.' };

    const folderId = await this.getOrCreateDriveFolder(token);
    const fileId = await this.findBackupFile(token, folderId);
    if (!fileId) return { success: false, error: 'No backup file found in Google Drive.' };

    try {
      const encryptionKey = await this.encryptionService.hash(backupPin);
      const encryptedData = await this.downloadFile(token, fileId);

      const decryptedJson = await this.encryptionService.decrypt(encryptedData, encryptionKey);

      const wallets: Wallet[] = JSON.parse(decryptedJson);

      const { restoredCount, skippedCount } = await this.saveWallets(wallets);

      return { success: true, restoredCount, skippedCount };

    } catch (error) {
      console.error('Restore failed:', error);

      return {
        success: false,
        error: 'Invalid backup PIN or corrupted backup file.'
      };
    }
  }

  private isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android';
  }

  private async getAccessToken(): Promise<string | null> {
    const result = await SocialLogin.login({
      provider: 'google',
      options: { scopes: this.GOOGLE_SCOPES },
    });
    return (result.result as any)?.accessToken?.token ?? null;
  }

  private async saveWallets(wallets: Wallet[]): Promise<{ restoredCount: number; skippedCount: number }> {
    let restoredCount = 0;
    let skippedCount = 0;

    for (const wallet of wallets) {
      const exists = await this.walletsService.getWalletByPublicKey(wallet.public_key);
      if (exists) {
        skippedCount++;
      } else {
        await this.walletsService.create(wallet);
        restoredCount++;
      }
    }

    return { restoredCount, skippedCount };
  }

  private authHeaders(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private multipartHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${this.MULTIPART_BOUNDARY}`,
    });
  }

  private multipartBody(metadata: object, content: string): string {
    const b = this.MULTIPART_BOUNDARY;
    return (
      `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${b}\r\nContent-Type: application/json\r\n\r\n` +
      `${content}\r\n--${b}--`
    );
  }

  private async getOrCreateDriveFolder(token: string): Promise<string> {
    const query = `name='${this.DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const search: any = await firstValueFrom(
      this.http.get(`${this.DRIVE_FILES_URL}?q=${encodeURIComponent(query)}&fields=files(id)`, {
        headers: this.authHeaders(token),
      })
    );

    if (search.files?.length) return search.files[0].id;

    const created: any = await firstValueFrom(
      this.http.post(
        this.DRIVE_FILES_URL,
        { name: this.DRIVE_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
        { headers: this.authHeaders(token) }
      )
    );
    return created.id;
  }

  private async findBackupFile(token: string, folderId: string): Promise<string | null> {
    const query = `name='${this.BACKUP_FILE_NAME}' and '${folderId}' in parents and trashed=false`;
    const result: any = await firstValueFrom(
      this.http.get(`${this.DRIVE_FILES_URL}?q=${encodeURIComponent(query)}&fields=files(id)`, {
        headers: this.authHeaders(token),
      })
    );
    return result.files?.length ? result.files[0].id : null;
  }

  private downloadFile(token: string, fileId: string): Promise<string> {
    return firstValueFrom(
      this.http.get(`${this.DRIVE_FILES_URL}/${fileId}?alt=media`, {
        headers: this.authHeaders(token),
        responseType: 'text',
      })
    );
  }

  private async createDriveFile(token: string, folderId: string, content: string): Promise<void> {
    await firstValueFrom(
      this.http.post(
        this.DRIVE_UPLOAD_URL,
        this.multipartBody({ name: this.BACKUP_FILE_NAME, parents: [folderId], mimeType: 'application/json' }, content),
        { headers: this.multipartHeaders(token) }
      )
    );
  }

  private async updateDriveFile(token: string, fileId: string, content: string): Promise<void> {
    await firstValueFrom(
      this.http.patch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`,
        this.multipartBody({ mimeType: 'application/json' }, content),
        { headers: this.multipartHeaders(token) }
      )
    );
  }
}