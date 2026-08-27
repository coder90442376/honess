'use client'

/**
 * Admin: Free → Share Campaign upgrade history.
 *
 * Every upgrade leaves a record regardless of who triggered it — the creator,
 * a sponsoring supporter, or an admin — so this is the single place to answer
 * "who upgraded what, when, and on whose authority".
 *
 * It also surfaces sponsored requests still sitting in
 * `pending_owner_approval`, which is how an admin spots a creator who has left
 * a supporter's request unanswered.
 *
 * Read-only by design. Acting on a campaign happens in the moderation queue,
 * where the payout-readiness context lives.
 */

import { useState, useMemo, Suspense } from 'react'
import Link from 'next/link'
import {
  PageHeader,
  Loading,
  ErrorBlock,
  Empty,
  Badge,
  Stat,
  Pagination,
  adminStyles as s,
} from '../../_components/ui'
import { fmtDate, hasPerm } from '../../_lib/format'
import { useCampaignUpgrades, useCampaignUpgradeStats, useAdminMe } from '@/api/hooks/useAdmin'
import type { CampaignUpgradeRecord } from '@/api/services/adminService'

const STATUSES = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending_owner_approval', label: 'Awaiting owner' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
  { value: 'failed', label: 'Failed' },
]

const INITIATORS = [
  { value: 'all', label: 'All initiators' },
  { value: 'creator', label: 'Creator' },
  { value: 'sponsor', label: 'Sponsor' },
  { value: 'admin', label: 'Admin' },
]

/** Upgrade statuses map onto the shared Badge tones. */
const BADGE_STATUS: Record<string, string> = {
  completed: 'approved',
  pending_owner_approval: 'pending',
  rejected: 'rejected',
  cancelled: 'rejected',
  expired: 'flagged',
  failed: 'rejected',
}

const STATUS_LABEL: Record<string, string> = {
  completed: 'Completed',
  pending_owner_approval: 'Awaiting owner',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  expired: 'Expired',
  failed: 'Failed',
}

/** Actor fields arrive either populated or as a bare id. */
function actorName(actor: CampaignUpgradeRecord['initiated_by']): string {
  if (!actor) return '—'
  if (typeof actor === 'string') return actor
  return actor.display_name || actor.email || actor._id
}

function actorEmail(actor: CampaignUpgradeRecord['initiated_by']): string | null {
  if (!actor || typeof actor === 'string') return null
  return actor.email || null
}

export default function CampaignUpgradesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CampaignUpgradesTable />
    </Suspense>
  )
}

