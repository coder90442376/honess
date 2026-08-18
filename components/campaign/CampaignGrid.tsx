'use client'

import styled, { keyframes } from 'styled-components'
import { CampaignCard } from './CampaignCard'
import { Campaign } from '@/api/services/campaignService'
import { SearchX } from 'lucide-react'
import { tk } from '@/styles/dashboardTokens'

interface CampaignGridProps {
  campaigns: Campaign[]
  isLoading?: boolean
  onDonate?: (campaignId: string) => void
  onShare?: (campaignId: string) => void
}

// ─── Grid ──────────────────────────────────────────────────────────────────────
const Grid = styled.div`
  display: grid;
  /* 2 columns on mobile (stacked/vertical cards) */
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  @media (min-width: 640px) {
    gap: 16px;
  }

  /* 2 columns of stacked cards on desktop */
  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }

  /* 3 columns on very large screens */
  @media (min-width: 1600px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

// Grid items default to min-width:auto, which lets non-wrapping card content
// (e.g. the monospace meter line) force a track wider than the viewport and
// cause horizontal overflow on mobile. min-width:0 lets the track shrink.
const GridItem = styled.div`
  min-width: 0;
`

// ─── Skeleton ──────────────────────────────────────────────────────────────────
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
`

const shimmer = keyframes`
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
`

const SkeletonCard = styled.div`
  background: ${tk.white};
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid ${tk.border};
  display: flex;
  flex-direction: column;
  height: 330px;
`

const SkeletonImage = styled.div`
  width: 100%;
  height: 150px;
  flex-shrink: 0;
  background: linear-gradient(90deg, ${tk.canvasDeep} 25%, ${tk.border} 50%, ${tk.canvasDeep} 75%);
  background-size: 400px 100%;
  animation: ${shimmer} 1.4s ease infinite;
`

const SkeletonBody = styled.div`
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 0;
`

const SkeletonLine = styled.div<{ $w?: string; $h?: string }>`
  height: ${p => p.$h ?? '12px'};
  width: ${p => p.$w ?? '100%'};
  border-radius: 6px;
  background: linear-gradient(90deg, ${tk.canvasDeep} 25%, ${tk.border} 50%, ${tk.canvasDeep} 75%);
  background-size: 400px 100%;
  animation: ${shimmer} 1.4s ease infinite;
`

const SkeletonProgress = styled.div`
  height: 5px;
  border-radius: 999px;
  background: linear-gradient(90deg, ${tk.canvasDeep} 25%, ${tk.border} 50%, ${tk.canvasDeep} 75%);
  background-size: 400px 100%;
  animation: ${shimmer} 1.4s ease infinite;
`

const SkeletonBtnRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 4px;
`

const SkeletonBtn = styled.div`
  flex: 1;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(90deg, ${tk.canvasDeep} 25%, ${tk.border} 50%, ${tk.canvasDeep} 75%);
  background-size: 400px 100%;
  animation: ${shimmer} 1.4s ease infinite;
`

const SkeletonBtnSmall = styled(SkeletonBtn)`
  flex: none;
  width: 36px;
`

// ─── Empty State ───────────────────────────────────────────────────────────────
const EmptyWrap = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
  gap: 12px;
`

const EmptyIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: ${tk.amberLight};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${tk.amber};
  margin-bottom: 4px;
`

const EmptyTitle = styled.h3`
  font-family: 'Syne', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: ${tk.heading};
  margin: 0;
`

const EmptyDesc = styled.p`
  font-size: 0.85rem;
  color: ${tk.muted};
  margin: 0;
  max-width: 280px;
  line-height: 1.5;
`

const ResetBtn = styled.button`
  margin-top: 8px;
  padding: 8px 20px;
  border-radius: 10px;
  border: none;
  background: ${tk.ink};
  color: ${tk.white};
  font-family: 'Syne', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 180ms;

  &:hover { background: ${tk.inkLight}; }
`

// ─── Skeleton rendering helper ─────────────────────────────────────────────────
function SkeletonItem() {
  return (
    <SkeletonCard>
      <SkeletonImage />
      <SkeletonBody>
        <SkeletonLine $w="80%" $h="14px" />
        <SkeletonLine $w="55%" $h="11px" />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
          <SkeletonLine $w="45%" $h="11px" />
          <SkeletonLine $w="20%" $h="11px" />
        </div>
        <SkeletonProgress />
        <SkeletonBtnRow>
          <SkeletonBtn />
          <SkeletonBtnSmall />
        </SkeletonBtnRow>
      </SkeletonBody>
    </SkeletonCard>
  )
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function CampaignGrid({ campaigns, isLoading, onDonate, onShare }: CampaignGridProps) {
  if (isLoading) {
    return (
      <Grid>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonItem key={i} />
        ))}
      </Grid>
    )
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <Grid>
        <EmptyWrap>
          <EmptyIcon><SearchX size={26} /></EmptyIcon>
          <EmptyTitle>No campaigns found</EmptyTitle>
          <EmptyDesc>Try adjusting your search or filters to discover more campaigns</EmptyDesc>
          <ResetBtn onClick={() => window.location.reload()}>Reset & try again</ResetBtn>
        </EmptyWrap>
      </Grid>
    )
  }

  return (
    <Grid>
      {campaigns.map((campaign, i) => (
        <GridItem key={campaign.id} style={{ animationDelay: `${i * 40}ms` }}>
          <CampaignCard
            campaign={campaign}
            onDonate={onDonate}
            onShare={onShare}
          />
        </GridItem>
      ))}
    </Grid>
  )
}
