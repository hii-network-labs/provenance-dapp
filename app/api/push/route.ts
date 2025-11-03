import { NextResponse } from "next/server";
import { ethers } from "ethers";
import abi from "@/abi/ProvenanceRegistry.json";
import type { PushEntityBody, PushBatchBody, PushResponse } from "@/lib/contract";
import { saveEntityByTx } from "@/lib/db";
import { getProvider, getRegistryContract } from "@/lib/contract";

function isBytes32(val?: string | null): boolean {
  if (!val) return false;
  return /^0x[0-9a-fA-F]{64}$/.test(val);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PushEntityBody | PushBatchBody;

    const rpcUrl = process.env.RPC_URL;
    const pk = process.env.PRIVATE_KEY;
    const address = process.env.CONTRACT_ADDRESS;
    const explorer = process.env.CHAIN_EXPLORER_TX_URL;
    const chainName = process.env.CHAIN_NAME;

    if (!rpcUrl || !pk || !address || !explorer) {
      return NextResponse.json<PushResponse>({ success: false, error: "Missing env: RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS, CHAIN_EXPLORER_TX_URL" }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(pk, provider);
    const contract = new ethers.Contract(address, abi, signer);

    // Handle batch submission
    if ((body as PushBatchBody).batch) {
      const batchBody = body as PushBatchBody;
      if (!batchBody.items || batchBody.items.length < 2) {
        return NextResponse.json<PushResponse>({ success: false, error: "Batch mode requires at least two items" }, { status: 400 });
      }

      // Convert inputs
      const ids: string[] = [];
      const types_: string[] = [];
      const dataJsons: string[] = [];
      const previousIds: string[] = [];

      for (const item of batchBody.items) {
        if (!item.entityType) {
          return NextResponse.json<PushResponse>({ success: false, error: "Missing entityType in batch item" }, { status: 400 });
        }
        if (!item.dataJson) {
          return NextResponse.json<PushResponse>({ success: false, error: "Missing dataJson in batch item" }, { status: 400 });
        }

        let idBytes32: string;
        if (isBytes32(item.id)) {
          idBytes32 = item.id as string;
        } else {
          const base = item.id ?? item.baseKey ?? item.entityType;
          idBytes32 = ethers.id(base);
        }

        const prev = isBytes32(item.previousId) ? (item.previousId as string) : ethers.ZeroHash;

        ids.push(idBytes32);
        types_.push(item.entityType);
        dataJsons.push(item.dataJson);
        previousIds.push(prev);
      }

      const tx = await contract.pushBatchEntities(ids, types_, dataJsons, previousIds);
      const receipt = await tx.wait(1);
      const txHash = tx.hash as string;
      const txUrl = `${explorer}${txHash}`;

      // Persist first entity for this tx (detail page uses first event)
      try {
        const firstId = ids[0];
        if (firstId) {
          const r = await (contract as any).getEntity(firstId);
          await saveEntityByTx({
            tx_hash: txHash,
            id: r.id as string,
            entity_type: r.entityType as string,
            data_json: r.dataJson as string,
            version: (r.version as bigint)?.toString?.() ?? String(r.version),
            previous_id: r.previousId as string,
            timestamp: (r.timestamp as bigint)?.toString?.() ?? String(r.timestamp),
            submitter: r.submitter as string,
            tx_url: txUrl,
            chain_name: chainName || null,
          });
        }
      } catch (e) {
        // Swallow DB errors to not impact chain success
        console.warn("DB persist failed for batch:", (e as any)?.message || e);
      }

      return NextResponse.json<PushResponse>({ success: true, txHash, txUrl, receipt, chainName });
    }

    // Single entity submission
    const single = body as PushEntityBody;
    if (!single.entityType || !single.dataJson) {
      return NextResponse.json<PushResponse>({ success: false, error: "Missing entityType or dataJson" }, { status: 400 });
    }

    let idBytes32: string;
    if (isBytes32(single.id)) {
      idBytes32 = single.id as string;
    } else {
      const base = single.id ?? single.baseKey ?? single.entityType;
      idBytes32 = ethers.id(base);
    }

    const prev = isBytes32(single.previousId) ? (single.previousId as string) : ethers.ZeroHash;

    const tx = await contract.pushEntity(idBytes32, single.entityType, single.dataJson, prev);
    const receipt = await tx.wait(1);
    const txHash = tx.hash as string;
    const txUrl = `${explorer}${txHash}`;

    // Persist entity for this tx
    try {
      const r = await (contract as any).getEntity(idBytes32);
      await saveEntityByTx({
        tx_hash: txHash,
        id: r.id as string,
        entity_type: r.entityType as string,
        data_json: r.dataJson as string,
        version: (r.version as bigint)?.toString?.() ?? String(r.version),
        previous_id: r.previousId as string,
        timestamp: (r.timestamp as bigint)?.toString?.() ?? String(r.timestamp),
        submitter: r.submitter as string,
        tx_url: txUrl,
        chain_name: chainName || null,
      });
    } catch (e) {
      // Swallow DB errors to not impact chain success
      console.warn("DB persist failed:", (e as any)?.message || e);
    }

    return NextResponse.json<PushResponse>({ success: true, txHash, txUrl, receipt, chainName });
  } catch (err: any) {
    const message = err?.shortMessage || err?.message || "Unknown error";
    return NextResponse.json<PushResponse>({ success: false, error: message }, { status: 500 });
  }
}