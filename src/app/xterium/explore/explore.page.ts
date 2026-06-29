import { 
  ChangeDetectorRef, 
  Component, 
  ElementRef, 
  OnInit, 
  ViewChild 
} from '@angular/core';

import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonContent,
  IonIcon,
  IonSpinner,
  IonInput,
  IonButton,
  IonModal,
  IonCol,
  IonRow,
  IonGrid,
  IonItem,
  IonList,
  IonText,
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  chevronDownOutline,
  chevronUpOutline,
  searchOutline,
  addOutline,
  chevronBackOutline,
  lockClosedOutline,
  reloadOutline,
  closeOutline,
  globeOutline,
  arrowForwardOutline,
  ellipsisVerticalOutline,
} from 'ionicons/icons';


import { App } from 'src/models/app.model';
import { XteriumApiService } from 'src/app/api/xterium-api/xterium-api.service';

import { TranslatePipe } from '@ngx-translate/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { BrowserService } from 'src/app/api/browser/browser.service';


@Component({
  selector: 'app-explore',
  templateUrl: './explore.page.html',
  styleUrls: ['./explore.page.scss'],
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    IonSpinner,
    // IonInput,
    // IonButton,
    IonModal,
    IonList,
    IonItem,
    IonGrid,
    IonRow,
    IonCol,
    IonText,
    TranslatePipe,
  ],
})
export class ExplorePage implements OnInit {
  @ViewChild('browserModal', { read: IonModal }) browserModal!: IonModal;

  @ViewChild('webviewFrame') webviewRef!: ElementRef<HTMLIFrameElement>;
  @ViewChild('urlInput') urlInputRef!: ElementRef<HTMLInputElement>;

  apps: App[] = [];
  featuredApps: App[] = [];
  trendingApps: App[] = [];
  isLoading: boolean = false;
  error: string | null = null;
  trendingOpen = true;
  searchUrl: string = '';

  tabCount: number = 1;
  browserMenuOpen = false;

  browserOpen: boolean = false;
  browserUrl: string = '';
  browserDisplayUrl: string = '';
  browserSafeUrl!: SafeResourceUrl;
  browserLoading: boolean = false;
  browserBlocked: boolean = false;

  constructor(
    private xteriumApiService: XteriumApiService,
    private browserService: BrowserService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      chevronDownOutline,
      chevronUpOutline,
      chevronBackOutline,
      searchOutline,
      ellipsisVerticalOutline,
      addOutline,
      globeOutline,
      reloadOutline,
      closeOutline,
      lockClosedOutline,
      arrowForwardOutline
    });
  }

  private categorizeApps(apps: App[]) {
    this.featuredApps = apps;
    this.trendingApps = apps.filter(a => (a.open_count ?? 0) > 0);
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  onTabCountClick() {
  }

  openBrowserMenu() {
    this.browserModal.present();
  }

  loadApps() {
    this.isLoading = true;
    this.error = null;

    this.xteriumApiService.getPublishedApps().subscribe({
      next: (data) => {
        this.apps = data;
        this.categorizeApps(data);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load apps:', err);
        this.error = 'Failed to load apps. Please try again.';
        this.isLoading = false;
      },
    });
  }

  getInitial(name: string): string {
    return name?.charAt(0).toUpperCase() ?? '?';
  }

  toggleTrending() {
    this.trendingOpen = !this.trendingOpen;
  }

  get activeInput(): string {
    return this.browserOpen ? this.browserUrl : this.searchUrl;
  }

  set activeInput(val: string) {
    if (this.browserOpen) {
      this.browserUrl = val;
    } else {
      this.searchUrl = val;
    }
  }

  goToApp(url: string, appId: string) {
    this.xteriumApiService.incrementAppOpenCount(appId).subscribe({
      next: () => {
        this.loadApps();
      }
    });

    const formatted = url.startsWith('http') ? url : `https://${url}`;
    this.openBrowser(formatted);
  }

  onSearchSubmit() {
    const raw = this.searchUrl.trim();
    if (!raw) return;

    const isUrl = raw.includes('.') && !raw.includes(' ');
    const url = isUrl
      ? (raw.startsWith('http') ? raw : `https://${raw}`)
      : `https://www.google.com/search?q=${encodeURIComponent(raw)}`;

    this.openBrowser(url);
    this.searchUrl = '';
  }

  openBrowser(url: string) {
    this.browserUrl = url;
    this.browserDisplayUrl = this.extractDomain(url);
    this.browserLoading = true;
    this.browserOpen = true;

    this.browserService.open(url);

    // if (!this.browserBlocked) {
    //   this.browserSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    // }
  }

  browserNavigate() {
    const raw = this.browserUrl.trim();
    if (!raw) return;

    const isUrl = raw.includes('.') && !raw.includes(' ');
    const url = isUrl
      ? (raw.startsWith('http') ? raw : `https://${raw}`)
      : `https://www.google.com/search?q=${encodeURIComponent(raw)}`;

    this.browserUrl = url;
    this.browserDisplayUrl = this.extractDomain(url);
    this.browserLoading = true;

    this.browserService.open(url);
    
    // if (!this.browserBlocked) {
    //   this.browserSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
    //   setTimeout(() => {
    //     this.browserSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    //   }, 80);
    // }

    this.urlInputRef?.nativeElement.blur();
  }

  browserGoBack() {
    try {
      this.webviewRef.nativeElement.contentWindow?.history.back();
    } catch {
      this.closeBrowser();
    }
  }

  browserRefresh() {
    this.browserModal.dismiss();
    const url = this.browserUrl;
    this.browserLoading = true;
    this.browserSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
    setTimeout(() => {
      this.browserSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }, 80);
  }

  onFrameLoad() {
    this.browserLoading = false;
  }

  async openExternal() {
    await this.browserService.open(this.browserUrl);
  }

  closeBrowser() {
    this.browserOpen = false;
    this.browserUrl = '';
    this.browserSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
    this.browserLoading = false;
    this.browserBlocked = false;
  }

  closeTab() {
    this.browserModal.dismiss().then(() => {
      this.tabCount = Math.max(1, this.tabCount - 1);
      this.closeBrowser();
      this.cdr.detectChanges();
    });
  }

  ngOnInit() {
    this.loadApps();
  }
}
