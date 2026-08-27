'use client'

import styled, { keyframes, createGlobalStyle } from 'styled-components'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Share2,
  Hand,
  Flag,
  Calendar,
  Users,
  TrendingUp,
  RefreshCw,
  Copy,
  Check,
  Briefcase,
  Heart,
  ChevronDown,
  Mail,
  Link2,
  ArrowUpRight,
  Sparkles,
  Clock,
  Tag,
  BookOpen,
  Gift,
  Zap,
  MessageSquare,
  Music2,
  MessageCircle,
} from 'lucide-react'

// lucide-react no longer ships brand icons — inline Instagram glyph.
function InstagramGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.25" fill="currentColor" />
    </svg>
  )
}
import { toast } from 'react-toastify'
import {
  useCampaign,
  useCampaignAnalytics,
  useRelatedCampaigns,
  useRecordShare,
  usePublishCampaign,
} from '@/api/hooks/useCampaigns'
import { useStartConversation } from '@/api/hooks/useMessaging'
import { normalizeImageUrl } from '@/utils/imageUtils'
import { ProgressBar } from '@/components/campaign/ProgressBar'
import { CreatorReliabilityBadge } from '@/components/campaign/CreatorReliabilityBadge'
import { MultiMeterDisplay, createMeterData } from '@/components/campaign/MultiMeterDisplay'
import { CampaignCard } from '@/components/campaign/CampaignCard'
import { CampaignUpdates } from '@/components/campaign/CampaignUpdates'
import { CampaignComments } from '@/components/campaign/CampaignComments'
import { CampaignMilestones } from '@/components/campaign/CampaignMilestones'
import { CampaignVideo } from '@/components/campaign/CampaignVideo'
import { DonorFeed } from '@/components/campaign/DonorFeed'
import { ViralityCard } from '@/components/campaign/ViralityCard'
import { OfferHelpModal } from '@/components/donation/OfferHelpModal'
import { VolunteerOffers } from '@/components/creator/VolunteerOffers'
import { QRCodeDisplay } from '@/components/campaign/QRCodeDisplay'
import { FlyerDownload } from '@/components/campaign/FlyerDownload'
import { PaymentDirectory } from '@/components/campaign/PaymentDirectory'
import { ShareWizard } from '@/components/campaign/ShareWizard'
import { ShareInfoSection } from '@/components/campaign/ShareInfoSection'
import { MiracleModeBadge } from '@/components/campaign/MiracleModeBadge'
import { TransformationJourney } from '@/components/campaign/TransformationJourney'
import { ReferralClickTracker } from '@/components/campaign/ReferralClickTracker'
import { PrayButton } from '@/components/campaign/PrayButton'
import { PrayerActivityFeed } from '@/components/campaign/PrayerActivityFeed'
import { PrayerMeter } from '@/components/campaign/PrayerMeter'
import PrayerModal from '@/components/campaign/PrayerModal'
import { MessageButton } from '@/features/messaging/components/MessageButton'
import Button from '@/components/ui/Button'
import { BoostModal } from '@/components/boost'
import { useGetCampaignBoost } from '@/api/hooks/useBoosts'
import { useAuthStore } from '@/store/authStore'
import UpgradeToShareCard from '@/features/campaigns/upgrade/UpgradeToShareCard'
import BoostButton from '@/features/campaigns/boost/BoostButton'
import SponsorUpgradeRequest from '@/features/campaigns/upgrade/SponsorUpgradeRequest'

// ─── Animations ────────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`

const shimmer = keyframes`
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
`

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
`

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`

const progressFill = keyframes`
  from { width: 0%; }
  to   { width: var(--progress); }
`

// ─── Global Reset ──────────────────────────────────────────────────────────────

const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
`

// ─── Tokens ────────────────────────────────────────────────────────────────────

const tokens = {
  sand:    '#FAF8F4',
  cream:   '#F3EFE8',
  clay:    '#E8E0D4',
  slate:   '#2C2B28',
  charcoal:'#4A4845',
  muted:   '#8A857D',
  border:  '#DDD8CF',
  accent:  '#C4622D',
  accentLight: '#FAEAE1',
  accentDark:  '#9E4A1E',
  blue:    '#1D4ED8',
  blueLight:'#EFF6FF',
  success: '#166534',
  successLight: '#F0FDF4',
  white:   '#FFFFFF',
}

// ─── Layout ────────────────────────────────────────────────────────────────────

const Page = styled.div`
  min-height: 100vh;
  background: ${tokens.sand};
  font-family: 'DM Sans', sans-serif;
  color: ${tokens.slate};
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
`

// ─── Hero ──────────────────────────────────────────────────────────────────────

const HeroWrap = styled.div`
  position: relative;
  height: clamp(280px, 45vw, 520px);
  overflow: hidden;
  background: ${tokens.slate};
`

const HeroImg = styled.div`
  position: absolute;
  inset: 0;
  img { object-fit: cover; transition: transform 8s ease; }
  &:hover img { transform: scale(1.04); }
`

const HeroScrim = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    160deg,
    rgba(0,0,0,0.12) 0%,
    rgba(0,0,0,0.35) 50%,
    rgba(0,0,0,0.78) 100%
  );
`

const HeroBody = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: clamp(1.25rem, 4vw, 2.5rem);
  animation: ${fadeUp} 0.6s ease both;
`

const HeroBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: ${tokens.accent};
  color: white;
  font-family: 'Syne', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  padding: 5px 12px;
  border-radius: 100px;
  margin-bottom: 1rem;
  width: fit-content;
`

const HeroTitle = styled.h1`
  font-family: 'Syne', sans-serif;
  font-size: clamp(1.6rem, 4.5vw, 3rem);
  font-weight: 800;
  color: white;
  line-height: 1.15;
  margin: 0 0 0.75rem;
  max-width: 700px;
  text-shadow: 0 2px 12px rgba(0,0,0,0.3);
`

const HeroMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  color: rgba(255,255,255,0.82);
  font-size: 0.9rem;
`

const HeroCreator = styled(Link)`
  color: white;
  font-weight: 600;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 5px;
  &:hover { text-decoration: underline; }
