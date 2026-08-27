'use client'

import Link from 'next/link'
import Image from 'next/image'
import styled, { keyframes, css } from 'styled-components'
import {
  TrendingUp,
  Share2,
  Heart,
  MapPin,
  Map,
  Globe,
  Zap,
  Users,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Campaign } from '@/api/services/campaignService'
import BoostButton from '@/features/campaigns/boost/BoostButton'
import type { BoostSource } from '@/services/campaignBoostService'
import { normalizeImageUrl } from '@/utils/imageUtils'
import { tk } from '@/styles/dashboardTokens'
import { MiracleModeBadge } from '@/components/campaign/MiracleModeBadge'

interface CampaignCardProps {
  campaign: Campaign
  onDonate?: (campaignId: string) => void
  onShare?: (campaignId: string) => void
  /**
   * Show the community Boost control alongside "View Details".
   *
   * Off by default: this card is reused in places (the creator's own dashboard,
   * related-campaign strips) where a boost affordance is either meaningless or
   * actively wrong. Browse and Discover opt in.
   */
  showBoost?: boolean
  boostSource?: BoostSource
}

// ─── Animations ──────────────────────────────────────────────────────────────
const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`

// ─── Card Shell ───────────────────────────────────────────────────────────────
// Keep the image above the campaign details at every viewport size.
const Card = styled.article`
  background: ${tk.white};
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid ${tk.border};
  font-family: 'DM Sans', sans-serif;
  transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
  animation: ${fadeUp} 350ms ease both;
  display: flex;
  flex-direction: column;
  min-height: 330px;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(26, 95, 168, 0.12);
    border-color: ${tk.blue};
  }
`

// ─── Image ─────────────────────────────────────────────────────────────────────
const ImageWrap = styled.div`
  position: relative;
  width: 100%;
  height: 150px;
  background: linear-gradient(135deg, ${tk.amberLight} 0%, ${tk.canvasDeep} 100%);
  overflow: hidden;
  flex-shrink: 0;

  img {
    transition: transform 400ms ease;
  }

  ${Card}:hover & img {
    transform: scale(1.04);
  }
`

const ImagePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, ${tk.amberLight} 0%, ${tk.canvasDeep} 50%, ${tk.blueLight} 100%);

  svg {
    width: 40px;
    height: 40px;
    color: ${tk.amberMid};
  }
`

// ─── Badge cluster ──────────────────────────────────────────────────────────────
const BadgeRow = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`

const Badge = styled.span<{
  $variant?: 'scope' | 'trending' | 'done' | 'earn' | 'boost'
  $scope?: string
  $tier?: string
}>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.3px;
  backdrop-filter: blur(8px);
  line-height: 1.6;

  ${({ $variant, $scope, $tier }) => {
    if ($variant === 'earn') return css`
      background: rgba(255, 255, 255, 0.92);
      color: #0369a1;
      border: 1px solid rgba(14, 165, 233, 0.35);
    `
    if ($variant === 'trending') return css`
      background: rgba(255, 255, 255, 0.92);
      color: #b45309;
      border: 1px solid rgba(251, 191, 36, 0.5);
    `
    if ($variant === 'done') return css`
      background: rgba(255, 255, 255, 0.92);
      color: #15803d;
      border: 1px solid rgba(34, 197, 94, 0.4);
    `
    if ($variant === 'boost') {
      const tierStyles: Record<string, string> = {
        free: 'background: rgba(219,234,254,0.95); color: #1e40af; border: 1px solid rgba(96,165,250,0.4);',
        pro: 'background: rgba(233,213,255,0.95); color: #6b21a8; border: 1px solid rgba(192,132,252,0.4);',
      }
      return css`${tierStyles[$tier || 'pro'] || tierStyles.pro}`
    }
    if ($variant === 'scope') {
      const scopeMap: Record<string, string> = {
        local: 'background:rgba(219,234,254,0.92);color:#1e40af;border:1px solid rgba(96,165,250,0.4);',
        regional: 'background:rgba(220,252,231,0.92);color:#14532d;border:1px solid rgba(74,222,128,0.4);',
        national: 'background:rgba(243,232,255,0.92);color:#6b21a8;border:1px solid rgba(192,132,252,0.4);',
        global: 'background:rgba(255,237,213,0.92);color:#9a3412;border:1px solid rgba(251,146,60,0.4);',
      }
      return css`${scopeMap[$scope || ''] || 'background:rgba(243,244,246,0.92);color:#374151;border:1px solid rgba(156,163,175,0.4);'}`
    }
    return ''
  }}
`

// ─── Body ──────────────────────────────────────────────────────────────────────
const Body = styled.div`
  padding: 14px 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 0;
`

const TitleRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const Title = styled.h3`
  font-family: 'Syne', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: ${tk.heading};
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
  letter-spacing: -0.2px;
  transition: color 200ms;

  a:hover & {
    color: ${tk.blue};
  }
`

