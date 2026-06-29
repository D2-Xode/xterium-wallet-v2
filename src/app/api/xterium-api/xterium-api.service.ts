import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { App } from 'src/models/app.model';

@Injectable({
  providedIn: 'root'
})
export class XteriumApiService {
  // private readonly apiUrl = environment.apiUrl;
  private readonly apiUrl = "https://api.xterium.app/api";


  constructor(
    private http: HttpClient
  ) { }

  getApps(): Observable<App[]> {
    return this.http.get<App[]>(`${this.apiUrl}/apps`);
  }
  
  getPublishedApps(): Observable<App[]> {
    return this.http.get<App[]>(`${this.apiUrl}/apps/published`);
  }

  incrementAppOpenCount(appId: string): Observable<App> {
    return this.http.patch<App>(`${this.apiUrl}/apps/${appId}/open`, {});
  }
}
