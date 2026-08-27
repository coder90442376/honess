'use client'

/**
 * Admin: upgrade a Free Campaign to a Share Campaign.
 *
 * The modal loads its own context so the admin sees who owns the campaign,
 * whether that owner can actually be paid, and every blocker BEFORE acting —
 * rather than discovering a refusal on submit.
 *
 * Two rules this UI has to make visible, because they surprise people:
 *
 *  1. There is no admin override of the payout requirement. If the OWNER has no
 *     usable payout method, the action is disabled. Upgrading anyway would
 *     create a Share Campaign whose owner cannot pay the sharers it promises —
 *     the exact broken state this feature exists to prevent, except with
 *     HonestNeed's own fingerprints on it.
 *
 *  2. The upgrade does NOT switch paid sharing on. Only the owner can accept
 *     the obligation to pay sharers directly, so the campaign becomes a Share
 *     Campaign with sharing paused and the owner is notified to review it.
 *
 * The admin note is mandatory (min 10 chars, enforced server-side too) because
 * it lands in the audit trail.
 *
 * The server remains the authority throughout: `can_upgrade` only decides what
 * this dialog *offers*, and a submit that races a change is surfaced inline
 * rather than swallowed.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useCampaignUpgradeContext, useAdminUpgradeCampaign } from '@/api/hooks/useAdmin'
import type { CampaignUpgradeContext } from '@/api/services/adminService'
import { Loading, ErrorBlock, Badge, adminStyles as s } from '../_components/ui'
import { fmtDate } from '../_lib/format'

const MIN_NOTE = 10

const READINESS_LABEL: Record<string, string> = {
  verified: 'Verified',
  provisional: 'Provisional',
  none: 'None',
}

/** Server error codes worth explaining in the admin's own terms. */
const CODE_HELP: Record<string, string> = {
  OWNER_PAYOUT_NOT_READY:
    'The owner has no usable payout method. There is no override for this — ask them to add one first.',
  ALREADY_SHARE_CAMPAIGN: 'This campaign has already been upgraded.',
  CAMPAIGN_STATUS_INELIGIBLE: 'This campaign is in a status that cannot be upgraded.',
  CAMPAIGN_NOT_ELIGIBLE: 'This campaign is not eligible — it may be under review.',
  ADMIN_NOTE_REQUIRED: 'An admin note of at least 10 characters is required.',
  INVALID_SHARE_CONFIG: 'Check the reward amounts — the budget must cover at least one reward.',
}

function money(n: number) {
  return `$${n.toFixed(2)}`
}

