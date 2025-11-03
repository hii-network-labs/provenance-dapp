import { NextResponse } from "next/server";
import { ethers } from "ethers";
import abi from "../../../../abi/ProvenanceRegistry.json";
import { getProvider, getRegistryContract } from "../../../../lib/contract";
import { getEntityByTx, saveEntityByTx } from "../../../../lib/db";

// Simple in-memory cache for transaction details.
// Note: In-memory cache persists for the lifetime of the server process.
// For serverless environments, consider an external cache (Redis) instead.
type CacheEntry = { value: any; expiresAt: number };
const txCache = new Map<string, CacheEntry>();
const CACHE_TTL_SUCCESS_MS = 5 * 60 * 1000; // 5 minutes for successful fetches
const CACHE_TTL_ERROR_MS = 15 * 1000; // 15 seconds for errors/not found to avoid hammering

const cacheHeaders: Record<string, string> = {
  // Allow browser and any CDN to cache briefly; SWR gives a smooth refresh
  "Cache-Control": "public, max-age=30, s-maxage=120, stale-while-revalidate=300",
};

export async function GET(
  _req: Request,
  { params }: { params: { hash: string } }
) {
  try {
    const { RPC_URL, CONTRACT_ADDRESS, CHAIN_EXPLORER_TX_URL, CHAIN_NAME } =
      process.env as Record<string, string | undefined>;

    if (!RPC_URL || !CONTRACT_ADDRESS || !CHAIN_EXPLORER_TX_URL) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required env vars: RPC_URL, CONTRACT_ADDRESS, CHAIN_EXPLORER_TX_URL",
        },
        { status: 500 }
      );
    }

    const txHash = params.hash;

    // Serve from cache if present and not expired
    const cached = txCache.get(txHash);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.value, { headers: cacheHeaders });
    }

    // Attempt DB lookup first
    const dbRow = await getEntityByTx(txHash);
    if (dbRow) {
      const payload = {
        success: true,
        txHash,
        txUrl: dbRow.tx_url || `${CHAIN_EXPLORER_TX_URL}${txHash}`,
        chainName: dbRow.chain_name || CHAIN_NAME || "",
        events: [],
        entity: dbRow.id
          ? {
              id: dbRow.id,
              entityType: dbRow.entity_type || "",
              dataJson: dbRow.data_json || "",
              version: dbRow.version || "",
              previousId: dbRow.previous_id || "",
              timestamp: dbRow.timestamp || "",
              submitter: dbRow.submitter || "",
            }
          : null,
      };
      txCache.set(txHash, { value: payload, expiresAt: Date.now() + CACHE_TTL_SUCCESS_MS });
      return NextResponse.json(payload, { headers: cacheHeaders });
    }
    const provider = getProvider();
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      const payload = { success: false, error: "Transaction not found" };
      txCache.set(txHash, { value: payload, expiresAt: Date.now() + CACHE_TTL_ERROR_MS });
      return NextResponse.json(payload, { status: 404, headers: cacheHeaders });
    }

    const iface = new ethers.Interface(abi as any);
    const matchedLogs: Array<{
      name: string;
      id?: string;
      entityType?: string;
      submitter?: string;
      version?: string;
    }> = [];

    for (const log of receipt.logs || []) {
      // Restrict to our contract address if available
      if (log.address?.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) continue;
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "EntityPushed") {
          const id = parsed.args?.id as string;
          const entityType = parsed.args?.entityType as string;
          const submitter = parsed.args?.submitter as string;
          const version = (parsed.args?.version as bigint)?.toString();
          matchedLogs.push({ name: parsed.name, id, entityType, submitter, version });
        }
      } catch {
        // Not our event; ignore
      }
    }

    let entity: any = null;
    if (matchedLogs.length > 0 && matchedLogs[0].id) {
      const contract = getRegistryContract();
      try {
        const r = await (contract as any).getEntity(matchedLogs[0].id);
        entity = {
          id: r.id as string,
          entityType: r.entityType as string,
          dataJson: r.dataJson as string,
          version: (r.version as bigint)?.toString?.() ?? String(r.version),
          previousId: r.previousId as string,
          timestamp: (r.timestamp as bigint)?.toString?.() ?? String(r.timestamp),
          submitter: r.submitter as string,
        };
      } catch (err) {
        // If read fails, we still return basic info
        entity = null;
      }
    }

    const txUrl = `${CHAIN_EXPLORER_TX_URL}${txHash}`;
    const payload = {
      success: true,
      txHash,
      txUrl,
      chainName: CHAIN_NAME || "",
      events: matchedLogs,
      entity,
      receipt,
    };
    txCache.set(txHash, { value: payload, expiresAt: Date.now() + CACHE_TTL_SUCCESS_MS });
    // Persist to DB to warm future reads
    try {
      if (entity) {
        await saveEntityByTx({
          tx_hash: txHash,
          id: entity.id,
          entity_type: entity.entityType,
          data_json: entity.dataJson,
          version: entity.version,
          previous_id: entity.previousId,
          timestamp: entity.timestamp,
          submitter: entity.submitter,
          tx_url: txUrl,
          chain_name: CHAIN_NAME || null,
        });
      }
    } catch (e) {
      console.warn("DB persist failed during GET fallback:", (e as any)?.message || e);
    }
    return NextResponse.json(payload, { headers: cacheHeaders });
  } catch (error: any) {
    const payload = { success: false, error: error?.message || "Unknown error" };
    // Cache transient errors briefly keyed by txHash to avoid hammering upstream.
    txCache.set(params.hash, { value: payload, expiresAt: Date.now() + CACHE_TTL_ERROR_MS });
    return NextResponse.json(payload, { status: 500, headers: cacheHeaders });
  }
}