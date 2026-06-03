import { Injectable } from '@angular/core';

import { Browser } from '@capacitor/browser';

@Injectable({
  providedIn: 'root',
})
export class BrowserService {
  
  async open(url: string): Promise<void> {
    await Browser.open({ url });
  }

  async close() {
    await Browser.close();
  }

  onFinished(callback: () => void) {
    Browser.addListener('browserFinished', callback);
  }

  onPageLoaded(callback: () => void) {
    Browser.addListener('browserPageLoaded', callback);
  }

  async removeAllListeners() {
    await Browser.removeAllListeners();
  }
}