const CreatorName = styled.p`
  font-size: 0.75rem;
  color: ${tk.muted};
  margin: 0;
  font-weight: 400;

  span {
    color: ${tk.blue};
    transition: color 180ms;
  }

  a:hover span {
    color: ${tk.amber};
  }
`

// ─── Progress ──────────────────────────────────────────────────────────────────
const GoalAmount = styled.span`
  font-family: 'DM Mono', monospace;
  font-size: 0.72rem;
  color: ${tk.muted};
  font-weight: 400;
`

const ProgressTrack = styled.div`
  height: 5px;
  background: ${tk.canvasDeep};
  border-radius: 999px;
  overflow: hidden;
`

// ─── Multi-meter (all meters visible) ───────────────────────────────────────────
const MeterStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 9px;
`

const MeterRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const MeterTopLine = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
`

const MeterLabel = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.68rem;
  font-weight: 600;
  color: ${tk.muted};

  svg { color: ${p => p.$color}; flex-shrink: 0; }
`

const MeterValue = styled.span`
  font-family: 'Syne', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  color: ${tk.heading};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const MeterRight = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-shrink: 0;
`

const MeterPct = styled.span<{ $color: string }>`
  font-family: 'DM Mono', monospace;
  font-size: 0.68rem;
  font-weight: 500;
  color: ${p => p.$color};
`

const MeterFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${p => Math.min(p.$pct, 100)}%;
  background: ${p => p.$color};
  border-radius: 999px;
  transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1);
`

// ─── Stats ─────────────────────────────────────────────────────────────────────
const StatsRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`

const Stat = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  color: ${tk.muted};
  font-weight: 400;

  svg {
    color: ${tk.amberMid};
    flex-shrink: 0;
  }

  strong {
    font-family: 'DM Mono', monospace;
    color: ${tk.heading};
    font-weight: 500;
  }
`

// ─── Actions ───────────────────────────────────────────────────────────────────
const Actions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: auto;
`

const ViewDetailsBtn = styled(Link)`
  flex: 1;
  height: 40px;
  border-radius: 10px;
  border: none;
  background: ${tk.ink};
  color: ${tk.white};
  font-family: 'Syne', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  letter-spacing: 0.2px;
  transition: background 180ms, transform 120ms;

  &:hover { background: ${tk.inkLight}; transform: scale(1.01); }
  &:active { transform: scale(0.98); }
  svg { transition: transform 180ms; }
  &:hover svg { transform: translateX(2px); }
