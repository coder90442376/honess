'use client'

/**
 * "Upgrade to Share Campaign" card.
 *
 * Drops onto the owner's view of a campaign. Renders every eligibility state:
 * eligible · blocked on a payout method · already upgraded · ineligible status ·
 * under review · loading · success.
 *
 * The CTA is deliberately understated — a bordered card with a single primary
 * button, not a banner. Creators here are often asking for help with something
 * hard; an aggressive upsell would read badly.
 *
 * Eligibility is re-fetched on mount (staleTime 0 in the hook) so a user who
 * just added a payout method in another tab, or who is returning via the
 * gate's `returnTo` link, is not shown a stale blocked state.
 */

import { useState } from 'react'
import styled from 'styled-components'
import { Sparkles, CheckCircle2, Info } from 'lucide-react'
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '@/styles/tokens'
import { useUpgradeEligibility, useUpgradeCampaign } from '@/hooks/useCampaignUpgrade'
import PayoutMethodGate from './PayoutMethodGate'
import UpgradeModal from './UpgradeModal'

const Card = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${SPACING[3]};
  padding: ${SPACING[5]};
  border: 1px solid ${COLORS.BORDER};
  border-radius: ${BORDER_RADIUS.LG};
  background: ${COLORS.SURFACE};
`

const Heading = styled.h3`
  display: flex;
  align-items: center;
  gap: ${SPACING[2]};
  margin: 0;
  font-size: 1.0625rem;
  font-weight: ${TYPOGRAPHY.WEIGHT_BOLD};
  color: ${COLORS.TEXT};
`

const Text = styled.p`
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: ${COLORS.MUTED_TEXT};
`

const Cta = styled.button`
  align-self: flex-start;
  min-height: 44px;
  padding: ${SPACING[2]} ${SPACING[5]};
  border: none;
  border-radius: ${BORDER_RADIUS.FULL};
  background: ${COLORS.PRIMARY};
  color: ${COLORS.SURFACE};
  font-weight: ${TYPOGRAPHY.WEIGHT_BOLD};
  font-size: 0.9375rem;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${COLORS.PRIMARY_DARK};
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 2px solid ${COLORS.PRIMARY_DARK};
    outline-offset: 2px;
  }

  @media (max-width: 640px) {
    align-self: stretch;
  }
`

const Chip = styled.span<{ $tone: 'success' | 'muted' }>`
  display: inline-flex;
  align-items: center;
  gap: ${SPACING[2]};
  align-self: flex-start;
  padding: ${SPACING[1]} ${SPACING[3]};
  border-radius: ${BORDER_RADIUS.FULL};
  font-size: 0.8125rem;
  font-weight: ${TYPOGRAPHY.WEIGHT_BOLD};
  background: ${({ $tone }) => ($tone === 'success' ? COLORS.SUCCESS_BG : COLORS.DISABLED)};
  color: ${({ $tone }) => ($tone === 'success' ? COLORS.SUCCESS_DARK : COLORS.MUTED_TEXT)};
`

const Skeleton = styled.div`
  height: 96px;
  border-radius: ${BORDER_RADIUS.LG};
  background: ${COLORS.DISABLED};

  @media (prefers-reduced-motion: no-preference) {
    animation: pulse 1.6s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }
`

/** Reason codes that mean "nothing the creator can do right now". */
const HARD_BLOCKERS = ['CAMPAIGN_STATUS_INELIGIBLE', 'CAMPAIGN_NOT_ELIGIBLE']

export interface UpgradeToShareCardProps {
  campaignId: string
  /** Where the payout-method flow should return the user to. */
  returnTo?: string
}

export function UpgradeToShareCard({ campaignId, returnTo }: UpgradeToShareCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const { data, isLoading, isError } = useUpgradeEligibility(campaignId)
  const upgrade = useUpgradeCampaign(campaignId)

  if (isLoading) return <Skeleton aria-hidden="true" />

  // Never let a failed eligibility lookup break the campaign page.
  if (isError || !data) return null

  // Only the owner gets this card. Supporters see the boost affordance instead.
  if (data.actor_role !== 'creator') return null

  const resolvedReturnTo = returnTo || `/campaigns/${data.campaign.campaign_id}`

  // Already a Share Campaign — acknowledge it and stop.
  if (data.campaign.already_share_campaign) {
    return (
      <Card aria-label="Share Campaign status">
        <Chip $tone="success">
          <CheckCircle2 size={14} aria-hidden="true" /> Share Campaign
        </Chip>
        <Text>
          Supporters can earn rewards for sharing this campaign
          {data.campaign.original_campaign_type
            ? ' — upgraded from a free campaign.'
            : '.'}
        </Text>
      </Card>
    )
  }

  const hardBlocker = data.reasons.find((r) => HARD_BLOCKERS.includes(r.code))
  const payoutBlocker = data.reasons.find(
    (r) => r.code === 'NO_PAYOUT_METHOD' || r.code === 'PAYOUT_READINESS_CHECK_FAILED'
  )

  // Paused for review, completed, ended: explain, offer nothing.
  if (hardBlocker) {
    return (
      <Card aria-label="Upgrade to Share Campaign">
        <Heading>
          <Info size={18} aria-hidden="true" /> Upgrade to a Share Campaign
        </Heading>
        <Text>{hardBlocker.message}</Text>
        <Cta type="button" disabled aria-disabled="true">
          Upgrade to Share Campaign
        </Cta>
      </Card>
    )
  }

  return (
    <>
      <Card aria-label="Upgrade to Share Campaign">
        <Heading>
          <Sparkles size={18} aria-hidden="true" /> Turn this into a Share Campaign
        </Heading>
        <Text>
          Reward the people who share your story. Everything on this page stays exactly as it is —
          you just add a reward for supporters whose shares bring someone in.
        </Text>

        {payoutBlocker && (
          <PayoutMethodGate
            level="none"
            returnTo={resolvedReturnTo}
            message={payoutBlocker.message}
          />
        )}

        {!payoutBlocker && data.payout_readiness.level === 'provisional' && (
          <PayoutMethodGate
            level="provisional"
            method={data.payout_readiness.method}
            returnTo={resolvedReturnTo}
          />
        )}

        <Cta
          type="button"
          disabled={!!payoutBlocker || upgrade.isPending}
          onClick={() => setModalOpen(true)}
        >
          {upgrade.isPending ? 'Upgrading…' : 'Upgrade to Share Campaign'}
        </Cta>
      </Card>

      {modalOpen && (
        <UpgradeModal
          eligibility={data}
          returnTo={resolvedReturnTo}
          isSubmitting={upgrade.isPending}
          errorMessage={(upgrade.error as any)?.response?.data?.message ?? null}
          onClose={() => setModalOpen(false)}
          onConfirm={(payload) =>
            upgrade.mutate(payload, {
              onSuccess: () => setModalOpen(false),
              // Deliberately stays open on failure: the same idempotency key is
              // reused for the retry, so re-submitting cannot double-upgrade.
            })
          }
        />
      )}
    </>
  )
}

export default UpgradeToShareCard
