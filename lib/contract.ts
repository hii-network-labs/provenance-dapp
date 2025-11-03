import { ethers } from "ethers";
import abi from "@/abi/ProvenanceRegistry.json";

export function getProvider() {
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) throw new Error("RPC_URL is not set");
  return new ethers.JsonRpcProvider(rpcUrl);
}

export function getSigner(provider?: ethers.Provider) {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error("PRIVATE_KEY is not set");
  const prov = provider ?? getProvider();
  return new ethers.Wallet(pk, prov);
}

export function getRegistryContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
  const address = process.env.CONTRACT_ADDRESS;
  if (!address) throw new Error("CONTRACT_ADDRESS is not set");
  const sp = signerOrProvider ?? getProvider();
  return new ethers.Contract(address, abi, sp);
}

export type PushEntityBody = {
  id?: string; // bytes32 or string, optional if baseKey present
  baseKey?: string; // used to compute id if id is empty
  entityType: string;
  dataJson: string;
  previousId?: string | null; // bytes32 or null/empty
};

export type PushBatchBody = {
  batch: true;
  items: PushEntityBody[]; // each item will be converted to bytes32 and strings
};

export type PushResponse = {
  success: boolean;
  txHash?: string;
  txUrl?: string;
  receipt?: unknown;
  chainName?: string;
  error?: string;
};