`

// ─── Helpers ───────────────────────────────────────────────────────────────────
const scopeIcon = (scope?: string) => {
  const map: Record<string, JSX.Element> = {
    local: <MapPin size={10} />,
    regional: <Map size={10} />,
    national: <Globe size={10} />,
    global: <Zap size={10} />,
  }
  return scope ? map[scope] : null
}

const fmt = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

// ─── Component ─────────────────────────────────────────────────────────────────
export function CampaignCard({ campaign, showBoost, boostSource = 'discover' }: CampaignCardProps) {
  // SR-1/SR-2: the dollar meter uses the FUNDRAISING goal only (never goals[0],
  // which could be a sharing_reach share-count). Reach is a separate shares meter.
  const goals = (campaign.goals ?? []) as Array<{
    goal_type: string
    goal_name?: string
    target_amount: number
    current_amount: number
  }>
  const fundGoal = goals.find((g) => g.goal_type === 'fundraising')
  const goalAmount = (campaign as any).goal_amount ?? fundGoal?.target_amount ?? 0
  const raised =
    fundGoal?.current_amount ??
    (campaign as any).raised_amount ??
    campaign.total_donation_amount ??
    0

  const reach = (campaign as any).reach_goal as
    | { target_shares: number; current_shares: number }
    | null
    | undefined
  const reachGoalEntry = goals.find((g) => g.goal_type === 'sharing_reach')
  const reachTarget = reachGoalEntry?.target_amount ?? reach?.target_shares ?? 0
  const reachCurrent =
    reachGoalEntry?.current_amount ?? reach?.current_shares ?? campaign.share_count ?? 0

  const resourceGoal = goals.find((g) => g.goal_type === 'resource_collection')

  // Build the full list of meters this campaign tracks (CA-meters: all visible).
  const fmtCount = (n: number) => (n || 0).toLocaleString()
  const meters: Array<{
    key: string
    label: string
    icon: JSX.Element
    color: string
    currentDisplay: string
    goalDisplay: string
    pct: number
  }> = []

  if (goalAmount > 0) {
    const pct = Math.min((raised / goalAmount) * 100, 100)
    meters.push({
      key: 'money',
      label: 'Raised',
      icon: <Heart size={11} />,
      color: pct >= 100 ? tk.green : tk.amber,
      currentDisplay: fmt(raised),
      goalDisplay: fmt(goalAmount),
      pct,
    })
  }
  if (reachTarget > 0) {
    const pct = Math.min((reachCurrent / reachTarget) * 100, 100)
    meters.push({
      key: 'reach',
      label: 'Shares',
      icon: <Share2 size={11} />,
      color: '#0ea5e9',
      currentDisplay: fmtCount(reachCurrent),
      goalDisplay: fmtCount(reachTarget),
      pct,
    })
  }
  if (resourceGoal && resourceGoal.target_amount > 0) {
    const pct = Math.min((resourceGoal.current_amount / resourceGoal.target_amount) * 100, 100)
    meters.push({
      key: 'resource',
      label: resourceGoal.goal_name || 'Helping hands',
      icon: <Users size={11} />,
      color: tk.green,
      currentDisplay: fmtCount(resourceGoal.current_amount),
      goalDisplay: fmtCount(resourceGoal.target_amount),
      pct,
    })
  }
  // Fallback: always show at least the money meter so the card never looks empty.
  if (meters.length === 0) {
    meters.push({
      key: 'money',
      label: 'Raised',
      icon: <Heart size={11} />,
      color: tk.amber,
      currentDisplay: fmt(raised),
      goalDisplay: fmt(goalAmount),
      pct: 0,
    })
  }

  const isSharing = campaign.campaign_type === 'sharing'
  const tierLabel = (campaign.current_boost_tier ?? 'pro')
  const tierEmoji: Record<string, string> = { free: '⚡', pro: '🚀' }

  return (
    <Card>
      {/* ── Image ── */}
      <ImageWrap>
        {campaign.image_url || campaign.image?.url ? (
          <Image
            src={normalizeImageUrl(campaign.image_url || campaign.image?.url) || '/placeholder-campaign.png'}
            alt={campaign.image?.alt || campaign.title}
            fill
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <ImagePlaceholder>
            <Sparkles />
          </ImagePlaceholder>
        )}

        <BadgeRow>
          {campaign.is_boosted && (
            <Badge $variant="boost" $tier={tierLabel}>
              {tierEmoji[tierLabel]} {tierLabel.charAt(0).toUpperCase() + tierLabel.slice(1)}
            </Badge>
          )}
          <MiracleModeBadge miracleMode={(campaign as any).miracle_mode} size="sm" />
          {isSharing && <Badge $variant="earn">💰 Share to Earn</Badge>}
          {campaign.geographicScope && (
            <Badge $variant="scope" $scope={campaign.geographicScope}>
              {scopeIcon(campaign.geographicScope)}
              {campaign.geographicScope.charAt(0).toUpperCase() + campaign.geographicScope.slice(1)}
            </Badge>
          )}
          {campaign.trending && (
            <Badge $variant="trending"><TrendingUp size={10} /> Trending</Badge>
          )}
          {campaign.status === 'completed' && (
            <Badge $variant="done">✓ Completed</Badge>
          )}
        </BadgeRow>
      </ImageWrap>

      {/* ── Body ── */}
      <Body>
        {/* Title */}
        <TitleRow>
          <Link href={`/campaigns/${campaign.id}`} style={{ textDecoration: 'none' }}>
            <Title>{campaign.title}</Title>
          </Link>
        </TitleRow>

        {/* Progress — every meter the campaign tracks (money, shares, helping hands) */}
        <MeterStack>
          {meters.map((m) => (
            <MeterRow key={m.key}>
              <MeterTopLine>
                <MeterValue>
                  {m.currentDisplay}
                  {' '}
                  <MeterLabel as="span" $color={m.color}>{m.icon}{m.label}</MeterLabel>
                </MeterValue>
                <MeterRight>
                  <GoalAmount>of {m.goalDisplay}</GoalAmount>
                  <MeterPct $color={m.color}>{m.pct.toFixed(0)}%</MeterPct>
                </MeterRight>
              </MeterTopLine>
              <ProgressTrack>
                <MeterFill $pct={m.pct} $color={m.color} />
              </ProgressTrack>
            </MeterRow>
          ))}
        </MeterStack>

        {/* Stats */}
        <StatsRow>
          {isSharing ? (
            <Stat>
              <Share2 size={13} />
              <strong>{(campaign.share_count ?? 0).toLocaleString()}</strong> shares
            </Stat>
          ) : (
            <Stat>
              <Heart size={13} />
              <strong>{(campaign.total_donation_amount ?? 0) > 0
                ? fmt(campaign.total_donation_amount!)
                : '$0'}
              </strong>
            </Stat>
          )}
          <Stat>
            <Users size={13} />
            <strong>{(campaign.total_donors ?? 0).toLocaleString()}</strong> supporters
          </Stat>
        </StatsRow>

        {/* Action */}
        <Actions>
          <ViewDetailsBtn href={`/campaigns/${campaign.id}`}>
            View Details <ArrowRight size={15} />
          </ViewDetailsBtn>
          {/* Renders nothing on your own campaign, or when signed out. */}
          {showBoost && campaign.id && (
            <BoostButton campaignId={String(campaign.id)} source={boostSource} hideCount />
          )}
        </Actions>
      </Body>
    </Card>
  )
}