function CampaignUpgradesTable() {
  const [status, setStatus] = useState('all')
  const [initiatorType, setInitiatorType] = useState('all')
  const [page, setPage] = useState(1)

  const { data: me, isLoading: meLoading } = useAdminMe()
  const canView = hasPerm(me?.permissions, 'campaign_moderation:view')

  const { data, isLoading, isError, error, refetch, isFetching } = useCampaignUpgrades(
    { status, initiator_type: initiatorType, page, limit: 25 },
    canView
  )

  // Windowed to the last 30 days: the rollout question is "what is the gate
  // doing NOW", not a lifetime average that hides a recent change.
  const since = useMemo(() => new Date(Date.now() - 30 * 86400000).toISOString(), [])
  const { data: stats } = useCampaignUpgradeStats({ start_date: since }, canView)

  // A 403 is a permissions problem, not an outage — saying "failed to load"
  // would send an admin chasing a bug that isn't there.
  const status403 =
    (error as { response?: { status?: number } } | null)?.response?.status === 403

  if (meLoading) return <Loading />

  if (!canView || status403) {
    return (
      <div className={s.page}>
        <PageHeader title="Campaign Upgrades" subtitle="Free → Share Campaign upgrade history" />
        <ErrorBlock message="You don't have permission to view campaign moderation records. Ask a super admin for the campaign_moderation:view permission." />
      </div>
    )
  }

  return (
    <div className={s.page}>
      <PageHeader
        title="Campaign Upgrades"
        subtitle="Free → Share Campaign upgrade history and pending requests"
        actions={
          <Link className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} href="/admin/moderation">
            Back to queue
          </Link>
        }
      />

      {stats && (
        <>
          <div className={s.statGrid}>
            <Stat
              label="Upgrade attempts (30d)"
              value={stats.funnel.attempted}
              sub={`${stats.funnel.succeeded} completed`}
            />
            <Stat
              label="Conversion rate"
              value={`${stats.funnel.conversion_rate}%`}
              sub="attempts that became Share Campaigns"
            />
            <Stat
              label="Payout-gate block rate"
              value={`${stats.funnel.payout_gate_block_rate}%`}
              sub={`${stats.funnel.payout_gate_failures} of ${stats.funnel.attempted} attempts turned away`}
              accent={stats.funnel.payout_gate_block_rate >= 20}
            />
            <Stat
              label="Sponsored requests"
              value={stats.funnel.sponsored.requested}
              sub={`${stats.funnel.sponsored.approval_rate}% approved by owners`}
            />
            <Stat
              label="Community boosts (30d)"
              value={stats.boosts.counted}
              sub={`${stats.boosts.suppressed} suppressed · ${stats.boosts.revoked} revoked`}
            />
            <Stat
              label="Boost suppression rate"
              value={`${stats.boosts.suppression_rate}%`}
              sub="high + rising can indicate boost farming"
              accent={stats.boosts.suppression_rate >= 40}
            />
          </div>

          {stats.funnel.failures_by_reason.length > 0 && (
            <div className={s.tableWrap} style={{ marginBottom: 20 }}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Failure reason (30d)</th>
                    <th>Count</th>
                    <th>Payout gate?</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.funnel.failures_by_reason.map((f) => (
                    <tr key={f.reason_code}>
                      <td>{f.reason_code}</td>
                      <td>{f.count}</td>
                      <td>
                        {f.payout_gate ? (
                          <Badge status="flagged" label="Payout gate" />
                        ) : (
                          <span className={s.muted}>No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className={s.toolbar}>
        <select
          className={s.select}
          value={status}
          aria-label="Filter by status"
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
        >
          {STATUSES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className={s.select}
          value={initiatorType}
          aria-label="Filter by initiator"
          onChange={(e) => {
            setInitiatorType(e.target.value)
            setPage(1)
          }}
        >
          {INITIATORS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <Loading />}

      {isError && !status403 && (
        <>
          <ErrorBlock message="Failed to load the upgrade history." />
          <button className={`${s.btn} ${s.btnPrimary}`} disabled={isFetching} onClick={() => refetch()}>
            {isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </>
      )}

      {data &&
        (data.upgrades.length === 0 ? (
          <Empty text="No upgrades match this filter." />
        ) : (
          <>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Owner</th>
                    <th>Initiated by</th>
                    <th>Status</th>
                    <th>Payout at decision</th>
                    <th>Note / reason</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {data.upgrades.map((u) => (
                    <tr key={u._id}>
                      <td>
                        {u.campaign_ref ? (
                          <Link href={`/campaigns/${u.campaign_ref}`} target="_blank">
                            <strong>{u.campaign_title || u.campaign_ref}</strong>
                          </Link>
                        ) : (
                          <strong>{u.campaign_title || '—'}</strong>
                        )}
                        <div className={s.muted}>{u.campaign_ref}</div>
                      </td>
                      <td>
                        {actorName(u.owner_id)}
                        <div className={s.muted}>{actorEmail(u.owner_id)}</div>
                      </td>
                      <td>
                        {actorName(u.initiated_by)}
                        <div className={s.muted}>{u.initiator_type}</div>
                      </td>
                      <td>
                        <Badge
                          status={BADGE_STATUS[u.status] || 'pending'}
                          label={STATUS_LABEL[u.status] || u.status}
                        />
                        {u.status === 'pending_owner_approval' && u.expires_at && (
                          <div className={s.muted}>Expires {fmtDate(u.expires_at)}</div>
                        )}
                      </td>
                      <td className={s.muted}>{u.payout_readiness?.readiness_level || '—'}</td>
                      <td className={s.muted}>
                        {u.admin_note || u.rejection_reason || u.reason || '—'}
                      </td>
                      <td className={s.muted}>
                        {fmtDate(u.created_at)}
                        {u.completed_at && <div>Done {fmtDate(u.completed_at)}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              total={data.pagination.total}
              onChange={setPage}
            />
          </>
        ))}
    </div>
  )
}
