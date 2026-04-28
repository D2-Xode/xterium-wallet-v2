import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import type { GoogleLoginResponseOnline } from '@capgo/capacitor-social-login';

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

  private readonly DRIVE_SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
  ];

  constructor(
    private readonly http: HttpClient,
    private readonly walletsService: WalletsService,
    private readonly encryptionService: EncryptionService,
  ) { }

  async backup(backupPin: string): Promise<BackupResult> {
    if (this.isIOS()) {
      return { success: false, error: 'The iOS backup feature is currently in development.' };
    }

    if (!this.isAndroid() && !this.isIOS()) {
      return { success: false, error: 'Backup is only supported on Android and iOS.' };
    }

    let token: string | null = null;

    try {
      const wallets = await this.walletsService.getAllWallets();
      if (!wallets.length) {
        return { success: false, error: 'No wallets found — nothing to back up.' };
      }

      token = await this.getAccessToken();
      if (!token) {
        return { success: false, error: 'Google Sign-In failed. Please try again.' };
      }

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

    } catch (error: unknown) {
      const detail = error instanceof Error ? `${error.message}` : JSON.stringify(error);
      console.error('[WalletBackup] Backup failed — raw error:', detail, error);
      return { success: false, error: this.classifyError(error) };
    } finally {
      await this.signOut();
    }
  }

  async restore(backupPin: string): Promise<RestoreResult> {
    if (!this.isAndroid() && !this.isIOS()) {
      return { success: false, error: 'Restore is only supported on Android and iOS.' };
    }

    let token: string | null = null;

    try {
      token = await this.getAccessToken();
      if (!token) {
        return { success: false, error: 'Google Sign-In failed. Please try again.' };
      }

      const folderId = await this.getOrCreateDriveFolder(token);
      const fileId = await this.findBackupFile(token, folderId);

      if (!fileId) {
        return { success: false, error: 'No backup file found in Google Drive. Please create a backup first.' };
      }

      const encryptionKey = await this.encryptionService.hash(backupPin);
      const encryptedData = await this.downloadFile(token, fileId);
      const decryptedJson = await this.encryptionService.decrypt(encryptedData, encryptionKey);

      if (!decryptedJson) {
        return { success: false, error: 'Invalid backup PIN. Please check your PIN and try again.' };
      }

      const wallets: Wallet[] = JSON.parse(decryptedJson);
      const { restoredCount, skippedCount } = await this.saveWallets(wallets);

      return { success: true, restoredCount, skippedCount };

    } catch (error: unknown) {
      const detail = error instanceof Error ? `${error.message}` : JSON.stringify(error);
      console.error('[WalletBackup] Restore failed — raw error:', detail, error);
      return { success: false, error: this.classifyError(error) };
    } finally {
      await this.signOut();
    }
  }

  private isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android';
  }

  private isIOS(): boolean {
    return Capacitor.getPlatform() === 'ios';
  }

  private async getAccessToken(): Promise<string | null> {
    await this.signOut();

    const result = await SocialLogin.login({
      provider: 'google',
      options: {
        scopes: this.DRIVE_SCOPES,
      },
    });

    const loginResult = result.result as GoogleLoginResponseOnline;
    return loginResult?.accessToken?.token ?? null;
  }

  private async signOut(): Promise<void> {
    try {
      await SocialLogin.logout({ provider: 'google' });
    } catch {
    }
  }

  private classifyError(error: unknown): string {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    const lower = msg.toLowerCase();

    if (
      lower.includes('cancel') ||
      lower.includes('getcredentialcancelled') ||
      lower.includes('user cancelled')
    ) {
      return 'Google Sign-In was cancelled.';
    }

    if (lower.includes('nocredential') || lower.includes('no credential') || lower.includes('no viable credential')) {
      return 'No Google account found on this device. Please add a Google account in device Settings and try again.';
    }

    if (
      lower.includes('developer_error') ||
      lower.includes('developer error') ||
      lower.includes(': 10') ||
      lower.includes('configuration') ||
      lower.includes('client id is not set') ||
      lower.includes('clientid')
    ) {
      return `Google Sign-In configuration error — the app signing certificate (SHA-1) may not be registered in Google Cloud Console. Detail: ${msg}`;
    }

    if (
      lower.includes('provider') ||
      lower.includes('unsupported') ||
      lower.includes('not supported')
    ) {
      return `Google Sign-In is not available on this device. Detail: ${msg}`;
    }

    if (
      lower.includes('access token') ||
      lower.includes('getaccesstoken') ||
      lower.includes('authorize') ||
      lower.includes('authorization')
    ) {
      return `Google Drive authorization failed. Please try again. If the problem persists, revoke the app's Google Drive access in your Google account settings and retry. Detail: ${msg}`;
    }

    if (
      lower.includes('sign-in failed') ||
      lower.includes('google sign-in') ||
      lower.includes('failed to get google credentials') ||
      lower.includes('handling sign-in result')
    ) {
      return `Google Sign-In failed. Detail: ${msg}`;
    }

    if (error instanceof SyntaxError || lower.includes('json') || lower.includes('unexpected token')) {
      return 'Invalid backup PIN or corrupted backup file. Please check your PIN and try again.';
    }

    if (
      lower.includes('network') ||
      lower.includes('failed to fetch') ||
      lower.includes('timeout')
    ) {
      return 'Network error. Please check your internet connection and try again.';
    }

    if (
      lower.includes('service_disabled') ||
      lower.includes('servicedisabled') ||
      lower.includes('has not been used in project') ||
      lower.includes('it is disabled') ||
      (lower.includes('permission_denied') && lower.includes('drive'))
    ) {
      return 'Google Drive API is not enabled for this app. Please contact support.';
    }

    if (
      lower.includes('401') ||
      lower.includes('403') ||
      lower.includes('unauthorized') ||
      lower.includes('forbidden')
    ) {
      return `Google Drive access was denied. Please try signing in again. Detail: ${msg}`;
    }

    return `An unexpected error occurred. Detail: ${msg}`;
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
      `--${b}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n` +
      `${content}\r\n--${b}--`
    );
  }

  private async getOrCreateDriveFolder(token: string): Promise<string> {
    const query = `name='${this.DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const search = await firstValueFrom(
      this.http.get<{ files?: { id: string }[] }>(
        `${this.DRIVE_FILES_URL}?q=${encodeURIComponent(query)}&fields=files(id)`,
        { headers: this.authHeaders(token) }
      )
    );

    if (search.files?.length) return search.files[0].id;

    const created = await firstValueFrom(
      this.http.post<{ id: string }>(
        this.DRIVE_FILES_URL,
        { name: this.DRIVE_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
        { headers: this.authHeaders(token) }
      )
    );
    return created.id;
  }

  private async findBackupFile(token: string, folderId: string): Promise<string | null> {
    const query = `name='${this.BACKUP_FILE_NAME}' and '${folderId}' in parents and trashed=false`;
    const result = await firstValueFrom(
      this.http.get<{ files?: { id: string }[] }>(
        `${this.DRIVE_FILES_URL}?q=${encodeURIComponent(query)}&fields=files(id)`,
        { headers: this.authHeaders(token) }
      )
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
        this.multipartBody(
          { name: this.BACKUP_FILE_NAME, parents: [folderId], mimeType: 'text/plain' },
          content
        ),
        { headers: this.multipartHeaders(token) }
      )
    );
  }

  private async updateDriveFile(token: string, fileId: string, content: string): Promise<void> {
    await firstValueFrom(
      this.http.patch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`,
        this.multipartBody({ mimeType: 'text/plain' }, content),
        { headers: this.multipartHeaders(token) }
      )
    );
  }
}
