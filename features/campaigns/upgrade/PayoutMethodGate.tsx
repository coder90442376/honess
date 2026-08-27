'use client'

/**
 * Payout method gate.
 *
 * The blocked state a creator sees when they try to turn their campaign into a
 * Share Campaign without a usable payout method.
 *
 * The copy matters here as much as the code. A Share Campaign is a promise to
 * pay sharers directly, so this is not bureaucratic friction — explaining WHY
 * we need the method is what stops the gate reading as an arbitrary blocker.
 *
 * The "Add a payout method" action carries a `returnTo` so the user lands back
 * in the upgrade flow afterwards, and the caller re-fetches eligibility on
 * mount rather than trusting anything cached across that navigation.
 */

import Link from 'next/link'
import styled from 'styled-components'
import { AlertTriangle, ArrowRight, Clock } from 'lucide-react'
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '@/styles/tokens'
import type { PayoutReadinessLevel, PayoutMethodSummary } from '@/services/campaignUpgradeService'

/**
 * Where a creator adds a payout method.
 *
 * `/settings` IS the payout-method screen — the whole page is devoted to
 * payment methods. There is no `/settings/payment-methods` route, and linking
 * to one sends creators to a 404 at exactly the moment they were trying to
 * unblock themselves.
 */
export const PAYOUT_METHOD_SETTINGS_PATH = '/settings'

const Panel = styled.div<{ $tone: 'warning' | 'info' }>`
  display: flex;
  gap: ${SPACING[3]};
  padding: ${SPACING[4]};
  border-radius: ${BORDER_RADIUS.LG};
  border: 1px solid
    ${({ $tone }) => ($tone === 'warning' ? COLORS.WARNING_LIGHT : COLORS.INFO_LIGHT)};
  background: ${({ $tone }) => ($tone === 'warning' ? COLORS.WARNING_BG : COLORS.INFO_BG)};

  svg {
    flex-shrink: 0;
    margin-top: 2px;
    color: ${({ $tone }) => ($tone === 'warning' ? COLORS.WARNING_DARK : COLORS.INFO_DARK)};
  }
`

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING[2]};
`

const Title = styled.p`
  margin: 0;
  font-weight: ${TYPOGRAPHY.WEIGHT_BOLD};
  color: ${COLORS.TEXT};
`

const Text = styled.p`
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: ${COLORS.MUTED_TEXT};
`

const Action = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${SPACING[2]};
  align-self: flex-start;
  min-height: 44px;
  padding: ${SPACING[2]} ${SPACING[4]};
  border-radius: ${BORDER_RADIUS.FULL};
  background: ${COLORS.PRIMARY};
  color: ${COLORS.SURFACE};
  font-weight: ${TYPOGRAPHY.WEIGHT_BOLD};
  font-size: 0.9375rem;
  text-decoration: none;

  &:hover {
    background: ${COLORS.PRIMARY_DARK};
  }

  &:focus-visible {
    outline: 2px solid ${COLORS.PRIMARY_DARK};
    outline-offset: 2px;
  }
`

export interface PayoutMethodGateProps {
  level: PayoutReadinessLevel
  method?: PayoutMethodSummary | null
  /** Where to send the user back to once they've saved a method. */
  returnTo: string
  /** Shown instead of the default copy when the server supplied a reason. */
  message?: string | null
  /** The blocker is the campaign owner's method, not the viewer's. */
  isOwnerBlocked?: boolean
}

export function PayoutMethodGate({
  level,
  method,
  returnTo,
  message,
  isOwnerBlocked,
}: PayoutMethodGateProps) {
  // Provisional is a WARNING, not a blocker: the live payout path accepts a
  // method that is still verifying, so blocking here would leave a user unable
  // to upgrade while being perfectly payable.
  if (level === 'provisional') {
    return (
      <Panel $tone="info" role="status">
        <Clock size={20} aria-hidden="true" />
        <Body>
          <Title>Your payout method is still being verified</Title>
          <Text>
            You can go ahead and upgrade now
            {method?.last_four ? ` using your account ending ${method.last_four}` : ''}. We&apos;ll
            let you know if anything needs your attention.
          </Text>
        </Body>
      </Panel>
    )
  }

  if (isOwnerBlocked) {
    return (
      <Panel $tone="warning" role="alert">
        <AlertTriangle size={20} aria-hidden="true" />
        <Body>
          <Title>This campaign isn&apos;t ready for Share-to-Earn yet</Title>
          <Text>
            {message ||
              'The campaign owner needs to add a payout method before supporters can earn rewards for sharing.'}
          </Text>
        </Body>
      </Panel>
    )
  }

  return (
    <Panel $tone="warning" role="alert">
      <AlertTriangle size={20} aria-hidden="true" />
      <Body>
        <Title>Add a payout method first</Title>
        <Text>
          {message ||
            'Share Campaigns reward the people who share your story — and you pay those rewards directly. We need to know where your money moves before you can promise anyone a reward.'}
        </Text>
        <Action href={`${PAYOUT_METHOD_SETTINGS_PATH}?returnTo=${encodeURIComponent(returnTo)}`}>
          Add a payout method
          <ArrowRight size={16} aria-hidden="true" />
        </Action>
      </Body>
    </Panel>
  )
}

export default PayoutMethodGate
