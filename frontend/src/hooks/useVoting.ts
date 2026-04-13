import { useState, useCallback } from "react";
import { useAccount } from "wagmi";

export interface VoteState {
  voted: boolean;
  support: boolean | null;
  loading: boolean;
  error: string | null;
}

export function useVoting(proposalId: number) {
  const { address, isConnected } = useAccount();
  const [state, setState] = useState<VoteState>({
    voted: false,
    support: null,
    loading: false,
    error: null,
  });

  const castVote = useCallback(
    async (support: boolean) => {
      if (!isConnected || !address) {
        setState(s => ({ ...s, error: "Wallet not connected" }));
        return;
      }
      if (state.voted) {
        setState(s => ({ ...s, error: "Already voted" }));
        return;
      }

      setState(s => ({ ...s, loading: true, error: null }));
      try {
        // In production: call UpgradeProposal.castVote(proposalId, support) via wagmi
        // const { writeContract } = useWriteContract()
        // writeContract({ abi: UPGRADE_PROPOSAL_ABI, address: PROPOSAL_ADDRESS, functionName: "castVote", args: [BigInt(proposalId), support] })
        await new Promise(r => setTimeout(r, 1000));
        setState({ voted: true, support, loading: false, error: null });
      } catch (err) {
        setState(s => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : "Vote failed",
        }));
      }
    },
    [proposalId, address, isConnected, state.voted]
  );

  return { ...state, castVote, isConnected };
}
