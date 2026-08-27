'use client'

import styled from 'styled-components'
import { COLORS, SPACING, TYPOGRAPHY } from '@/styles/tokens'
import UpgradeRequestInbox from '@/features/campaigns/upgrade/UpgradeRequestInbox'

/**
 * Upgrade Requests — owner inbox.
 *
 * Supporters can ask to turn one of your campaigns into a Share Campaign, but
 * they cannot make that change themselves: the upgrade obliges YOU to pay
 * sharers directly, so it always waits for your approval here.
 */

const Page = styled.main`
  max-width: 760px;
  margin: 0 auto;
  padding: ${SPACING[6]} ${SPACING[4]} ${SPACING[10]};
`

const Heading = styled.h1`
  margin: 0 0 ${SPACING[2]};
  font-size: 1.5rem;
  font-weight: ${TYPOGRAPHY.WEIGHT_BOLD};
  color: ${COLORS.TEXT};
`

const Sub = styled.p`
  margin: 0 0 ${SPACING[6]};
  font-size: 0.9375rem;
  line-height: 1.5;
  color: ${COLORS.MUTED_TEXT};
`

export default function UpgradeRequestsPage() {
  return (
    <Page>
      <Heading>Upgrade requests</Heading>
      <Sub>
        Supporters who have backed or shared your campaigns can ask you to turn them into Share
        Campaigns. Nothing changes until you approve it.
      </Sub>
      <UpgradeRequestInbox />
    </Page>
  )
}
