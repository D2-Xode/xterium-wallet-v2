import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { cryptoWaitReady } from '@polkadot/util-crypto';
import { hexToU8a } from '@polkadot/util';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { ISubmittableResult } from '@polkadot/types/types';

import { PolkadotJsService } from 'src/app/api/polkadot/blockchains/polkadot-js/polkadot-js.service';

import { Token } from 'src/models/token.model';
import { Balance } from 'src/models/balance.model';

@Injectable({
  providedIn: 'root',
})
export class HydrationPolkadotService extends PolkadotJsService {
  async connect(): Promise<ApiPromise> {
    await cryptoWaitReady();

    const wsProvider = new WsProvider([
      "wss://hydration-rpc.n.dwellir.com",
      "wss://rpc.hydradx.cloud",
      "wss://rpc.helikon.io/hydradx",
      "wss://hydration.ibp.network",
      "wss://hydration.dotters.network",
    ]);
    const api = await ApiPromise.create({ provider: wsProvider });

    return api;
  }

  async getTokens(api: ApiPromise): Promise<Token[]> {
    const tokens: Token[] = [];

    const systemChain = await api.rpc.system.chain();
    const systemProperties = (await api.rpc.system.properties()).toHuman();
    const balanceTotalIssuance = (await api.query['balances']['totalIssuance']()).toString();

    const xodeChainName = systemChain.toString();
    const xodeTokenSymbol = systemProperties['tokenSymbol'];
    const xodeTokenDecimals = systemProperties['tokenDecimals'];
    const xodeTotalTokenSupply = balanceTotalIssuance;

    const nativeToken: Token = {
      id: uuidv4(),
      reference_id: 0,
      chain_id: 5,
      name: xodeChainName,
      symbol: xodeTokenSymbol?.toString() ?? "",
      decimals: xodeTokenDecimals !== undefined ? Number(xodeTokenDecimals) : 0,
      total_supply: xodeTotalTokenSupply !== undefined ? BigInt(balanceTotalIssuance) : BigInt(0),
      type: "native",
      image: ""
    };

    tokens.push(nativeToken);

    return tokens;
  }

  async getExistentialDepositOfNativeToken(api: ApiPromise): Promise<number> {
    const existentialDeposit = api.consts['balances']['existentialDeposit'];
    return Number(existentialDeposit.toString());
  };

  async getMinimumBalanceOfAssetToken(api: ApiPromise, reference_id: number): Promise<number | null> {
    return null;
  };

  async getBalances(api: ApiPromise, tokens: Token[], publicKey: string): Promise<Balance[]> {
    const balances: Balance[] = [];

    if (tokens.length > 0) {
      const assetBalances: Balance[] = [];

      await Promise.all(
        tokens.map(async (token) => {
          const systemAccount = await api.query['system']['account'](publicKey);
          const account = systemAccount.toJSON() as any;

          balances.push({
            id: uuidv4(),
            token,
            quantity: Number(account.data.free),
            price: 0,
            amount: 0,
            status: "",
          });
        })
      );

      assetBalances.sort((a, b) => Number(a.token.reference_id) - Number(b.token.reference_id));
      balances.push(...assetBalances);
    }

    return balances;
  }

  watchBalances(api: ApiPromise, tokens: Token[], publicKey: string): Observable<Balance[]> {
    return new Observable<Balance[]>(subscriber => {
      const subscriptions: any[] = [];
      const balances: Balance[] = [];

      (async () => {
        const balanceList = await Promise.all(
          tokens.map(async token => {
            const systemAccount = await api.query['system']['account'](publicKey);
            const account = systemAccount?.toJSON() as any;

            return <Balance>{
              id: uuidv4(),
              token,
              quantity: Number(account.data.free),
              price: 0,
              amount: 0,
              status: "",
            };
          })
        );

        const newBalances = balanceList.filter((t): t is Balance => !!t);
        balances.splice(0, balances.length, ...newBalances);
        balances.sort((a, b) => Number(a.token.reference_id) - Number(b.token.reference_id))

        subscriber.next([...balances]);

        newBalances.forEach(async balance => {
          const systemAccountSubscription = await api.query['system']['account'](publicKey, (data: any) => {
            const account = data?.toJSON() as any;
            const idx = balances.findIndex(t => t.id === balance.id);

            if (idx >= 0) {
              balances[idx] = {
                ...balances[idx],
                quantity: Number(account.data.free),
                price: 0,
                amount: 0,
              };

              subscriber.next([...balances]);
            }
          });

          subscriptions.push(systemAccountSubscription);
        });
      })();

      return () => subscriptions.forEach(unsub => unsub());
    });
  }

  async getBalance(api: ApiPromise, token: Token, publicKey: string): Promise<Balance> {
    const systemAccount = await api.query['system']['account'](publicKey);
    const account = systemAccount.toJSON() as any;

    const balance: Balance = {
      id: uuidv4(),
      token,
      quantity: Number(account.data.free),
      price: 0,
      amount: 0,
      status: "",
    };

    return balance;
  }

  watchBalance(api: ApiPromise, token: Token, publicKey: string): Observable<Balance> {
    return new Observable<Balance>(subscriber => {
      const subscriptions: any[] = [];

      (async () => {
        const systemAccountSubscription = await api.query['system']['account'](publicKey, (data: any) => {
          const account = data?.toJSON() as any;
          const newBalance: Balance = {
            id: uuidv4(),
            token,
            quantity: Number(account.data.free),
            price: 0,
            amount: 0,
            status: "",
          };

          subscriber.next(newBalance);
        });

        subscriptions.push(systemAccountSubscription);
      })();

      return () => subscriptions.forEach(unsub => unsub());
    });
  }

  // transfer(api: ApiPromise, balance: Balance, destPublicKey: string, value: number): SubmittableExtrinsic<"promise", ISubmittableResult> {
  //   const bigIntAmount = BigInt(value);

  //   const transferExtrinsic = api.tx['balances']['transferKeepAlive'](
  //     destPublicKey,
  //     bigIntAmount
  //   );

  //   return transferExtrinsic;
  // }

  transfer(api: ApiPromise, balance: Balance, destPublicKey: string, value: number, isKeepAlive: boolean = true): SubmittableExtrinsic<"promise", ISubmittableResult> {
    const bigIntAmount = BigInt(value);

    const transferExtrinsic = isKeepAlive
      ? api.tx['balances']['transferKeepAlive'](destPublicKey, bigIntAmount)
      : api.tx['balances']['transferAllowDeath'](destPublicKey, bigIntAmount);

    return transferExtrinsic;
  }

  async getEstimatedFees(api: ApiPromise, extrinsicHex: string, publicKey: string, token: Token | null): Promise<number> {
    const txBytes = hexToU8a(extrinsicHex);
    const call = api.createType('Extrinsic', txBytes);
    const tx = api.tx(call);

    const { partialFee } = await tx.paymentInfo(publicKey);

    return Number(BigInt(partialFee.toString()));
  }
}