`

const HeroSeparator = styled.span`
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(255,255,255,0.5);
`

// ─── Quick Stats Bar ────────────────────────────────────────────────────────────

const QuickStatsBar = styled.div`
  background: ${tokens.white};
  border-bottom: 1px solid ${tokens.border};
  padding: 0 clamp(1rem, 4vw, 2rem);
`

const QuickStatsInner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  overflow-x: auto;
  gap: 0;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`

const QuickStat = styled.div`
  flex: 1;
  min-width: 110px;
  padding: 1rem 1.25rem;
  border-right: 1px solid ${tokens.border};
  display: flex;
  flex-direction: column;
  gap: 2px;
  &:last-child { border-right: none; }

  @media (min-width: 768px) { min-width: 140px; }
`

const QuickStatLabel = styled.span`
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: ${tokens.muted};
`

const QuickStatValue = styled.span`
  font-family: 'Syne', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${tokens.slate};
  line-height: 1;
`

const QuickStatSub = styled.span`
  font-size: 0.7rem;
  color: ${tokens.muted};
`

// ─── Main Layout ───────────────────────────────────────────────────────────────

const Main = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 4vw, 2rem);
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  align-items: start;

  @media (min-width: 1024px) {
    grid-template-columns: 1fr 360px;
    gap: 2.5rem;
  }
`

// ─── Left Column ───────────────────────────────────────────────────────────────

const LeftCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
`

// ─── Card ──────────────────────────────────────────────────────────────────────

const Card = styled.div`
  background: ${tokens.white};
  border: 1px solid ${tokens.border};
  border-radius: 16px;
  padding: clamp(1.25rem, 3vw, 1.75rem);
  animation: ${fadeUp} 0.5s ease both;
  animation-delay: ${p => p.$delay || '0ms'};
  overflow: hidden;
`

const CardTitle = styled.h2`
  font-family: 'Syne', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${tokens.slate};
  margin: 0 0 1.25rem;
  display: flex;
  align-items: center;
  gap: 8px;
`

const CardTitleIcon = styled.span`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: ${p => p.$bg || tokens.accentLight};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${p => p.$color || tokens.accent};
  flex-shrink: 0;
`

// ─── Progress ──────────────────────────────────────────────────────────────────

const ProgressSection = styled.div`
  margin-bottom: 1.5rem;
`

const ProgressNumbers = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`

const RaisedAmount = styled.span`
  font-family: 'Syne', sans-serif;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 800;
  color: ${tokens.slate};
  line-height: 1;
`

const GoalAmount = styled.span`
  font-size: 0.9rem;
  color: ${tokens.muted};
  font-weight: 400;
`

const ProgressTrack = styled.div`
  height: 10px;
  background: ${tokens.cream};
  border-radius: 100px;
  overflow: hidden;
  position: relative;
`

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, ${tokens.accent}, ${tokens.accentDark});
  border-radius: 100px;
  --progress: ${p => Math.min(p.$pct, 100)}%;
  width: var(--progress);
  animation: ${progressFill} 1.2s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: 0.3s;
  position: relative;
  &::after {
    content: '';
    position: absolute;
    top: 0; right: 0;
    width: 4px; height: 100%;
    background: white;
    opacity: 0.4;
    border-radius: 100px;
  }
`

const ProgressPct = styled.span`
  font-family: 'Syne', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: ${tokens.accent};
  margin-top: 0.4rem;
  display: block;
`

// ─── Metrics Strip ─────────────────────────────────────────────────────────────

const MetricsStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.75rem;
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid ${tokens.clay};
`

const Metric = styled.div`
  background: ${tokens.sand};
  border: 1px solid ${tokens.border};
  border-radius: 12px;
  padding: 0.875rem 1rem;
  text-align: center;
`

const MetricVal = styled.div`
  font-family: 'Syne', sans-serif;
  font-size: 1.35rem;
  font-weight: 700;
  color: ${tokens.slate};
  line-height: 1;
  margin-bottom: 4px;
`

const MetricLabel = styled.div`
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: ${tokens.muted};
`

// ─── Description ───────────────────────────────────────────────────────────────

const Description = styled.div`
  color: ${tokens.charcoal};
  font-size: clamp(0.9rem, 2vw, 0.975rem);
  line-height: 1.85;
  font-weight: 300;
  white-space: pre-wrap;
  word-break: break-word;
`

// ─── Tags ──────────────────────────────────────────────────────────────────────

const TagsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid ${tokens.clay};
`

const TagChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: ${tokens.cream};
  border: 1px solid ${tokens.border};
  color: ${tokens.charcoal};
  font-size: 0.78rem;
  font-weight: 500;
  padding: 5px 12px;
  border-radius: 100px;
  cursor: default;
  transition: background 150ms;
  &:hover { background: ${tokens.clay}; }
`

// ─── Details List ──────────────────────────────────────────────────────────────

const DetailsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`

const DetailsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0.875rem 0;
  border-bottom: 1px solid ${tokens.clay};
  &:last-child { border-bottom: none; }
`

const DetailsIcon = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: ${p => p.$bg || tokens.cream};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${p => p.$color || tokens.charcoal};
  flex-shrink: 0;
`

const DetailsText = styled.div`
  flex: 1;
  min-width: 0;
`

const DetailsLabel = styled.div`
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: ${tokens.muted};
  margin-bottom: 2px;
`

const DetailsValue = styled.div`
  font-size: 0.9rem;
  font-weight: 500;
  color: ${tokens.slate};
  text-transform: capitalize;
`

// ─── Sidebar ───────────────────────────────────────────────────────────────────

const RightCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  @media (min-width: 1024px) {
    position: sticky;
    top: 1.5rem;
  }
`

// ─── CTA Card ──────────────────────────────────────────────────────────────────

const CTACard = styled(Card)`
  border: none;
  background: ${tokens.white};
  box-shadow:
    0 1px 2px rgba(0,0,0,0.04),
    0 8px 24px rgba(0,0,0,0.08);
  padding: 1.5rem;

  @media (min-width: 1024px) {
    position: sticky;
    top: 1.5rem;
  }
