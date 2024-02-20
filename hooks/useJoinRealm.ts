import {useUserCommunityTokenOwnerRecord} from "@hooks/queries/tokenOwnerRecord";
import { withCreateTokenOwnerRecord } from '@solana/spl-governance'
import {useRealmQuery} from "@hooks/queries/realm";
import useWalletOnePointOh from "@hooks/useWalletOnePointOh";
import useProgramVersion from "@hooks/useProgramVersion";
import {useRealmVoterWeightPlugins} from "@hooks/useRealmVoterWeightPlugins";
import {useCallback, useEffect, useState} from "react";
import {TransactionInstruction} from "@solana/web3.js";

type UseJoinRealmReturnType = {
    // use this to decide whether the join button should be displayed
    userNeedsTokenOwnerRecord: boolean,
    userNeedsVoterWeightRecords: boolean,
    // returns an array of instructions that should be added to a transaction when the join button is clicked.
    handleRegister: () => Promise<TransactionInstruction[]>
}

export const useJoinRealm = (): UseJoinRealmReturnType => {
    const tokenOwnerRecord = useUserCommunityTokenOwnerRecord().data?.result
    const { plugins , createVoterWeightRecords } = useRealmVoterWeightPlugins();
    const realm = useRealmQuery().data?.result
    const wallet = useWalletOnePointOh()
    const programVersion = useProgramVersion()
    const [userNeedsVoterWeightRecords, setUserNeedsVoterWeightRecords] = useState(false)

    // A user needs a token owner record if they don't have one already and either
    // there are no plugins (vanilla realm) or
    // the first plugin in the chain requires an input voter weight
    const userNeedsTokenOwnerRecord = !tokenOwnerRecord && (plugins?.length === 0 || !!plugins?.[0].client.requiresInputVoterWeight);
    useEffect(() => {
        createVoterWeightRecords()
            .then((ixes) => setUserNeedsVoterWeightRecords(ixes.length > 0));
    }, [createVoterWeightRecords])

    const handleRegister = useCallback(async () => {
        const onboardUserIxes = []
        if (userNeedsTokenOwnerRecord && realm && wallet?.publicKey && programVersion) {
            await withCreateTokenOwnerRecord(onboardUserIxes,
                realm.owner,
                programVersion,
                realm.pubkey,
                wallet.publicKey,
                realm.account.communityMint,
                wallet.publicKey)
        }

        const createVoterWeightRecordIxes = await createVoterWeightRecords();
        return [...createVoterWeightRecordIxes, ...onboardUserIxes]
    }, [realm?.pubkey.toBase58(), wallet?.publicKey?.toBase58(), programVersion, userNeedsTokenOwnerRecord])

    return {
        // use these to decide whether the join button should be displayed
        userNeedsTokenOwnerRecord,
        userNeedsVoterWeightRecords,
        // returns an array of instructions that should be added to a transaction when the join button is clicked.
        handleRegister
    }
}