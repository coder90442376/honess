'use client'

/**
 * Admin: inspect and revoke a campaign's COMMUNITY (peer) boosts.
 *
 * ⚠️ These are `CampaignSupportBoost` records — free peer boosts — not the
 * creator's paid Stripe "Promote" purchase. Revoking one here strips its
 * ranking contribution and recomputes the campaign's community score
 * immediately, so a farmed campaign stops benefiting the moment an admin acts
 * rather than at the next nightly decay run.
 *
 * What to look for when judging a boost ring:
 *   - a cluster of boosts sharing one `ip_hash`
 *   - many boosts from accounts created the same day (trust weight 0)
 *   - a score that looks high relative to the count of distinct boosters
 *
 * Boosts already suppressed (trust weight 0) contribute nothing to ranking, so
 * revoking them changes no score — they are shown for pattern-spotting, and
 * their Revoke action is disabled to make that explicit.
 */

import { useState } from 'react'
import { useCampaignSupportBoosts, useRevokeSupportBoost } from '@/api/hooks/useAdmin'
import type { SupportBoostRecord } from '@/api/services/adminService'
import { Loading, ErrorBlock, Empty, Badge, Pagination, adminStyles as s } from '../_components/ui'
import { fmtDate } from '../_lib/format'

const MIN_REASON = 5

function boosterName(b: SupportBoostRecord['booster_id']): string {
  if (!b) return '—'
  if (typeof b === 'string') return b
  return b.display_name || b.email || b._id
}

function boosterEmail(b: SupportBoostRecord['booster_id']): string | null {
  if (!b || typeof b === 'string') return null
  return b.email || null
}

export default function SupportBoostsModal({
  campaignId,
  onClose,
}: {
  campaignId: string
  onClose: () => void
}) {
  const [page, setPage] = useState(1)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const { data, isLoading, isError } = useCampaignSupportBoosts(campaignId, { page, limit: 25 })
  const revoke = useRevokeSupportBoost()

  const reasonValid = reason.trim().length >= MIN_REASON

  return (
    <div className={s.modalOverlay} onClick={() => !revoke.isPending && onClose()}>
      <div
        className={s.modal}
        style={{ maxWidth: 860, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Community boosts on this campaign"
      >
        <h3>Community boosts</h3>

        {isLoading && <Loading />}
        {isError && <ErrorBlock message="Failed to load this campaign's community boosts." />}

        {data && (
          <>
            <p className={s.muted}>
              <strong>{data.campaign.title}</strong> · score{' '}
              {data.campaign.community_boost_score} from {data.campaign.community_boost_count}{' '}
              counted booster{data.campaign.community_boost_count === 1 ? '' : 's'} ·{' '}
              {data.pagination.total} record{data.pagination.total === 1 ? '' : 's'} total
            </p>

            {data.boosts.length === 0 ? (
              <Empty text="This campaign has no community boosts." />
            ) : (
              <>
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>Booster</th>
                        <th>Counts</th>
                        <th>Trust</th>
                        <th>Day</th>
                        <th>IP cluster</th>
                        <th>When</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.boosts.map((b) => {
                        const isRevoked = !!b.revoked_at
                        // Revoking a boost that already contributes nothing
                        // would change no score — disable rather than mislead.
                        const canRevoke = !isRevoked && b.counts_toward_score
                        return (
                          <tr key={b._id}>
                            <td>
                              {boosterName(b.booster_id)}
                              <div className={s.muted}>{boosterEmail(b.booster_id)}</div>
                            </td>
                            <td>
                              {isRevoked ? (
                                <Badge status="rejected" label="Revoked" />
                              ) : b.counts_toward_score ? (
                                <Badge status="approved" label="Counted" />
                              ) : (
                                <Badge
                                  status="flagged"
                                  label={b.suppressed_reason || 'Suppressed'}
                                />
                              )}
                            </td>
                            <td className={s.muted}>{b.trust_weight}</td>
                            <td className={s.muted}>{b.boost_day}</td>
                            <td className={s.muted} title={b.ip_hash || undefined}>
                              {b.ip_hash ? b.ip_hash.slice(0, 8) : '—'}
                            </td>
                            <td className={s.muted}>{fmtDate(b.created_at)}</td>
                            <td>
                              {canRevoke ? (
                                <button
                                  className={`${s.btn} ${s.btnDanger} ${s.btnSm}`}
                                  onClick={() => {
                                    setRevoking(b._id)
                                    setReason('')
                                  }}
                                >
                                  Revoke
                                </button>
                              ) : (
                                <span className={s.muted}>
                                  {isRevoked ? b.revoked_reason || 'Revoked' : 'No score effect'}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
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
            )}

            {revoking && (
              <div style={{ marginTop: 16 }}>
                <h3>Revoke this boost</h3>
                <p className={s.muted}>
                  This removes the boost&apos;s ranking contribution and recomputes the
                  campaign&apos;s score straight away. The reason is recorded in the audit log.
                </p>
                <textarea
                  className={s.textarea}
                  placeholder="Why is this boost being revoked? (required)"
                  value={reason}
                  disabled={revoke.isPending}
                  onChange={(e) => setReason(e.target.value)}
                  aria-invalid={reason.length > 0 && !reasonValid}
                />
                <div className={s.modalActions}>
                  <button
                    className={`${s.btn} ${s.btnGhost}`}
                    onClick={() => setRevoking(null)}
                    disabled={revoke.isPending}
                  >
                    Cancel
                  </button>
                  <button
                    className={`${s.btn} ${s.btnDanger}`}
                    disabled={!reasonValid || revoke.isPending}
                    onClick={() =>
                      revoke.mutate(
                        { boostId: revoking, reason: reason.trim() },
                        { onSuccess: () => setRevoking(null) }
                      )
                    }
                  >
                    {revoke.isPending ? 'Revoking…' : 'Revoke boost'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {!revoking && (
          <div className={s.modalActions}>
            <button className={`${s.btn} ${s.btnGhost}`} onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
