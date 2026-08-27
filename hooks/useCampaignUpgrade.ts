'use client'

import { useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
  campaignUpgradeService,
  newIdempotencyKey,
  type UpgradeEligibility,
  type UpgradeShareConfigInput,
} from '@/services/campaignUpgradeService'

/**
 * Free Campaign → Share Campaign upgrade hooks.
 *
 * A single key factory keeps eligibility, the owner's request inbox and the
 * campaign record itself invalidating coherently — an upgrade changes all three.
 */
export const upgradeKeys = {
  all: ['campaign-upgrade'] as const,
  eligibility: (campaignId: string) => [...upgradeKeys.all, 'eligibility', campaignId] as const,
  myRequests: (status: string) => [...upgradeKeys.all, 'my-requests', status] as const,
}

/**
 * Eligibility for the upgrade affordance.
 *
 * `staleTime: 0` is deliberate. Eligibility depends on the user's payout
 * method, which they may add in another tab mid-flow; serving a cached "not
 * eligible" would strand them behind a gate they have already cleared.
 */
export function useUpgradeEligibility(campaignId: string | undefined, enabled = true) {
  return useQuery<UpgradeEligibility>({
    queryKey: upgradeKeys.eligibility(campaignId ?? ''),
    queryFn: () => campaignUpgradeService.getEligibility(campaignId as string),
    enabled: !!campaignId && enabled,
    staleTime: 0,
    retry: false,
  })
}

/**
 * Creator upgrade.
 *
 * Holds ONE idempotency key for the whole attempt, including retries after a
 * failure, so a lost response cannot produce a second upgrade. The key is
 * rotated only once an attempt genuinely succeeds.
 */
export function useUpgradeCampaign(campaignId: string | undefined) {
  const qc = useQueryClient()
  const idempotencyKey = useRef<string>(newIdempotencyKey())

  const mutation = useMutation({
    mutationFn: (payload: UpgradeShareConfigInput & {
      payout_consent: boolean
      payment_method_id?: string | null
    }) =>
      campaignUpgradeService.upgradeOwnCampaign(campaignId as string, {
        ...payload,
        idempotency_key: idempotencyKey.current,
      }),
    onSuccess: (data) => {
      idempotencyKey.current = newIdempotencyKey()
      toast.success(data?.message || 'Your campaign is now a Share Campaign.')
      qc.invalidateQueries({ queryKey: upgradeKeys.eligibility(campaignId ?? '') })
      qc.invalidateQueries({ queryKey: ['campaign', campaignId] })
      qc.invalidateQueries({ queryKey: ['campaigns'] })
    },
    onError: (error: any) => {
      // The server's message is written for the user (e.g. why a payout method
      // is needed), so prefer it over anything generic.
      toast.error(
        error?.response?.data?.message || 'We could not upgrade this campaign. Please try again.'
      )
    },
  })

  const errorCode = (mutation.error as any)?.response?.data?.code ?? null

  return { ...mutation, errorCode }
}

/**
 * Sponsored upgrade request — a supporter asking the owner.
 */
export function useRequestUpgradeForOther(campaignId: string | undefined) {
  const qc = useQueryClient()
  const idempotencyKey = useRef<string>(newIdempotencyKey())

  return useMutation({
    mutationFn: (payload: Partial<UpgradeShareConfigInput> & { reason?: string }) =>
      campaignUpgradeService.requestUpgradeForOther(campaignId as string, {
        ...payload,
        idempotency_key: idempotencyKey.current,
      }),
    onSuccess: (data) => {
      idempotencyKey.current = newIdempotencyKey()
      toast.success(data?.message || 'Your request was sent to the campaign owner.')
      qc.invalidateQueries({ queryKey: upgradeKeys.eligibility(campaignId ?? '') })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'We could not send that request.')
    },
  })
}

/**
 * The owner's inbox of sponsored requests.
 */
export function useMyUpgradeRequests(status = 'pending_owner_approval', enabled = true) {
  return useQuery({
    queryKey: upgradeKeys.myRequests(status),
    queryFn: () => campaignUpgradeService.getMyUpgradeRequests({ status }),
    enabled,
    staleTime: 30 * 1000,
    // Used for a nav badge on every page: a signed-out visitor would 401, and
    // retrying that is pure noise.
    retry: false,
  })
}

/**
 * Owner approve / reject / sponsor cancel, sharing one invalidation policy.
 */
export function useResolveUpgradeRequest() {
  const qc = useQueryClient()

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: upgradeKeys.all })
    qc.invalidateQueries({ queryKey: ['campaigns'] })
  }, [qc])

  const approve = useMutation({
    mutationFn: ({
      upgradeId,
      ...payload
    }: UpgradeShareConfigInput & {
      upgradeId: string
      payout_consent: boolean
      payment_method_id?: string | null
    }) => campaignUpgradeService.approveUpgradeRequest(upgradeId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Your campaign is now a Share Campaign.')
      invalidate()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'We could not approve that request.')
    },
  })

  const reject = useMutation({
    mutationFn: ({ upgradeId, reason }: { upgradeId: string; reason?: string }) =>
      campaignUpgradeService.rejectUpgradeRequest(upgradeId, reason),
    onSuccess: () => {
      toast.info('Request declined.')
      invalidate()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'We could not decline that request.')
    },
  })

  const cancel = useMutation({
    mutationFn: ({ upgradeId }: { upgradeId: string }) =>
      campaignUpgradeService.cancelUpgradeRequest(upgradeId),
    onSuccess: () => {
      toast.info('Request cancelled.')
      invalidate()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'We could not cancel that request.')
    },
  })

  return { approve, reject, cancel }
}
