'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCampaignQueue, useModerateCampaign, useAdminMe } from '@/api/hooks/useAdmin'
import type { ModerationCampaign } from '@/api/services/adminService'
import { PageHeader, Loading, ErrorBlock, Empty, Badge, Pagination, ReasonModal, adminStyles as s } from '../_components/ui'
import { fmtDate, fmtNum, hasPerm } from '../_lib/format'
import UpgradeCampaignModal from './UpgradeCampaignModal'
import SupportBoostsModal from './SupportBoostsModal'

export default function ModerationPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ModerationQueue />
    </Suspense>
  )
}

// The VALUES are the stored `moderation.review_status` and must not change —
// only how they're labelled. "approved" never gated publication, so calling it
// "Reviewed" describes what it actually records.
const STATUSES = [
  { value: 'pending', label: 'Unreviewed' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'approved', label: 'Reviewed' },
  { value: 'rejected', label: 'Taken down' },
  { value: 'all', label: 'All statuses' },
]

/** Same relabelling for the Review column badge. */
const REVIEW_LABEL: Record<string, string> = {
  pending: 'Unreviewed',
  approved: 'Reviewed',
  rejected: 'Taken down',
  flagged: 'Flagged',
  escalated: 'Escalated',
}
const SORTS = [
  { value: 'oldest', label: 'Oldest first' },
  { value: 'newest', label: 'Newest first' },
  { value: 'most_reported', label: 'Most reported' },
  { value: 'highest_risk', label: 'Highest risk' },
]