export default function UpgradeCampaignModal({
  campaignId,
  onClose,
}: {
  campaignId: string
  onClose: () => void
}) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  const { data, isLoading, isError, refetch, isFetching } = useCampaignUpgradeContext(campaignId)
  const upgrade = useAdminUpgradeCampaign()

  const [budget, setBudget] = useState('')
  const [reward, setReward] = useState('')
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)
  const [done, setDone] = useState(false)

  // One key per mounted dialog, reused across retries so a lost response cannot
  // upgrade twice. Rotating it on retry would defeat the whole guarantee.
  const idempotencyKey = useMemo(
    () =>
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    []
  )

  // Restore focus to the row button that opened this dialog.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement
    return () => previouslyFocused.current?.focus()
  }, [])

  useEffect(() => {
    if (!isLoading && dialogRef.current) {
      dialogRef.current.querySelector<HTMLElement>('input, textarea, button')?.focus()
    }
  }, [isLoading])

  // ESC to close, plus a focus trap across the dialog's tabbables.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        if (!upgrade.isPending) onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, upgrade.isPending])

  const ctx = data as CampaignUpgradeContext | undefined

  const budgetValue = Number(budget)
  const rewardValue = Number(reward)

  const amountError = (() => {
    if (!budget && !reward) return null
    if (!Number.isFinite(rewardValue) || rewardValue <= 0) return 'Reward per share must be above $0.'
    if (!Number.isFinite(budgetValue) || budgetValue <= 0) return 'Budget must be above $0.'
    if (budgetValue < rewardValue) return 'The budget must cover at least one reward.'
    return null
  })()

  const amountsValid = !!budget && !!reward && !amountError
  const noteValid = note.trim().length >= MIN_NOTE
  const canSubmit = !!ctx?.can_upgrade && amountsValid && noteValid && !upgrade.isPending

  const sharesCovered = amountsValid ? Math.floor(budgetValue / rewardValue) : 0

  const serverError = upgrade.error as
    | { response?: { data?: { code?: string; message?: string } } }
    | null
  const serverCode = serverError?.response?.data?.code
  const serverMessage = serverError?.response?.data?.message

  // ── Success state ──────────────────────────────────────────────────────
  // Shown rather than closing straight away, because what happened is not what
  // an admin will assume: the campaign is upgraded but sharing is still off.
  if (done) {
    return (
      <div className={s.modalOverlay} onClick={onClose}>
        <div
          className={s.modal}
          style={{ maxWidth: 560 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          ref={dialogRef}
        >
          <h3 id={titleId}>Campaign upgraded</h3>
          <p>
            <strong>{ctx?.campaign.title}</strong> is now a Share Campaign.
          </p>
          <p className={s.muted}>
            Paid sharing is <strong>off</strong> until the owner accepts the agreement to pay
            sharers directly. They have been notified to review and activate it. This action is
            recorded in the audit log.
          </p>
          <div className={s.modalActions}>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={onClose} autoFocus>
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={s.modalOverlay} onClick={() => !upgrade.isPending && onClose()}>
      <div
        className={s.modal}
        style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
      >
        <h3 id={titleId}>Upgrade to Share Campaign</h3>

        {isLoading && <Loading text="Loading campaign context…" />}

        {isError && (
          <>
            <ErrorBlock message="Failed to load this campaign's upgrade context." />
            <div className={s.modalActions}>
              <button className={`${s.btn} ${s.btnGhost}`} onClick={onClose}>
                Close
              </button>
              <button
                className={`${s.btn} ${s.btnPrimary}`}
                disabled={isFetching}
                onClick={() => refetch()}
              >
                {isFetching ? 'Retrying…' : 'Retry'}
              </button>
            </div>
          </>
        )}

        {ctx && (
          <>
            <div className={s.tableWrap} style={{ marginBottom: 16 }}>
              <table className={s.table}>
                <tbody>
                  <tr>
                    <td><strong>Campaign</strong></td>
                    <td>
                      {ctx.campaign.title}
                      <div className={s.muted}>{ctx.campaign.campaign_id}</div>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Status</strong></td>
                    <td>
                      <Badge status={ctx.campaign.status} />{' '}
                      {ctx.campaign.review_status && <Badge status={ctx.campaign.review_status} />}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Current type</strong></td>
                    <td>
                      {ctx.campaign.campaign_type === 'sharing' ? 'Share Campaign' : 'Free Campaign'}
                      {ctx.campaign.original_campaign_type && (
                        <div className={s.muted}>
                          Originally {ctx.campaign.original_campaign_type}
                        </div>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Owner</strong></td>
                    <td>
                      {ctx.owner?.display_name || '—'}
                      <div className={s.muted}>{ctx.owner?.email}</div>
                      <div className={s.muted}>
                        Joined {ctx.owner ? fmtDate(ctx.owner.created_at) : '—'}
                        {ctx.owner?.identity_verified ? ' · ID verified' : ' · ID unverified'}
                        {ctx.owner?.trust_score != null ? ` · trust ${ctx.owner.trust_score}` : ''}
                        {ctx.owner?.blocked ? ' · BLOCKED' : ''}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Owner payout method</strong></td>
                    <td>
                      <Badge
                        status={ctx.payout_readiness.ready ? 'approved' : 'rejected'}
                        label={READINESS_LABEL[ctx.payout_readiness.level] || 'Unknown'}
                      />
                      {ctx.payout_readiness.method ? (
                        <div className={s.muted}>
                          {ctx.payout_readiness.method.type}
                          {ctx.payout_readiness.method.last_four
                            ? ` •••• ${ctx.payout_readiness.method.last_four}`
                            : ''}
                        </div>
                      ) : (
                        <div className={s.muted}>No usable payout method on file</div>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Risk</strong></td>
                    <td>
                      Score {ctx.risk.risk_score ?? '—'} · {ctx.risk.report_count} report
                      {ctx.risk.report_count === 1 ? '' : 's'}
                    </td>
                  </tr>
                  {ctx.upgrade_history.length > 0 && (
                    <tr>
                      <td><strong>Prior upgrades</strong></td>
                      <td className={s.muted}>
                        {ctx.upgrade_history.map((u) => (
                          <div key={u._id}>
                            {u.initiator_type} · {u.status} · {fmtDate(u.created_at)}
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {ctx.blockers.length > 0 && (
              <div role="alert" style={{ marginBottom: 16 }}>
                <ErrorBlock
                  message={`Cannot upgrade: ${ctx.blockers.map((b) => b.message).join(' ')}`}
                />
                {ctx.blockers.some((b) => b.code === 'OWNER_PAYOUT_NOT_READY') && (
                  <p className={s.muted}>{CODE_HELP.OWNER_PAYOUT_NOT_READY}</p>
                )}
              </div>
            )}

            {ctx.can_upgrade && (
              <p className={s.muted} style={{ marginBottom: 16 }}>
                Paid sharing will stay <strong>off</strong> until the owner accepts the agreement to
                pay sharers directly. They&apos;ll be notified to review and activate it.
              </p>
            )}

            <fieldset
              disabled={!ctx.can_upgrade || upgrade.isPending}
              style={{ border: 0, padding: 0, margin: 0 }}
            >
              <div className={s.row} style={{ gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
                <label style={{ flex: '1 1 180px' }}>
                  <div className={s.muted}>Reward per share (USD)</div>
                  <input
                    className={s.select}
                    style={{ width: '100%' }}
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={reward}
                    onBlur={() => setTouched(true)}
                    onChange={(e) => setReward(e.target.value)}
                    aria-invalid={!!amountError}
                    aria-describedby="upgrade-amounts-hint"
                  />
                </label>
                <label style={{ flex: '1 1 180px' }}>
                  <div className={s.muted}>Total reward budget (USD)</div>
                  <input
                    className={s.select}
                    style={{ width: '100%' }}
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={budget}
                    onBlur={() => setTouched(true)}
                    onChange={(e) => setBudget(e.target.value)}
                    aria-invalid={!!amountError}
                    aria-describedby="upgrade-amounts-hint"
                  />
                </label>
              </div>

              <div id="upgrade-amounts-hint" className={s.muted} style={{ marginBottom: 12 }}>
                {amountError
                  ? amountError
                  : amountsValid
                    ? `${money(budgetValue)} covers about ${sharesCovered} reward${
                        sharesCovered === 1 ? '' : 's'
                      } of ${money(rewardValue)}.`
                    : 'Set both amounts. The budget must cover at least one reward.'}
              </div>

              <textarea
                className={s.textarea}
                placeholder={`Why are you upgrading this campaign? (required, min ${MIN_NOTE} characters — recorded in the audit log)`}
                value={note}
                onBlur={() => setTouched(true)}
                onChange={(e) => setNote(e.target.value)}
                aria-invalid={touched && !noteValid}
                aria-describedby="upgrade-note-hint"
              />
              <div id="upgrade-note-hint" className={s.muted}>
                {note.trim().length > 0 && !noteValid
                  ? `Add at least ${MIN_NOTE - note.trim().length} more character${
                      MIN_NOTE - note.trim().length === 1 ? '' : 's'
                    }.`
                  : `${note.trim().length}/${MIN_NOTE} minimum · visible in the audit log`}
              </div>
            </fieldset>

            {serverError && (
              <div role="alert" style={{ marginTop: 12 }}>
                <ErrorBlock message={serverMessage || 'The upgrade could not be completed.'} />
                {serverCode && CODE_HELP[serverCode] && (
                  <p className={s.muted}>{CODE_HELP[serverCode]}</p>
                )}
              </div>
            )}
          </>
        )}

        {!isError && (
          <div className={s.modalActions}>
            <button
              className={`${s.btn} ${s.btnGhost}`}
              onClick={onClose}
              disabled={upgrade.isPending}
            >
              Cancel
            </button>
            <button
              className={`${s.btn} ${s.btnPrimary}`}
              disabled={!canSubmit}
              onClick={() =>
                upgrade.mutate(
                  {
                    id: campaignId,
                    budget: budgetValue,
                    reward_per_share: rewardValue,
                    admin_note: note.trim(),
                    idempotency_key: idempotencyKey,
                  },
                  { onSuccess: () => setDone(true) }
                )
              }
            >
              {upgrade.isPending ? 'Upgrading…' : 'Upgrade campaign'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
