/* eslint-disable react-hooks/exhaustive-deps */
import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import queryClient from '@hooks/queries/queryClient'
import { useConnection } from '@solana/wallet-adapter-react'
import { updateVoterWeightRecord } from './updateVoterWeightRecord'
import { createVoterWeightRecord } from './createVoterWeightRecord'
import { PluginData, getPlugins } from './getPlugins'
import { useState, useEffect, useCallback } from 'react'
import { BN } from '@coral-xyz/anchor'
import { calculateVoteWeight } from './calculateVoteWeight'

export interface usePluginsArgs {
  realmPublicKey: PublicKey | undefined
  governanceMintPublicKey: PublicKey | undefined
  walletPublicKey: PublicKey | undefined
}

export interface usePluginsReturnType {
  plugins: Array<any>
  updateVoterWeight: () => Promise<TransactionInstruction[]>
  createVoterWeight: () => Promise<TransactionInstruction[]>
  voteWeight: BN | null
}

export const usePlugins = ({
  realmPublicKey,
  governanceMintPublicKey,
  walletPublicKey,
}: usePluginsArgs): usePluginsReturnType => {
  const { connection } = useConnection()
  const [plugins, setPlugins] = useState<Array<PluginData>>([])
  const [voteWeight, setVoteWeight] = useState<BN | null>(null)

  const fetchPlugins = useCallback(() => {
    if (!realmPublicKey || !governanceMintPublicKey || !walletPublicKey) {
      return Promise.resolve([])
    }

    return queryClient.fetchQuery({
      queryKey: ['fetchPlugins', realmPublicKey, governanceMintPublicKey],
      queryFn: () =>
        getPlugins({
          realmPublicKey,
          governanceMintPublicKey,
          walletPublicKey,
          connection,
        }),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realmPublicKey, governanceMintPublicKey, walletPublicKey])

  useEffect(() => {
    // TODO implement getting and setting voterWeight, maxVoterWeightRecord, voterWeightRecord
    // from the plugin info object
    const fetchAndSetPlugins = async () => {
      if (!realmPublicKey || !governanceMintPublicKey || !walletPublicKey) {
        return
      }
      const newPlugins = await fetchPlugins()
      setPlugins(newPlugins)
    }

    fetchAndSetPlugins()
    // convert to strings to prevent unecessary re-runs when the same publickey but different object is passed to hook
  }, [
    realmPublicKey?.toBase58(),
    governanceMintPublicKey?.toBase58(),
    walletPublicKey?.toBase58(),
  ])

  useEffect(() => {
    // get calculated vote weight
    const fetchAndSetWeight = async () => {
      const weight = await calculateVoteWeight(plugins)
      setVoteWeight(weight)
    }

    if (plugins.length) {
      fetchAndSetWeight()
    }
  }, [plugins])

  const createVoterWeight = (): Promise<TransactionInstruction[]> => {
    if (!realmPublicKey || !governanceMintPublicKey || !walletPublicKey) {
      return Promise.resolve([])
    }

    return queryClient.fetchQuery({
      queryKey: [
        'createVoteWeight',
        realmPublicKey,
        walletPublicKey,
        governanceMintPublicKey,
      ],
      queryFn: () =>
        createVoterWeightRecord({
          walletPublicKey,
          realmPublicKey,
          governanceMintPublicKey,
          connection,
        }),
    })
  }

  const updateVoterWeight = (): Promise<TransactionInstruction[]> => {
    if (!realmPublicKey || !governanceMintPublicKey || !walletPublicKey) {
      return Promise.resolve([])
    }

    return queryClient.fetchQuery({
      queryKey: [
        'updateVoteWeight',
        realmPublicKey,
        walletPublicKey,
        governanceMintPublicKey,
      ],
      queryFn: () =>
        updateVoterWeightRecord({
          walletPublicKey,
          realmPublicKey,
          governanceMintPublicKey,
          connection,
        }),
    })
  }

  return {
    updateVoterWeight,
    createVoterWeight,
    plugins,
    voteWeight,
  }
}