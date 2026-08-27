'use client'

/**
 * "Ask the creator to turn this into a Share Campaign" — the supporter's side
 * of a sponsored upgrade.
 *
 * This is the entry point for the user-to-user upgrade. It is a REQUEST, never
 * a change: the upgrade obliges the campaign OWNER to pay sharers directly out
 * of their own pocket, and no third party can take on someone else's financial
 * obligation. So this component can only ever create a pending request that the
 * owner approves or declines in their inbox.
 *
 * Who sees it: only supporters the server has already qualified — people who
 * donated to or verifiably shared this campaign, on an account at least a week
 * old. Everyone else gets `actor_role: 'viewer'` and this renders nothing,
 * which keeps it from becoming a nag button on every campaign.
 *
 * States: available · request pending (yours, cancellable) · request pending
 * (someone else's) · owner not payout-ready · hidden.
 */

import { useState } from 'react'
import styled from 'styled-components'
import { Handshake, Clock } from 'lucide-react'
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '@/styles/tokens'
import {
  useUpgradeEligibility,
  useRequestUpgradeForOther,
  useResolveUpgradeRequest,
} from '@/hooks/useCampaignUpgrade'
import { useUser } from '@/hooks/useUser'

const Card = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${SPACING[3]};
  padding: ${SPACING[4]};
  border: 1px solid ${COLORS.BORDER};
  border-radius: ${BORDER_RADIUS.LG};
  background: ${COLORS.SURFACE};
`

const Heading = styled.h3`
  display: flex;
  align-items: center;
  gap: ${SPACING[2]};
  margin: 0;
  font-size: 0.9375rem;
  font-weight: ${TYPOGRAPHY.WEIGHT_BOLD};
  color: ${COLORS.TEXT};
`

const Text = styled.p`
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: ${COLORS.MUTED_TEXT};
`

const Textarea = styled.textarea`
  min-height: 72px;
  padding: ${SPACING[2]} ${SPACING[3]};
  border: 1px solid ${COLORS.BORDER};
  border-radius: ${BORDER_RADIUS.MD};
  font-family: inherit;
  font-size: 0.9375rem;
  color: ${COLORS.TEXT};
  resize: vertical;

  &:focus-visible {
    outline: 2px solid ${COLORS.PRIMARY};
    outline-offset: 1px;
  }
`

const Button = styled.button<{ $variant?: 'primary' | 'ghost' }>`
  min-height: 44px;
  padding: ${SPACING[2]} ${SPACING[4]};
  border-radius: ${BORDER_RADIUS.FULL};
  font-weight: ${TYPOGRAPHY.WEIGHT_BOLD};
  font-size: 0.9375rem;
  cursor: pointer;
  border: ${({ $variant }) => ($variant === 'ghost' ? `1px solid ${COLORS.BORDER}` : 'none')};
  background: ${({ $variant }) =>
    $variant === 'ghost' ? COLORS.SURFACE : COLORS.PRIMARY};
  color: ${({ $variant }) => ($variant === 'ghost' ? COLORS.TEXT : COLORS.SURFACE)};

  &:hover:not(:disabled) {
    background: ${({ $variant }) =>
      $variant === 'ghost' ? COLORS.DISABLED : COLORS.PRIMARY_DARK};
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 2px solid ${COLORS.PRIMARY_DARK};
    outline-offset: 2px;
  }
`

const Row = styled.div`
  display: flex;
  gap: ${SPACING[2]};
  flex-wrap: wrap;
`

export interface SponsorUpgradeRequestProps {
  campaignId: string
}

export function SponsorUpgradeRequest({ campaignId }: SponsorUpgradeRequestProps) {
  const { user } = useUser()
  const { data, isLoading, isError } = useUpgradeEligibility(campaignId, !!user)
  const request = useRequestUpgradeForOther(campaignId)
  const { cancel } = useResolveUpgradeRequest()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')

  // Quiet by design: no skeleton, no error block. This is a secondary
  // affordance on someone else's campaign page and must never be noise.
  if (isLoading || isError || !data) return null

  // Owners use UpgradeToShareCard; unqualified viewers get nothing at all.
  if (data.actor_role !== 'sponsor') return null

  // Already a Share Campaign, or blocked for a reason a supporter can't fix.
  if (data.campaign.already_share_campaign) return null

  const pending = data.pending_upgrade
  const isMyRequest = pending && user && String(pending.initiated_by) === String(user.id)

  if (pending) {
    return (
      <Card aria-label="Upgrade request status">
        <Heading>
          <Clock size={16} aria-hidden="true" />
          {isMyRequest ? 'Your request is with the creator' : 'An upgrade request is pending'}
        </Heading>
        <Text>
          {isMyRequest
            ? "The creator has been notified. They'll decide whether to turn this into a Share Campaign."
            : 'Someone has already asked the creator to turn this into a Share Campaign.'}
        </Text>
        {isMyRequest && (
          <Row>
            <Button
              type="button"
              $variant="ghost"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate({ upgradeId: pending.id })}
            >
              {cancel.isPending ? 'Cancelling…' : 'Cancel my request'}
            </Button>
          </Row>
        )}
      </Card>
    )
  }

  // The one blocker worth surfacing to a supporter: the creator has no payout
  // method, so nobody could be paid even if they said yes. Stated plainly, and
  // without exposing anything about their payment details.
  const ownerNotReady = !data.payout_readiness.ready
  if (ownerNotReady) {
    return (
      <Card aria-label="Upgrade request unavailable">
        <Heading>
          <Handshake size={16} aria-hidden="true" /> Share rewards aren&apos;t set up here
        </Heading>
        <Text>
          This creator hasn&apos;t set up a way to pay share rewards yet, so this campaign
          can&apos;t become a Share Campaign right now.
        </Text>
      </Card>
    )
  }

  return (
    <Card aria-label="Ask the creator to add share rewards">
      <Heading>
        <Handshake size={16} aria-hidden="true" /> Help this campaign go further
      </Heading>
      <Text>
        You can ask the creator to turn this into a Share Campaign, so supporters earn a reward for
        sharing it. They decide the amounts — nothing changes unless they agree.
      </Text>

      {!open ? (
        <Row>
          <Button type="button" onClick={() => setOpen(true)}>
            Ask the creator
          </Button>
        </Row>
      ) : (
        <>
          <Textarea
            placeholder="Add a short note for the creator (optional)"
            maxLength={500}
            value={reason}
            disabled={request.isPending}
            onChange={(e) => setReason(e.target.value)}
            aria-label="Note for the creator"
          />
          <Row>
            <Button
              type="button"
              disabled={request.isPending}
              onClick={() =>
                request.mutate(
                  { reason: reason.trim() || undefined },
                  {
                    onSuccess: () => {
                      setOpen(false)
                      setReason('')
                    },
                  }
                )
              }
            >
              {request.isPending ? 'Sending…' : 'Send request'}
            </Button>
            <Button
              type="button"
              $variant="ghost"
              disabled={request.isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </Row>
        </>
      )}
    </Card>
  )
}

export default SponsorUpgradeRequest