`

const PrimaryBtn = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: ${tokens.accent};
  color: white;
  font-family: 'Syne', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  border: none;
  border-radius: 12px;
  padding: 0.9rem 1.5rem;
  cursor: pointer;
  transition: background 150ms, transform 100ms;
  &:hover { background: ${tokens.accentDark}; }
  &:active { transform: scale(0.98); }

  @media (hover: none) { &:hover { background: ${tokens.accent}; } }
`

const SecondaryBtn = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: transparent;
  color: ${tokens.slate};
  font-family: 'Syne', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  border: 1.5px solid ${tokens.border};
  border-radius: 12px;
  padding: 0.8rem 1.25rem;
  cursor: pointer;
  transition: background 150ms, border-color 150ms, transform 100ms;
  &:hover {
    background: ${tokens.cream};
    border-color: ${tokens.clay};
  }
  &:active { transform: scale(0.98); }
`

const ShareGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.625rem;
`

const ShareBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: ${tokens.cream};
  border: 1px solid ${tokens.border};
  border-radius: 10px;
  padding: 0.7rem;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  color: ${tokens.charcoal};
  transition: background 150ms, border-color 150ms;
  &:hover {
    background: ${tokens.clay};
    border-color: ${tokens.clay};
  }
`

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${tokens.clay};
  margin: 0.25rem 0;
`

const ReportBtn = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: ${tokens.muted};
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: color 150ms, background 150ms;
  &:hover {
    color: #dc2626;
    background: #fef2f2;
  }
`

// ─── Budget Info Pill ──────────────────────────────────────────────────────────

const BudgetPill = styled.div`
  background: linear-gradient(135deg, ${tokens.accentLight}, #fff);
  border: 1px solid #f0c9b5;
  border-radius: 12px;
  padding: 0.875rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`

const BudgetMain = styled.div`
  font-family: 'Syne', sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  color: ${tokens.accent};
`

const BudgetSub = styled.div`
  font-size: 0.75rem;
  color: ${tokens.muted};
  margin-top: 2px;
`

// ─── Last Updated ──────────────────────────────────────────────────────────────

const UpdatedPill = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.78rem;
  color: ${tokens.muted};
  padding: 0.5rem;

  svg { animation: ${spin} 3s linear infinite; }
`

// ─── Related ───────────────────────────────────────────────────────────────────

const RelatedGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

// ─── Volunteer Section ─────────────────────────────────────────────────────────

const VolunteerWrap = styled.div`
  border-top: 1px solid ${tokens.border};
  padding-top: 2rem;
  margin-top: 1rem;
`

// ─── Skeleton ──────────────────────────────────────────────────────────────────

const SkeletonBase = styled.div`
  background: linear-gradient(
    90deg,
    ${tokens.cream} 25%,
    ${tokens.clay} 50%,
    ${tokens.cream} 75%
  );
  background-size: 800px 100%;
  animation: ${shimmer} 1.5s infinite linear;
  border-radius: 8px;
`

const SkeletonHero = styled(SkeletonBase)`
  height: clamp(280px, 45vw, 520px);
  border-radius: 0;
`

// ─── Section Divider ──────────────────────────────────────────────────────────

const SectionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.5rem 0 1rem;

  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${tokens.border};
  }

  span {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: ${tokens.muted};
    white-space: nowrap;
  }
`

// ─── Sticky Mobile CTA Bar ────────────────────────────────────────────────────

const MobileCtaBar = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(12px);
  border-top: 1px solid ${tokens.border};
  padding: 0.875rem 1rem calc(0.875rem + env(safe-area-inset-bottom));
  display: flex;
  gap: 0.75rem;
  z-index: 100;

  @media (min-width: 1024px) { display: none; }
`

const MobileDonateBtn = styled.button`
  flex: 1;
  background: ${tokens.accent};
  color: white;
  font-family: 'Syne', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  border: none;
  border-radius: 12px;
  padding: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 150ms;
  &:hover { background: ${tokens.accentDark}; }
`

const MobileShareBtn = styled.button`
  width: 52px;
  height: 52px;
  background: ${tokens.cream};
  border: 1.5px solid ${tokens.border};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${tokens.charcoal};
  cursor: pointer;
  transition: background 150ms;
  &:hover { background: ${tokens.clay}; }
  flex-shrink: 0;
`

// ─── Mobile Bottom Padding ────────────────────────────────────────────────────

const BottomPad = styled.div`
  height: 80px;
  @media (min-width: 1024px) { display: none; }
`

// ─── Copy Icon Toggle ─────────────────────────────────────────────────────────

