import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonContent,
  IonIcon, 
  IonSpinner
 } from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import { 
  searchOutline, 
  addOutline 
} from 'ionicons/icons';

import { Browser } from '@capacitor/browser'; 

import { App } from 'src/models/app.model';
import { XteriumApiService } from 'src/app/api/xterium-api/xterium-api.service';

import { TranslatePipe } from '@ngx-translate/core';


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
    TranslatePipe,
  ],
})
export class ExplorePage implements OnInit {
  apps: App[] = [];
  featuredApps: App[] = [];
  trendingApps: App[] = [];
  isLoading = false;
  error: string | null = null;
  trendingOpen = true;

  searchUrl = '';

  constructor(
    private xteriumApiService: XteriumApiService
  ) {
    addIcons({
      searchOutline,
      addOutline
    });
  }

  loadApps() {
    this.isLoading = true;
    this.error = null;

    this.xteriumApiService.getApps().subscribe({
      next: (data) => {
        this.apps = data;
        this.featuredApps = data.slice(0, 3);
        this.trendingApps = data.slice(3);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load apps:', err);
        this.error = 'Failed to load apps. Please try again.';
        this.isLoading = false;
      },
    });
  }

  async goToApp(url: string) {
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;

    await Browser.open({
      url: formattedUrl,
      presentationStyle: 'fullscreen',
      toolbarColor: '#0a0a0a',
    });
  }

  async onSearchSubmit() {
    const raw = this.searchUrl.trim();
    if (!raw) return;

    const isUrl = raw.includes('.') && !raw.includes(' ');
    const url = isUrl
      ? (raw.startsWith('http') ? raw : `https://${raw}`)
      : `https://www.google.com/search?q=${encodeURIComponent(raw)}`;

    await Browser.open({
      url,
      presentationStyle: 'fullscreen',
      toolbarColor: '#0a0a0a',
    });

    this.searchUrl = '';
  }

  getInitial(name: string): string {
    return name?.charAt(0).toUpperCase() ?? '?';
  }

  toggleTrending() {
    this.trendingOpen = !this.trendingOpen;
  }

  ngOnInit() {
    this.loadApps();
  }
}
