'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
  campaignBoostService,
  type BoostEligibility,
  type BoostSource,
} from '@/services/campaignBoostService'

/**
 * Community (peer) boost hooks.
 *
 * ⚠️ Separate from the creator's paid "Promote" purchase under /boosts.
 */
export const boostKeys = {
  all: ['campaign-support-boost'] as const,
  eligibility: (campaignId: string) => [...boostKeys.all, 'eligibility', campaignId] as const,
  stats: (campaignId: string) => [...boostKeys.all, 'stats', campaignId] as const,
  mine: (page: number) => [...boostKeys.all, 'mine', page] as const,
}

export function useBoostEligibility(campaignId: string | undefined, enabled = true) {
  return useQuery<BoostEligibility>({
    queryKey: boostKeys.eligibility(campaignId ?? ''),
    queryFn: () => campaignBoostService.getEligibility(campaignId as string),
    enabled: !!campaignId && enabled,
    staleTime: 60 * 1000,
    retry: false,
  })
}

export function useBoostStats(campaignId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: boostKeys.stats(campaignId ?? ''),
    queryFn: () => campaignBoostService.getStats(campaignId as string),
    enabled: !!campaignId && enabled,
    staleTime: 60 * 1000,
  })
}

/**
 * Boost a campaign, with an optimistic count bump.
 *
 * The optimistic update is rolled back on failure. It is NOT rolled back when
 * the server reports `counted: false` (the user already boosted today) — in
 * that case the count was never going to change, so we simply write the
 * server's authoritative numbers over the optimistic ones.
 */
export function useBoostCampaign(campaignId: string | undefined) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: { source?: BoostSource; share_id?: string; channel?: string } = {}) =>
      campaignBoostService.boost(campaignId as string, payload),

    onMutate: async () => {
      const key = boostKeys.eligibility(campaignId ?? '')
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<BoostEligibility>(key)

      if (previous?.can_boost) {
        qc.setQueryData<BoostEligibility>(key, {
          ...previous,
          can_boost: false,
          state: 'already_boosted_today',
          community_boost_count: previous.community_boost_count + 1,
        })
      }

      return { previous }
    },

    onError: (error: any, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(boostKeys.eligibility(campaignId ?? ''), context.previous)
      }
      toast.error(error?.response?.data?.message || 'We could not record that boost.')
    },

    onSuccess: (response) => {
      const result = response?.data
      const key = boostKeys.eligibility(campaignId ?? '')
      const current = qc.getQueryData<BoostEligibility>(key)

      if (current && result?.campaign) {
        qc.setQueryData<BoostEligibility>(key, {
          ...current,
          can_boost: false,
          state: 'already_boosted_today',
          community_boost_count: result.campaign.community_boost_count,
          community_boost_score: result.campaign.community_boost_score,
          next_boost_available_at: result.next_boost_available_at,
        })
      }

      if (result?.counted) {
        toast.success(response?.message || 'Thanks for the boost!')
      } else {
        // Over-quota is information, not a failure.
        toast.info(response?.message || 'You already boosted this campaign today.')
      }

      qc.invalidateQueries({ queryKey: boostKeys.stats(campaignId ?? '') })
    },
  })
}

export function useMyBoostActivity(page = 1) {
  return useQuery({
    queryKey: boostKeys.mine(page),
    queryFn: () => campaignBoostService.getMyBoostActivity({ page }),
    staleTime: 60 * 1000,
  })
}
