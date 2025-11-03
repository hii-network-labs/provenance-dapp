import { NextResponse } from "next/server";
import { ethers } from "ethers";
import abi from "../../../../abi/ProvenanceRegistry.json";
import { getProvider, getRegistryContract } from "../../../../lib/contract";

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
    const provider = getProvider();
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
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
    return NextResponse.json({
      success: true,
      txHash,
      txUrl,
      chainName: CHAIN_NAME || "",
      events: matchedLogs,
      entity,
      receipt,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}