function CopyIcon({ copied }) {
  return copied
    ? <Check size={15} color="#166534" />
    : <Copy size={15} />
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CampaignDetailClient() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuthStore()
  const campaignId = params.id

  const [copied, setCopied] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('')
  const [isOfferHelpOpen, setIsOfferHelpOpen] = useState(false)
  const [isShareWizardOpen, setIsShareWizardOpen] = useState(false)
  const [isPrayerModalOpen, setIsPrayerModalOpen] = useState(false)
  const [isBoostModalOpen, setIsBoostModalOpen] = useState(false)

  const { data: campaign, isLoading, error } = useCampaign(campaignId)
  // Determine ownership BEFORE the authed-only fetches so they don't fire (and
  // 401) for public/logged-out visitors arriving via a referral link.
  const isCreator = user && campaign && user.id === campaign.creator_id ? true : undefined
  const { data: analytics } = useCampaignAnalytics(isCreator ? campaignId : undefined)
  const { data: relatedCampaigns } = useRelatedCampaigns(campaignId, campaign?.need_type || '', 3)
  const { mutate: recordShare } = useRecordShare()

  const { data: campaignBoost } = useGetCampaignBoost(isCreator ? campaignId : null)
  const activeBoost = campaignBoost?.has_active_boost ? campaignBoost.boost : null
  const isFundraising = campaign?.campaign_type === 'fundraising'
  const isSharing = campaign?.campaign_type === 'sharing'

  // Track a successful return from Stripe boost checkout. The query param is
  // stripped immediately, so remember it in state for the publish fallback
  // below (campaign data usually hasn't loaded yet at this point).
  const [returnedFromBoostSuccess, setReturnedFromBoostSuccess] = useState(false)
  const publishAttemptedRef = useRef(false)
  const publishCampaignMutation = usePublishCampaign()

  useEffect(() => {
    const status = searchParams?.get('boost_status')
    if (status === 'success') {
      setReturnedFromBoostSuccess(true)
      toast.success('🎉 Boost payment successful!')
      window.history.replaceState({}, document.title, `/campaigns/${campaignId}`)
    } else if (status === 'cancelled') {
      toast.info('Boost payment was cancelled.')
      window.history.replaceState({}, document.title, `/campaigns/${campaignId}`)
    }
  }, [searchParams, campaignId])

  // Safety net: a paid boost is a "publish my campaign" purchase. The backend
  // webhook publishes it server-side, but if that's delayed or missed, the
  // campaign would sit invisible in draft after the creator already paid. If
  // we returned from a successful boost checkout and the campaign we own is
  // still draft, publish it from here.
  useEffect(() => {
    if (!returnedFromBoostSuccess || publishAttemptedRef.current) return
    if (!campaign || !user) return
    if (user.id !== campaign.creator_id) return
    if (campaign.status !== 'draft') return

    publishAttemptedRef.current = true
    publishCampaignMutation.mutate(String(campaignId), {
      onSuccess: () => {
        toast.success('🚀 Your campaign is now live!')
      },
      onError: () => {
        toast.warn(
          'Payment received, but the campaign could not be activated automatically. Open your dashboard and press "Activate" — or contact support.'
        )
      },
    })
  }, [returnedFromBoostSuccess, campaign, user, campaignId, publishCampaignMutation])

  useEffect(() => {
    if (!analytics?.lastUpdated) return
    const calc = () => {
      const diff = Math.floor((Date.now() - new Date(analytics.lastUpdated).getTime()) / 60000)
      if (diff === 0) return setLastUpdated('just now')
      if (diff < 60) return setLastUpdated(`${diff}m ago`)
      if (diff < 1440) return setLastUpdated(`${Math.floor(diff / 60)}h ago`)
      setLastUpdated(`${Math.floor(diff / 1440)}d ago`)
    }
    calc()
    const id = setInterval(calc, 60000)
    return () => clearInterval(id)
  }, [analytics?.lastUpdated])

  const handleShare = (channel) => {
    if (['facebook','twitter','linkedin','email','whatsapp','instagram','tiktok','link'].includes(channel)) {
      recordShare({ campaignId, channel })
    }
    const base = `${window.location.origin}/campaigns/${campaignId}`
    const utm = new URLSearchParams({
      utm_source: channel,
      utm_medium: 'share',
      utm_campaign: campaignId,
    })
    const trackUrl = `${base}?${utm}`

    if (channel === 'copy') {
      navigator.clipboard.writeText(trackUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Link copied!')
    } else if (channel === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out: ${campaign.title}`)}&url=${encodeURIComponent(base)}`, '_blank')
    } else if (channel === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(base)}`, '_blank')
    } else if (channel === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(`Check out: ${campaign.title} ${trackUrl}`)}`, '_blank')
    } else if (channel === 'instagram' || channel === 'tiktok') {
      // Neither platform has a web share intent for links — copy the tracked
      // URL so the user can paste it into a story, caption, or bio.
      navigator.clipboard.writeText(trackUrl)
      toast.success(
        channel === 'instagram'
          ? 'Link copied! Paste it into your Instagram story, post, or bio.'
          : 'Link copied! Paste it into your TikTok caption or bio.'
      )
    } else if (channel === 'native') {
      // OS share sheet — reaches every installed app (Instagram, TikTok,
      // Telegram, SMS, …). Falls back to copying the link on desktop browsers.
      if (typeof navigator.share === 'function') {
        navigator.share({ title: campaign.title, url: trackUrl }).catch(() => {})
      } else {
        navigator.clipboard.writeText(trackUrl)
        toast.success('Link copied! Paste it anywhere to share.')
      }
    } else if (channel === 'email') {
      window.open(`mailto:?subject=${encodeURIComponent(campaign.title)}&body=${encodeURIComponent(trackUrl)}`)
    }
  }

  // Viewing this page is public, but any action requires sign-in. This gate
  // stores the return path the way useLogin reads it (redirect_after_login)
  // so the user lands back here after authenticating.
  const requireAuth = (action: () => void, returnTo: string = `/campaigns/${campaignId}`) => {
    if (!user) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('redirect_after_login', returnTo)
      }
      toast.info('Please log in to continue')
      router.push('/login')
      return
    }
    action()
  }

  const handleDonate = () => {
    requireAuth(
      () => router.push(`/campaigns/${campaignId}/donate`),
      `/campaigns/${campaignId}/donate`
    )
  }

  // MS-08: let a sponsor / supporter message the campaign owner directly
  // (e.g. to ask about preferred payment methods, sponsorship, logistics).
  const { mutate: startConversation, isPending: startingConversation } = useStartConversation()
  const handleMessageOwner = () => {
    if (!user) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('redirect_after_login', `/campaigns/${campaignId}`)
      }
      toast.info('Please log in to message the campaign owner')
      router.push('/login')
      return
    }
    startConversation(
      {
        recipient_id: campaign.creator_id,
        context_type: 'sponsor',
        campaign_id: String(campaignId),
        subject: `Inquiry about "${campaign.title}"`,
      },
      {
        onSuccess: ({ conversation }) => {
          router.push(`/messages?c=${conversation.conversation_id}`)
        },
        onError: () => toast.error('Could not start the conversation. Please try again.'),
      }
    )
  }

  const goalAmount = campaign?.goal_amount || 0
  const raisedAmount = campaign?.raised_amount || 0
  const pct = goalAmount > 0 ? Math.min((raisedAmount / goalAmount) * 100, 100) : 0

  // SF-1: reach is a SHARE COUNT goal (not dollars) — the share-virality meter.
  const reachTarget = (campaign as any)?.reach_goal?.target_shares || 0
  const reachCurrent = (campaign as any)?.reach_goal?.current_shares ?? campaign?.share_count ?? 0
  const reachPct = reachTarget > 0 ? Math.min((reachCurrent / reachTarget) * 100, 100) : 0

  const fmt = (cents) => (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  const daysLeft = campaign?.end_date
    ? Math.max(0, Math.ceil((new Date(campaign.end_date) - new Date()) / 86400000))
    : null

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (isLoading || !campaign) {
    return (
      <Page>
        <SkeletonHero />
        <Main style={{ gridTemplateColumns: '1fr' }}>
          {[...Array(3)].map((_, i) => (
            <SkeletonBase key={i} style={{ height: 180, borderRadius: 16, animationDelay: `${i * 0.1}s` }} />
          ))}
        </Main>
      </Page>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <Page>
        <Main style={{ gridTemplateColumns: '1fr', textAlign: 'center', paddingTop: '5rem' }}>
          <div>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
            <h1 style={{ fontFamily: 'Syne', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Campaign not found</h1>
            <p style={{ color: tokens.muted, marginBottom: '1.5rem' }}>The campaign you're looking for doesn't exist or has been removed.</p>
            <Link href="/campaigns" style={{ background: tokens.accent, color: 'white', padding: '0.75rem 1.5rem', borderRadius: '12px', textDecoration: 'none', fontFamily: 'Syne', fontWeight: 700 }}>
              Browse Campaigns
            </Link>
          </div>
        </Main>
      </Page>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const imgUrl = normalizeImageUrl(campaign.image_url || campaign.image?.url)

  return (
    <Page>
      <GlobalStyle />
      <ReferralClickTracker campaignId={campaignId} />

      {/* ── Hero ── */}
      <HeroWrap>
        <HeroImg>
          {imgUrl ? (
            <Image src={imgUrl} alt={campaign.title} fill priority />
          ) : (
            <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, #2C2B28 0%, #4A4845 100%)` }} />
          )}
        </HeroImg>
        <HeroScrim />
        <HeroBody>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <HeroBadge>
              <Sparkles size={11} />
              {campaign.need_type || campaign.category || 'Campaign'}
            </HeroBadge>
            {/* G-5: emergency rally indicator */}
            <MiracleModeBadge miracleMode={(campaign as any).miracle_mode} />
          </div>
          <HeroTitle>{campaign.title}</HeroTitle>
          <HeroMeta>
            <span>by</span>
            <HeroCreator href={`/creator/${campaign.creator_id}`}>
              {campaign.creator_name || 'Creator'}
              <ArrowUpRight size={14} />
            </HeroCreator>
            {(campaign as any).creator_reliability && (
              <CreatorReliabilityBadge reliability={(campaign as any).creator_reliability} compact />
            )}
            {daysLeft !== null && (
              <>
                <HeroSeparator />
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={13} />
                  {daysLeft > 0 ? `${daysLeft} days left` : 'Ended'}
                </span>
              </>
            )}
          </HeroMeta>
        </HeroBody>
      </HeroWrap>

      {/* ── Quick Stats Bar ── */}
      <QuickStatsBar>
        <QuickStatsInner>
          {isFundraising && (
            <QuickStat>
              <QuickStatLabel>Raised</QuickStatLabel>
              <QuickStatValue>{fmt(raisedAmount)}</QuickStatValue>
              <QuickStatSub>of {fmt(goalAmount)}</QuickStatSub>
            </QuickStat>
          )}
          <QuickStat>
            <QuickStatLabel>Supporters</QuickStatLabel>
            <QuickStatValue>{(campaign.total_donors || 0).toLocaleString()}</QuickStatValue>
            <QuickStatSub>total</QuickStatSub>
          </QuickStat>
          {isSharing && (
            <QuickStat>
              <QuickStatLabel>Shares</QuickStatLabel>
              <QuickStatValue>{(campaign.share_count || 0).toLocaleString()}</QuickStatValue>
              <QuickStatSub>total</QuickStatSub>
            </QuickStat>
          )}
          {isFundraising && (
            <QuickStat>
              <QuickStatLabel>Avg Donation</QuickStatLabel>
              <QuickStatValue>{fmt(campaign.average_donation || 0)}</QuickStatValue>
              <QuickStatSub>per donor</QuickStatSub>
            </QuickStat>
          )}
          <QuickStat>
            <QuickStatLabel>Status</QuickStatLabel>
            <QuickStatValue style={{ textTransform: 'capitalize', fontSize: '1rem' }}>
              {campaign.status || 'Active'}
            </QuickStatValue>
            <QuickStatSub>{campaign.campaign_type}</QuickStatSub>
          </QuickStat>
        </QuickStatsInner>
      </QuickStatsBar>

      {/* ── Main Grid ── */}
      <Main>
        {/* ── Left Column ── */}
        <LeftCol>

          {/* Progress Card */}
          {isFundraising && (
            <Card $delay="50ms">
              <CardTitle>
                <CardTitleIcon $bg={tokens.accentLight} $color={tokens.accent}>
                  <TrendingUp size={14} />
                </CardTitleIcon>
                Campaign Progress
              </CardTitle>

              <ProgressSection>
                <ProgressNumbers>
                  <RaisedAmount>{fmt(raisedAmount)}</RaisedAmount>
                  <GoalAmount>goal: {fmt(goalAmount)}</GoalAmount>
                </ProgressNumbers>
                <ProgressTrack>
                  <ProgressFill $pct={pct} />
                </ProgressTrack>
                <ProgressPct>{pct.toFixed(1)}% funded</ProgressPct>
              </ProgressSection>

              <MetricsStrip>
                <Metric>
                  <MetricVal>{(campaign.total_donors || 0).toLocaleString()}</MetricVal>
                  <MetricLabel>Donors</MetricLabel>
                </Metric>
                <Metric>
                  <MetricVal>{fmt(campaign.average_donation || 0)}</MetricVal>
                  <MetricLabel>Avg Gift</MetricLabel>
                </Metric>
                <Metric>
                  <MetricVal>{daysLeft !== null ? (daysLeft > 0 ? daysLeft : '–') : '–'}</MetricVal>
                  <MetricLabel>Days Left</MetricLabel>
                </Metric>
              </MetricsStrip>
            </Card>
          )}

          {/* SF-1: Reach (share-count) progress meter — sharing campaigns only */}
          {isSharing && reachTarget > 0 && (
            <Card $delay="50ms">
              <CardTitle>
                <CardTitleIcon $bg={tokens.accentLight} $color={tokens.accent}>
                  <Zap size={14} />
                </CardTitleIcon>
                Reach Goal
              </CardTitle>

              <ProgressSection>
                <ProgressNumbers>
                  <RaisedAmount>{reachCurrent.toLocaleString()}</RaisedAmount>
                  <GoalAmount>goal: {reachTarget.toLocaleString()} shares</GoalAmount>
                </ProgressNumbers>
                <ProgressTrack>
                  <ProgressFill $pct={reachPct} />
                </ProgressTrack>
                <ProgressPct>{reachPct.toFixed(1)}% of share goal</ProgressPct>
              </ProgressSection>

              <MetricsStrip>
                <Metric>
                  <MetricVal>{(campaign.share_count || 0).toLocaleString()}</MetricVal>
                  <MetricLabel>Total Shares</MetricLabel>
                </Metric>
                <Metric>
                  <MetricVal>{(campaign.total_donors || 0).toLocaleString()}</MetricVal>
                  <MetricLabel>Supporters</MetricLabel>
                </Metric>
                <Metric>
                  <MetricVal>{daysLeft !== null ? (daysLeft > 0 ? daysLeft : '–') : '–'}</MetricVal>
                  <MetricLabel>Days Left</MetricLabel>
                </Metric>
              </MetricsStrip>
            </Card>
          )}

          {/* Share Info */}
          {isSharing && <ShareInfoSection share_config={campaign?.share_config} />}

          {/* About */}
          <Card $delay="100ms">
            <CardTitle>
              <CardTitleIcon $bg={tokens.blueLight} $color={tokens.blue}>
                <BookOpen size={14} />
              </CardTitleIcon>
              About This Campaign
            </CardTitle>
            <Description>
              {campaign.description || campaign.full_description || 'No description available.'}
            </Description>
            {campaign.tags?.length > 0 && (
              <TagsRow>
                {campaign.tags.map(t => (
                  <TagChip key={t}>
                    <Tag size={11} />
                    {t}
                  </TagChip>
                ))}
              </TagsRow>
            )}
          </Card>

          {/* CA-17 Campaign Video */}
          {(campaign.video?.embed_url || isCreator) && (
            <Card $delay="125ms">
              <CampaignVideo campaignId={campaignId} video={campaign.video} isCreator={isCreator} />
            </Card>
          )}

          {/* CA-20 / G-7 Transformation Journey (before/after storytelling) */}
          {(campaign as any).transformation_journey?.length > 0 && (
            <Card $delay="130ms">
              <TransformationJourney journey={(campaign as any).transformation_journey} />
            </Card>
          )}

          {/* Boost Campaign (creator-only) — boost any time after creation */}
          {isCreator && (
            <Card $delay="132ms">
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', color: '#1d4ed8', flexShrink: 0 }}>
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      {activeBoost ? 'Campaign is boosted' : 'Boost this campaign'}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.15rem 0 0' }}>
                      {activeBoost
                        ? `${activeBoost.visibility_weight}x visibility · ${activeBoost.days_remaining} days remaining`
                        : 'Increase visibility in supporter feeds — free or $20 boost.'}
                    </p>
                  </div>
                </div>
                <Button onClick={() => setIsBoostModalOpen(true)}>
                  {activeBoost ? 'Manage Boost' : 'Boost Campaign'}
                </Button>
              </div>
            </Card>
          )}

          {/* CA-13 Crowdfunded Virality (creator-only insight) */}
          {isCreator && (
            <Card $delay="135ms">
              <ViralityCard campaignId={campaignId} />
            </Card>
          )}

          {/* Updates */}
          <Card $delay="150ms">
            <CampaignUpdates campaignId={campaignId} isCreator={isCreator} />
          </Card>

          {/* CA-19 Milestone Celebrations */}
          <Card $delay="155ms">
            <CampaignMilestones campaignId={campaignId} isCreator={isCreator} />
          </Card>

          {/* CA-18 Social Proof / Donor Feed */}
          <Card $delay="160ms">
            <DonorFeed campaignId={campaignId} />
          </Card>

          {/* CA-15 Comments & Encouragement */}
          <Card $delay="165ms">
            <CampaignComments campaignId={campaignId} isCreator={isCreator} />
          </Card>

          {/* Prayer */}
          {campaign && (
            <>
              <Card $delay="175ms">
                <PrayerMeter campaignId={campaignId} goalPrayers={100} showBreakdown={false} />
              </Card>
              <Card $delay="200ms">
                <PrayerActivityFeed campaignId={campaignId} page={1} limit={10} />
              </Card>
            </>
          )}

          {/* QR + Flyer */}
          <Card $delay="225ms">
            <QRCodeDisplay campaignId={campaignId} campaignTitle={campaign.title} size={220} />
          </Card>

          <Card $delay="250ms">
            <FlyerDownload
              campaignId={campaignId}
              campaignTitle={campaign.title}
              campaignDescription={campaign.description || campaign.full_description?.substring(0, 150)}
              creatorName={campaign.creator_name || 'Creator'}
              category={campaign.need_type || campaign.category || 'Campaign'}
            />
          </Card>

          {/* Payment Directory */}
          {/* SR-1/SU-1: any campaign that lists payment methods can take donations */}
          {campaign.payment_methods?.length > 0 && (
            <Card $delay="275ms">
              <PaymentDirectory
                paymentMethods={campaign.payment_methods}
                creatorName={campaign.creator_name || 'Creator'}
              />
            </Card>
          )}

          {/* Related Campaigns */}
          {relatedCampaigns?.length > 0 && (
            <Card $delay="300ms">
              <CardTitle>
                <CardTitleIcon $bg={tokens.successLight} $color={tokens.success}>
                  <Sparkles size={14} />
                </CardTitleIcon>
                Similar Campaigns
              </CardTitle>
              <RelatedGrid>
                {relatedCampaigns.map(c => (
                  <CampaignCard key={c.id} campaign={c} onDonate={handleDonate} onShare={() => handleShare('twitter')} />
                ))}
              </RelatedGrid>
            </Card>
          )}
        </LeftCol>

        {/* ── Sidebar ── */}
        <RightCol>
          <CTACard $delay="75ms">

            {/* ── Sharing Campaign Sidebar ── */}
            {isSharing ? (
              <>
                <PrimaryBtn onClick={() => requireAuth(() => setIsShareWizardOpen(true))}>
                  <Gift size={18} />
                  {user ? 'Share to Earn' : 'Log in to Share to Earn'}
                </PrimaryBtn>

                {campaign?.share_config && (
                  <BudgetPill style={{ marginTop: '0.875rem' }}>
                    <div>
                      <BudgetMain>${(campaign.share_config.amount_per_share || 50) / 100} per share</BudgetMain>
                      <BudgetSub>Budget: {fmt(campaign.share_config.total_budget || 0)}</BudgetSub>
                    </div>
                    <Zap size={20} color={tokens.accent} />
                  </BudgetPill>
                )}

                {/* SR-1/SU-1: sharing campaigns take donations too — surface Donate. */}
                <SecondaryBtn onClick={handleDonate} style={{ marginTop: '0.875rem' }}>
                  <Hand size={16} />
                  {user ? 'Donate Now' : 'Log in to Donate'}
                </SecondaryBtn>

                <SectionLabel style={{ marginTop: '1rem' }}><span>More Actions</span></SectionLabel>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <SecondaryBtn onClick={() => handleShare('copy')}>
                    <CopyIcon copied={copied} />
                    {copied ? 'Copied!' : 'Copy Link'}
                  </SecondaryBtn>
                  <SecondaryBtn onClick={() => requireAuth(() => setIsOfferHelpOpen(true))}>
                    <Briefcase size={16} />
                    Offer Help
                  </SecondaryBtn>
                  {campaign?.creator_id && (
                    <MessageButton
                      recipientId={campaign.creator_id}
                      recipientName={campaign.creator_name || 'Creator'}
                      contextType="campaign"
                      campaignId={campaignId}
                      label="Message Creator"
                      variant="outline"
                      size="md"
                      fullWidth
                    />
                  )}
                  {(campaign as any)?.prayer_config?.enabled && (
                    <SecondaryBtn onClick={() => requireAuth(() => setIsPrayerModalOpen(true))}>
                      🙏 Pray for This Campaign
                    </SecondaryBtn>
                  )}
                </div>

                <SectionLabel style={{ marginTop: '1rem' }}><span>Share On</span></SectionLabel>

                <ShareGrid>
                  <ShareBtn onClick={() => handleShare('twitter')}>
                    X
                  </ShareBtn>
                  <ShareBtn onClick={() => handleShare('facebook')}>
                    FB
                  </ShareBtn>
                  <ShareBtn onClick={() => handleShare('whatsapp')}>
                    <MessageCircle size={14} /> WhatsApp
                  </ShareBtn>
                  <ShareBtn onClick={() => handleShare('instagram')}>
                    <InstagramGlyph size={14} /> Instagram
                  </ShareBtn>
                  <ShareBtn onClick={() => handleShare('tiktok')}>
                    <Music2 size={14} /> TikTok
                  </ShareBtn>
                  <ShareBtn onClick={() => handleShare('email')}>
                    <Mail size={14} /> Email
                  </ShareBtn>
                  <ShareBtn onClick={() => handleShare('native')} style={{ gridColumn: '1 / -1' }}>
                    <Share2 size={14} /> More options
                  </ShareBtn>
                </ShareGrid>
              </>
            ) : (
              /* ── Fundraising Campaign Sidebar ── */
              <>
                <PrimaryBtn onClick={handleDonate}>
                  <Hand size={18} />
                  {user ? 'Donate Now' : 'Log in to Donate'}
                </PrimaryBtn>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '0.75rem' }}>
                  <SecondaryBtn onClick={() => requireAuth(() => setIsOfferHelpOpen(true))}>
                    <Briefcase size={16} />
                    Offer Help
                  </SecondaryBtn>
                  {campaign?.creator_id && (
                    <MessageButton
                      recipientId={campaign.creator_id}
                      recipientName={campaign.creator_name || 'Creator'}
                      contextType="campaign"
                      campaignId={campaignId}
                      label="Message Creator"
                      variant="outline"
                      size="md"
                      fullWidth
                    />
                  )}
                  <SecondaryBtn onClick={() => requireAuth(() => setIsPrayerModalOpen(true))}>
                    🙏 Pray for This Campaign
                  </SecondaryBtn>
                  <SecondaryBtn onClick={() => handleShare('copy')}>
                    <CopyIcon copied={copied} />
                    {copied ? 'Copied!' : 'Copy Link'}
                  </SecondaryBtn>
                </div>

                <SectionLabel style={{ marginTop: '1rem' }}><span>Share On</span></SectionLabel>

                <ShareGrid>
                  <ShareBtn onClick={() => handleShare('twitter')}>
                    X
                  </ShareBtn>
                  <ShareBtn onClick={() => handleShare('facebook')}>
                    FB
                  </ShareBtn>
                  <ShareBtn onClick={() => handleShare('whatsapp')}>
                    <MessageCircle size={14} /> WhatsApp
                  </ShareBtn>
                  <ShareBtn onClick={() => handleShare('instagram')}>
                    <InstagramGlyph size={14} /> Instagram
                  </ShareBtn>
                  <ShareBtn onClick={() => handleShare('tiktok')}>
                    <Music2 size={14} /> TikTok
                  </ShareBtn>
                  <ShareBtn onClick={() => handleShare('email')}>
                    <Mail size={14} /> Email
                  </ShareBtn>
                  <ShareBtn onClick={() => handleShare('native')} style={{ gridColumn: '1 / -1' }}>
                    <Share2 size={14} /> More options
                  </ShareBtn>
                </ShareGrid>
              </>
            )}

            {/* Community boost — supporters amplifying someone else's campaign.
                Distinct from the creator's paid "Promote" boost under /boosts. */}
            {!isCreator && campaignId && (
              <div style={{ marginTop: '1rem' }}>
                <BoostButton campaignId={String(campaignId)} source="campaign_page" />
              </div>
            )}

            {/* Qualified supporters (donors / verified sharers) can ASK the
                creator to add share rewards. Renders nothing for anyone else. */}
            {!isCreator && campaignId && (
              <div style={{ marginTop: '1rem' }}>
                <SponsorUpgradeRequest campaignId={String(campaignId)} />
              </div>
            )}

            {/* Free Campaign → Share Campaign upgrade (owner only; the card
                renders nothing for anyone else). */}
            {isCreator && campaignId && (
              <div style={{ marginTop: '1rem' }}>
                <UpgradeToShareCard campaignId={String(campaignId)} />
              </div>
            )}

            {/* MS-08: Sponsor / supporter → campaign owner messaging */}
            {!isCreator && (
              <>
                <SectionLabel style={{ marginTop: '1rem' }}><span>Sponsorship &amp; Inquiries</span></SectionLabel>
                <SecondaryBtn onClick={handleMessageOwner} disabled={startingConversation}>
                  <MessageSquare size={16} />
                  {startingConversation ? 'Opening…' : 'Message Owner'}
                </SecondaryBtn>
              </>
            )}

            <Divider style={{ marginTop: '1rem' }} />

            {/* Campaign Details */}
            <DetailsList style={{ marginTop: '0.5rem' }}>
              <DetailsRow>
                <DetailsIcon $bg={tokens.cream} $color={tokens.charcoal}>
                  <Calendar size={15} />
                </DetailsIcon>
                <DetailsText>
                  <DetailsLabel>End Date</DetailsLabel>
                  <DetailsValue>
                    {campaign.end_date
                      ? new Date(campaign.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                      : 'No end date'}
                  </DetailsValue>
                </DetailsText>
              </DetailsRow>

              <DetailsRow>
                <DetailsIcon $bg={tokens.cream} $color={tokens.charcoal}>
                  <Users size={15} />
                </DetailsIcon>
                <DetailsText>
                  <DetailsLabel>Category</DetailsLabel>
                  <DetailsValue>{campaign.need_type || campaign.category || 'General'}</DetailsValue>
                </DetailsText>
              </DetailsRow>

              {isFundraising && (
                <DetailsRow>
                  <DetailsIcon $bg={tokens.accentLight} $color={tokens.accent}>
                    <TrendingUp size={15} />
                  </DetailsIcon>
                  <DetailsText>
                    <DetailsLabel>Funding Goal</DetailsLabel>
                    <DetailsValue>{goalAmount > 0 ? fmt(goalAmount) : 'N/A'}</DetailsValue>
                  </DetailsText>
                </DetailsRow>
              )}
            </DetailsList>

            <Divider style={{ marginTop: '0.5rem' }} />

            {lastUpdated && (
              <UpdatedPill>
                <RefreshCw size={13} />
                Updated {lastUpdated}
              </UpdatedPill>
            )}

            <ReportBtn>
              <Flag size={13} />
              Report this campaign
            </ReportBtn>
          </CTACard>
        </RightCol>
      </Main>

      {/* Volunteer Section — creator-only management panel (offers made to the
          campaign). Hidden from public/logged-out visitors so it doesn't fetch
          the authed-only /volunteer-offers endpoint and 401. */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem)' }}>
        {isCreator && (
          <VolunteerWrap>
            <VolunteerOffers campaignId={campaignId} expandedView />
          </VolunteerWrap>
        )}
        <BottomPad />
      </div>

      {/* ── Mobile Sticky CTA ── */}
      <MobileCtaBar>
        {isSharing ? (
          <>
            <MobileDonateBtn onClick={() => requireAuth(() => setIsShareWizardOpen(true))}>
              <Gift size={16} />
              Share to Earn
            </MobileDonateBtn>
            {/* SR-1/SU-1: sharing campaigns take donations too */}
            <MobileDonateBtn onClick={handleDonate}>
              <Hand size={16} />
              Donate
            </MobileDonateBtn>
          </>
        ) : (
          <>
            <MobileDonateBtn onClick={handleDonate}>
              <Hand size={16} />
              {user ? 'Donate Now' : 'Log in to Donate'}
            </MobileDonateBtn>
            <MobileShareBtn onClick={() => handleShare('copy')} aria-label="Copy link">
              {copied ? <Check size={18} color="#166534" /> : <Share2 size={18} />}
            </MobileShareBtn>
          </>
        )}
      </MobileCtaBar>

      {/* Modals */}
      <OfferHelpModal
        isOpen={isOfferHelpOpen}
        onClose={() => setIsOfferHelpOpen(false)}
        campaignId={campaignId}
        campaignTitle={campaign?.title || 'Campaign'}
      />
      <ShareWizard
        isOpen={isShareWizardOpen}
        onClose={() => setIsShareWizardOpen(false)}
        campaignId={campaignId}
        campaignTitle={campaign?.title}
        campaignDescription={campaign?.description || campaign?.full_description}
        creator_name={campaign?.creator_name}
        share_config={campaign?.share_config}
      />
      <PrayerModal
        isOpen={isPrayerModalOpen}
        onClose={() => setIsPrayerModalOpen(false)}
        campaignId={campaignId}
        campaignTitle={campaign?.title || 'Campaign'}
      />
      {isCreator && (
        <BoostModal
          isOpen={isBoostModalOpen}
          onClose={() => setIsBoostModalOpen(false)}
          campaignId={campaignId}
          campaignTitle={campaign?.title || 'Campaign'}
        />
      )}
    </Page>
  )
}