import { Network } from "./network.model";

export enum ChainType {
  Substrate = 'Substrate',
}

export enum ScannerType {
  Subscan = 'Subscan',
  Subsquid = 'Subsquid',
  Solscan = 'Solscan',
}

export class Scanner {
  type: ScannerType = ScannerType.Subscan;
  transfers_url?: string = "https://blockscanner.xode.net/transfers";
  extrinsics_url?: string = "https://blockscanner.xode.net/extrinsics";
}

export class Chain {
  id: number = 2;
  network: Network = Network.Polkadot;
  name: string = "Xode - Polkadot";
  description: string = "Experience smooth and fast transactions with Xode."
  chain_id: number = 3417;
  genesis_hash: string = "0xb2985e778bb748c70e450dcc084cc7da79fe742cc23d3b040abd7028187de69c";
  unit: string = "XON";
  decimal: number = 12;
  chain_type: ChainType = ChainType.Substrate;
  address_prefix: string | number | null = 280;
  image: string = "src/assets/images/networks/xode.png";
  scanner?: Scanner = {
    type: ScannerType.Subsquid,
    transfers_url: "https://blockscanner.xode.net/transfers",
    extrinsics_url: "https://blockscanner.xode.net/extrinsics"
  }
}
