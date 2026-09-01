import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { Token } from 'src/models/token.model';

@Injectable({
  providedIn: 'root'
})
export class TokensService {

  private readonly assetPath: Record<string, string> = {
    XON: 'assets/images/tokens/xon.png',
    XON_POLARIS: 'assets/images/tokens/xon-polaris.png',
    AZK: 'assets/images/tokens/azk.png',
    DOT: 'assets/images/tokens/dot.png',
    GEM: 'assets/images/tokens/gem.gif',
    GXON: 'assets/images/tokens/gxon.png',
    HDX: 'assets/images/tokens/hdx.png',
    MPC: 'assets/images/tokens/mpc.png',
    USDT: 'assets/images/tokens/usdt.png',
    DON: 'assets/images/tokens/don.png',
    HUG: 'assets/images/tokens/hug.png',
    XAV: 'assets/images/tokens/xav.png',
    DEFAULT: 'assets/images/tokens/default.png',
  }

  private tokenImageSubject = new BehaviorSubject<Token | null>(null);
  public tokenImageObservable = this.tokenImageSubject.asObservable();

  async getTokenIcon(symbol: string): Promise<string> {
    symbol = symbol.toUpperCase();

    if (this.assetPath[symbol]) {
      return this.assetPath[symbol];
    }

    return this.assetPath['DEFAULT'];
  }

  async attachIcon(token: Token): Promise<void> {
    let symbol = token.symbol;
    if (token.chain_id === 9 && token.type === 'native') {
      symbol = 'XON_POLARIS';
    }

    let tokenImage: Token = {
      ...token,
      image: await this.getTokenIcon(symbol)
    };

    this.tokenImageSubject.next(tokenImage);
  }
}