function ModerationQueue() {
  const initialStatus = useSearchParams().get('status') || 'pending'
  const [status, setStatus] = useState(initialStatus)
  const [sort, setSort] = useState('oldest')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<{ id: string; decision: 'reject' | 'flag' | 'escalate' } | null>(null)
  const [upgradeId, setUpgradeId] = useState<string | null>(null)
  const [boostsId, setBoostsId] = useState<string | null>(null)

  const { data: me } = useAdminMe()
  // Upgrading is an ACT-level action; a view-only admin must not be offered it.
  // The server enforces this too — this only keeps the UI honest.
  const canAct = hasPerm(me?.permissions, 'campaign_moderation:act')

  const { data, isLoading, isError } = useCampaignQueue({ status, sort, page, limit: 20 })
  const moderate = useModerateCampaign()

  const decide = (id: string, decision: string, reason?: string) => {
    moderate.mutate({ id, decision, reason }, { onSuccess: () => setModal(null) })
  }

  return (
    <div className={s.page}>
      <PageHeader
        title="Campaign Moderation Queue"
        subtitle="Campaigns are live as soon as their creator activates them — this is for spot-checks and takedowns, not approval"
        actions={
          <Link className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} href="/admin/moderation/campaign-upgrades">
            Upgrade history
          </Link>
        }
      />

      <div className={s.toolbar}>
        <select className={s.select} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          {STATUSES.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
        </select>
        <select className={s.select} value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {isLoading && <Loading />}
      {isError && <ErrorBlock message="Failed to load the moderation queue." />}

      {data && (data.campaigns.length === 0 ? (
        <Empty text="No campaigns match this filter." />
      ) : (
        <>
          {/* Card mode below 900px: an 8-column grid can't shrink to a phone
              without hiding the Actions column behind a horizontal scroll.
              Every <td> carries a data-label the CSS renders as its heading. */}
          <div className={`${s.tableWrap} ${s.cardTableWrap}`}>
            <table className={`${s.table} ${s.cardTable}`}>
              <thead>
                <tr>
                  <th>Campaign</th><th>Creator</th><th>Type</th><th>Review</th><th>Reports</th><th>Risk</th><th>Created</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((c: ModerationCampaign) => (
                  <tr key={c._id}>
                    <td data-label="Campaign">
                      <strong>{c.title}</strong>
                      <div className={s.muted}>{c.campaign_id}</div>
                    </td>
                    <td data-label="Creator">
                      {c.creator_id?.display_name || '—'}
                      <div className={s.muted}>{c.creator_id?.email}</div>
                    </td>
                    <td data-label="Type">
                      {c.campaign_type === 'sharing' ? (
                        <Badge status="approved" label="Share" />
                      ) : (
                        <span className={s.muted}>Free</span>
                      )}
                      {c.upgrade_meta?.upgrade_initiator_type && (
                        <div className={s.muted}>via {c.upgrade_meta.upgrade_initiator_type}</div>
                      )}
                    </td>
                    <td data-label="Review">
                      <Badge
                        status={c.moderation?.review_status}
                        label={REVIEW_LABEL[c.moderation?.review_status || 'pending']}
                      />
                    </td>
                    <td data-label="Reports">{fmtNum(c.moderation?.report_count)}</td>
                    <td data-label="Risk">{c.moderation?.risk_score != null ? c.moderation.risk_score : '—'}</td>
                    <td data-label="Created" className={s.muted}>{fmtDate(c.created_at)}</td>
                    <td data-label="Actions">
                      <div className={s.row}>
                        {/* "Mark reviewed" stamps moderation.review_status and clears
                            the row from the Unreviewed filter. It does NOT publish —
                            the campaign is already public. */}
                        <button
                          className={`${s.btn} ${s.btnSuccess} ${s.btnSm}`}
                          disabled={moderate.isPending}
                          onClick={() => decide(c._id, 'approve')}
                          title="Record that you've checked this campaign. Does not affect whether it's live."
                        >
                          Mark reviewed
                        </button>
                        {/* The only action here that removes a campaign from public
                            view — it sets status AND review_status to 'rejected'. */}
                        <button
                          className={`${s.btn} ${s.btnDanger} ${s.btnSm}`}
                          onClick={() => setModal({ id: c._id, decision: 'reject' })}
                          title="Remove this campaign from public view"
                        >
                          Take down
                        </button>
                        <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => setModal({ id: c._id, decision: 'flag' })}>Flag</button>
                        <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => setModal({ id: c._id, decision: 'escalate' })}>Escalate</button>
                        {/* Free → Share Campaign upgrade. Shown for every row;
                            the modal loads the owner's payout readiness and
                            disables itself with a reason when blocked. */}
                        {/* Inspect / revoke community boosts — the only lever
                            against boost farming. View-only admins can look. */}
                        <button
                          className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
                          onClick={() => setBoostsId(c._id)}
                          title="Inspect community boosts on this campaign"
                        >
                          Boosts
                        </button>
                        {canAct && c.campaign_type !== 'sharing' && (
                          <button
                            className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
                            onClick={() => setUpgradeId(c._id)}
                            title="Upgrade this Free Campaign to a Share Campaign"
                          >
                            Upgrade
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} total={data.pagination.total} onChange={setPage} />
        </>
      ))}

      {upgradeId && (
        <UpgradeCampaignModal campaignId={upgradeId} onClose={() => setUpgradeId(null)} />
      )}

      {boostsId && (
        <SupportBoostsModal campaignId={boostsId} onClose={() => setBoostsId(null)} />
      )}

      {modal && (
        <ReasonModal
          title={modal.decision === 'reject' ? 'Take down campaign' : modal.decision === 'flag' ? 'Flag campaign' : 'Escalate campaign'}
          label={
            modal.decision === 'reject'
              ? 'Why is this being taken down? (required — shown in the audit log)'
              : 'Reason / notes'
          }
          required={modal.decision === 'reject'}
          danger={modal.decision === 'reject'}
          confirmLabel={
            modal.decision === 'reject'
              ? 'Take down'
              : modal.decision.charAt(0).toUpperCase() + modal.decision.slice(1)
          }
          onConfirm={(reason) => decide(modal.id, modal.decision, reason)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
