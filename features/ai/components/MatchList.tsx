'use client'

import React from 'react'
import styled from 'styled-components'
import Link from 'next/link'
import { ArrowUpRight, Image as ImageIcon } from 'lucide-react'
import { useCampaign } from '@/api/hooks/useCampaigns'
import BoostButton from '@/features/campaigns/boost/BoostButton'
import type { RecommendationItem } from '@/types/ai'
import { Chip } from './shared'

/**
 * Shared renderer for AI recommendation / matchmaking result lists
 * (AI-06, AI-09, AI-12). Each row links to its target campaign and shows the
 * match score + the model's one-line rationale. The campaign title/thumbnail
 * are enriched on the client via useCampaign (React-Query cached & deduped, so
 * already-browsed campaigns resolve instantly).
 */

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const Item = styled(Link)`
  /* Takes the remaining width so the boost control sits flush right. */
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.15s ease;
  background: #fff;

  &:hover {
    border-color: #7c3aed;
    background: #faf5ff;
  }
`

const ScoreBadge = styled.div<{ $score: number }>`
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 800;
  flex-shrink: 0;
  color: #fff;
  background: ${(p) =>
    p.$score >= 70
      ? 'linear-gradient(135deg,#7c3aed,#a855f7)'
      : p.$score >= 45
        ? 'linear-gradient(135deg,#d97706,#f59e0b)'
        : 'linear-gradient(135deg,#9ca3af,#cbd5e1)'};
`

const Thumb = styled.div<{ $src?: string }>`
  width: 52px;
  height: 52px;
  border-radius: 10px;
  flex-shrink: 0;
  background:
    ${(p) => (p.$src ? `center / cover no-repeat url(${p.$src})` : '#f3f4f6')};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
`

const Body = styled.div`
  flex: 1;
  min-width: 0;
`

const Title = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Reason = styled.div`
  font-size: 13px;
  color: #6b7280;
  line-height: 1.45;
  margin-top: 2px;
`

const RowWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const BoostAction = styled.div`
  flex-shrink: 0;
`

const TitleSkeleton = styled.div`
  height: 15px;
  width: 55%;
  border-radius: 6px;
  background: #f3f4f6;
`

function MatchRow({
  item,
  refLabel,
  showBoost,
}: {
  item: RecommendationItem
  refLabel: string
  showBoost?: boolean
}) {
  const { data: campaign, isLoading } = useCampaign(item.ref_id)
  const title = campaign?.title
  const image = campaign?.image_url

  return (
    <RowWrap>
    <Item href={`/campaigns/${item.ref_id}`}>
      <ScoreBadge $score={item.score}>{Math.round(item.score)}</ScoreBadge>
      <Thumb $src={image || undefined}>{!image && <ImageIcon size={18} />}</Thumb>
      <Body>
        {isLoading && !title ? (
          <TitleSkeleton />
        ) : (
          <Title>{title || `Campaign ${item.ref_id}`}</Title>
        )}
        <Reason>{item.reason}</Reason>
        <div style={{ marginTop: 4 }}>
          <Chip $tone="purple">{campaign?.need_type?.replace(/_/g, ' ') || refLabel}</Chip>
        </div>
      </Body>
      <ArrowUpRight size={18} color="#9ca3af" />
    </Item>
    {/* Deliberately OUTSIDE the row's Link: a <button> nested in an <a> is
        invalid markup, and clicking Boost would navigate away instead of
        boosting. */}
    {showBoost && (
      <BoostAction>
        <BoostButton campaignId={item.ref_id} source="discover" hideCount />
      </BoostAction>
    )}
    </RowWrap>
  )
}

export function MatchList({
  items,
  refLabel = 'campaign',
}: {
  items: RecommendationItem[]
  refLabel?: string
}) {
  return (
    <List>
      {items.map((item) => (
        <MatchRow
          key={item.ref_id}
          item={item}
          refLabel={refLabel}
          // Cause matches point at categories, not boostable campaigns.
          showBoost={refLabel === 'campaign'}
        />
      ))}
    </List>
  )
}
