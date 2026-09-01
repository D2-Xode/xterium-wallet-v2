import { Injectable } from '@angular/core';

import { Network } from "src/models/network.model"
import { Chain, ChainType, ScannerType } from "src/models/chain.model"

@Injectable({
  providedIn: 'root'
})
export class ChainsService {

  private readonly chains: Chain[] = [
    {
      id: 1,
      network: Network.AllNetworks,
      name: "All Chains",
      description: "Includes every supported chains.",
      chain_id: 0,
      genesis_hash: "0x-all-networks-genesis-hash-placeholder",
      unit: "DOT",
      decimal: 10,
      chain_type: ChainType.Substrate,
      address_prefix: 0,
      image: "all-chains.png",
      scanner: undefined
    },
    {
      id: 2,
      network: Network.UnknownNetwork,
      name: "Polkadot",
      description: "The heart of Web3, connecting multiple specialized blockchains into a unified network.",
      chain_id: 0,
      genesis_hash: "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
      unit: "DOT",
      decimal: 10,
      chain_type: ChainType.Substrate,
      address_prefix: 0,
      image: "polkadot.png",
      scanner: undefined
    },
    {
      id: 3,
      network: Network.Polkadot,
      name: "Polkadot Hub",
      description: "Manage your assets easily on the AssetHub parachain.",
      chain_id: 1000,
      genesis_hash: "0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f",
      unit: "DOT",
      decimal: 10,
      chain_type: ChainType.Substrate,
      address_prefix: 0,
      image: "assethub.png",
      scanner: {
        type: ScannerType.Subscan,
        transfers_url: "https://assethub-polkadot.api.subscan.io/api/v2/scan/transfers",
        extrinsics_url: "https://assethub-polkadot.api.subscan.io/api/v2/scan/extrinsics"
      }
    },
    {
      id: 4,
      network: Network.Polkadot,
      name: "Xode",
      description: "Experience smooth and fast transactions with Xode.",
      chain_id: 3417,
      genesis_hash: "0xb2985e778bb748c70e450dcc084cc7da79fe742cc23d3b040abd7028187de69c",
      unit: "XON",
      decimal: 12,
      chain_type: ChainType.Substrate,
      address_prefix: 280,
      image: "xode.png",
      scanner: {
        type: ScannerType.Subsquid,
        transfers_url: "https://indexer.xode.net",
        extrinsics_url: "https://indexer.xode.net"
      }
    },
    {
      id: 5,
      network: Network.Polkadot,
      name: "Hydration",
      description: "Participate in decentralized trading and liquidity on the Hydration network.",
      chain_id: 2034,
      genesis_hash: "0xafdc188f45c71dacbaa0b62e16a91f726c7b8699a9748cdf715459de6b7f366d",
      unit: "HDX",
      decimal: 12,
      chain_type: ChainType.Substrate,
      address_prefix: 0,
      image: "hydration.png",
      scanner: {
        type: ScannerType.Subscan,
        transfers_url: "https://hydration.api.subscan.io/api/v2/scan/transfers",
        extrinsics_url: "https://hydration.api.subscan.io/api/v2/scan/extrinsics"
      }
    },
    {
      id: 6,
      network: Network.Paseo,
      name: "Paseo",
      description: "Test and experience Xode on the Paseo test network.",
      chain_id: 5109,
      genesis_hash: "0x190115504f77174ba6d0a7adfb848e8c77dc4240dd01ef7abcf90ccf5f4138fe",
      unit: "XON",
      decimal: 12,
      chain_type: ChainType.Substrate,
      address_prefix: 280,
      image: "paseo.png",
      scanner: undefined
    },
    {
      id: 7,
      network: Network.Rococo,
      name: "Polaris",
      description: "Xode's devnet parachain on Rococo for testing purposes.",
      chain_id: 2000,
      genesis_hash: "0xcf724a845903bfe5c333c49d618b9bd65a955c7f357094e86f5fd85b7d0c16d6",
      unit: "XON",
      decimal: 12,
      chain_type: ChainType.Substrate,
      address_prefix: 280,
      image: "polaris.png",
      scanner: undefined
    }
  ];

  constructor() { }

  getAllChains(): Chain[] {
    return [...this.chains];
  }

  getChainById(id: number): Chain | undefined {
    return this.chains.find(chain => chain.id === id);
  }

  getChainByGenesisHash(genesisHash: string): Chain | undefined {
    return this.chains.find(chain => chain.genesis_hash === genesisHash);
  }

  getChainsByNetwork(network: Network): Chain[] {
    return this.chains.filter(chain => chain.network === network);
  }

  getChainByChainId(chainId: number): Chain | undefined {
    return this.chains.find(chain => chain.chain_id === chainId);
  }
}
