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

const STATUSES = ['pending', 'flagged', 'escalated', 'approved', 'rejected', 'all']
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
        subtitle="Review, approve, flag or reject campaigns"
        actions={
          <Link className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} href="/admin/moderation/campaign-upgrades">
            Upgrade history
          </Link>
        }
      />

      <div className={s.toolbar}>
        <select className={s.select} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          {STATUSES.map((st) => <option key={st} value={st}>{st === 'all' ? 'All statuses' : st}</option>)}
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
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Campaign</th><th>Creator</th><th>Type</th><th>Review</th><th>Reports</th><th>Risk</th><th>Created</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((c: ModerationCampaign) => (
                  <tr key={c._id}>
                    <td>
                      <strong>{c.title}</strong>
                      <div className={s.muted}>{c.campaign_id}</div>
                    </td>
                    <td>
                      {c.creator_id?.display_name || '—'}
                      <div className={s.muted}>{c.creator_id?.email}</div>
                    </td>
                    <td>
                      {c.campaign_type === 'sharing' ? (
                        <Badge status="approved" label="Share" />
                      ) : (
                        <span className={s.muted}>Free</span>
                      )}
                      {c.upgrade_meta?.upgrade_initiator_type && (
                        <div className={s.muted}>via {c.upgrade_meta.upgrade_initiator_type}</div>
                      )}
                    </td>
                    <td><Badge status={c.moderation?.review_status} /></td>
                    <td>{fmtNum(c.moderation?.report_count)}</td>
                    <td>{c.moderation?.risk_score != null ? c.moderation.risk_score : '—'}</td>
                    <td className={s.muted}>{fmtDate(c.created_at)}</td>
                    <td>
                      <div className={s.row}>
                        <button className={`${s.btn} ${s.btnSuccess} ${s.btnSm}`} disabled={moderate.isPending} onClick={() => decide(c._id, 'approve')}>Approve</button>
                        <button className={`${s.btn} ${s.btnDanger} ${s.btnSm}`} onClick={() => setModal({ id: c._id, decision: 'reject' })}>Reject</button>
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
          title={modal.decision === 'reject' ? 'Reject campaign' : modal.decision === 'flag' ? 'Flag campaign' : 'Escalate campaign'}
          label={modal.decision === 'reject' ? 'Rejection reason (required)' : 'Reason / notes'}
          required={modal.decision === 'reject'}
          danger={modal.decision === 'reject'}
          confirmLabel={modal.decision.charAt(0).toUpperCase() + modal.decision.slice(1)}
          onConfirm={(reason) => decide(modal.id, modal.decision, reason)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
