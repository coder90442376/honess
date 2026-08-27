'use client'

/**
 * Upgrade request inbox (owner view).
 *
 * When a supporter asks to turn one of your campaigns into a Share Campaign,
 * the request lands here. Approving is not a rubber stamp: the owner has to
 * set the reward amounts and personally accept that they pay sharers directly,
 * because it is the owner who ends up owing that money — nobody can consent to
 * that on their behalf.
 */

import { useState } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { Handshake, Inbox } from 'lucide-react'
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '@/styles/tokens'
import { useMyUpgradeRequests, useResolveUpgradeRequest } from '@/hooks/useCampaignUpgrade'
import type { UpgradeRequestRecord } from '@/services/campaignUpgradeService'

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${SPACING[4]};
`

const Item = styled.li`
  display: flex;
  flex-direction: column;
  gap: ${SPACING[3]};
  padding: ${SPACING[5]};
  border: 1px solid ${COLORS.BORDER};
  border-radius: ${BORDER_RADIUS.LG};
  background: ${COLORS.SURFACE};
`

const Title = styled.h3`
  display: flex;
  align-items: center;
  gap: ${SPACING[2]};
  margin: 0;
  font-size: 1rem;
  font-weight: ${TYPOGRAPHY.WEIGHT_BOLD};
  color: ${COLORS.TEXT};
`

const Text = styled.p`
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: ${COLORS.MUTED_TEXT};
`

const Row = styled.div`
  display: flex;
  gap: ${SPACING[3]};
  flex-wrap: wrap;
`

const FieldRow = styled.div`
  display: flex;
  gap: ${SPACING[3]};
  flex-wrap: wrap;
`

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${SPACING[1]};
  font-size: 0.8125rem;
  font-weight: ${TYPOGRAPHY.WEIGHT_BOLD};
  color: ${COLORS.TEXT};

  input {
    min-height: 44px;
    min-width: 160px;
    padding: ${SPACING[2]} ${SPACING[3]};
    border: 1px solid ${COLORS.BORDER};
    border-radius: ${BORDER_RADIUS.MD};
    font-size: 1rem;
    font-weight: ${TYPOGRAPHY.WEIGHT_NORMAL};
  }
`

const Consent = styled.label`
  display: flex;
  gap: ${SPACING[3]};
  align-items: flex-start;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: ${COLORS.TEXT};
  cursor: pointer;

  input {
    width: 20px;
    height: 20px;
    margin-top: 2px;
    flex-shrink: 0;
  }
`

const Primary = styled.button`
  min-height: 44px;
  padding: ${SPACING[2]} ${SPACING[5]};
  border: none;
  border-radius: ${BORDER_RADIUS.FULL};
  background: ${COLORS.PRIMARY};
  color: ${COLORS.SURFACE};
  font-weight: ${TYPOGRAPHY.WEIGHT_BOLD};
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 2px solid ${COLORS.PRIMARY_DARK};
    outline-offset: 2px;
  }
`

const Secondary = styled.button`
  min-height: 44px;
  padding: ${SPACING[2]} ${SPACING[5]};
  border: 1px solid ${COLORS.BORDER};
  border-radius: ${BORDER_RADIUS.FULL};
  background: ${COLORS.SURFACE};
  color: ${COLORS.TEXT};
  font-weight: ${TYPOGRAPHY.WEIGHT_MEDIUM};
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${COLORS.PRIMARY};
    outline-offset: 2px;
  }
`

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${SPACING[2]};
  padding: ${SPACING[8]} ${SPACING[4]};
  text-align: center;
  color: ${COLORS.MUTED_TEXT};
`

function RequestCard({ request }: { request: UpgradeRequestRecord }) {
  const { approve, reject } = useResolveUpgradeRequest()
  const [budget, setBudget] = useState('')
  const [reward, setReward] = useState('')
  const [consent, setConsent] = useState(false)

  const budgetValue = Number(budget)
  const rewardValue = Number(reward)
  const amountsValid =
    Number.isFinite(budgetValue) &&
    Number.isFinite(rewardValue) &&
    budgetValue > 0 &&
    rewardValue > 0 &&
    budgetValue >= rewardValue

  const busy = approve.isPending || reject.isPending

  return (
    <Item>
      <Title>
        <Handshake size={18} aria-hidden="true" />
        A supporter wants to boost {request.campaign_title || 'your campaign'}
      </Title>

      <Text>
        They&apos;ve asked to turn this into a Share Campaign, so supporters can earn a reward for
        sharing it. You decide the reward amounts, and you pay those rewards directly.
      </Text>

      {request.reason && <Text>&ldquo;{request.reason}&rdquo;</Text>}

      <FieldRow>
        <Field>
          Reward per share (USD)
          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={reward}
            disabled={busy}
            onChange={(e) => setReward(e.target.value)}
          />
        </Field>
        <Field>
          Total reward budget (USD)
          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={budget}
            disabled={busy}
            onChange={(e) => setBudget(e.target.value)}
          />
        </Field>
      </FieldRow>

      <Consent>
        <input
          type="checkbox"
          checked={consent}
          disabled={busy}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          I understand that I pay these rewards directly to sharers, and that HonestNeed only keeps
          track of who has earned and who has been paid.
        </span>
      </Consent>

      <Row>
        <Primary
          type="button"
          disabled={!amountsValid || !consent || busy}
          onClick={() =>
            approve.mutate({
              upgradeId: request._id,
              budget: budgetValue,
              reward_per_share: rewardValue,
              payout_consent: consent,
            })
          }
        >
          {approve.isPending ? 'Approving…' : 'Approve & upgrade'}
        </Primary>
        <Secondary
          type="button"
          disabled={busy}
          onClick={() => reject.mutate({ upgradeId: request._id })}
        >
          {reject.isPending ? 'Declining…' : 'Decline'}
        </Secondary>
        {request.campaign_ref && (
          <Secondary as={Link} href={`/campaigns/${request.campaign_ref}`}>
            View campaign
          </Secondary>
        )}
      </Row>
    </Item>
  )
}

export function UpgradeRequestInbox() {
  const { data, isLoading, isError } = useMyUpgradeRequests()

  if (isLoading) return <Text>Loading requests…</Text>

  if (isError) {
    return <Text role="alert">We couldn&apos;t load your requests. Please refresh to try again.</Text>
  }

  const items = data?.items ?? []

  if (items.length === 0) {
    return (
      <Empty>
        <Inbox size={32} aria-hidden="true" />
        <Text>No upgrade requests right now.</Text>
        <Text>
          When a supporter asks to turn one of your campaigns into a Share Campaign, it&apos;ll
          show up here.
        </Text>
      </Empty>
    )
  }

  return (
    <List>
      {items.map((request) => (
        <RequestCard key={request._id} request={request} />
      ))}
    </List>
  )
}

export default UpgradeRequestInbox
