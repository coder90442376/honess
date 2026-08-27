'use client'

/**
 * Upgrade to Share Campaign — confirmation modal.
 *
 * Explains what changes, collects the reward budget and per-share reward, and
 * captures the creator's explicit agreement to pay sharers directly. That
 * consent is a real obligation, not a formality, so it is an unticked checkbox
 * the creator must actively set — never a pre-checked default.
 *
 * Accessibility: focus trap, ESC to close, focus restored to the invoking
 * element, labelled dialog, reduced-motion respected.
 */

import { useEffect, useId, useRef, useState } from 'react'
import styled from 'styled-components'
import { X, Sparkles } from 'lucide-react'
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS } from '@/styles/tokens'
import type { UpgradeEligibility } from '@/services/campaignUpgradeService'
import PayoutMethodGate from './PayoutMethodGate'

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${SPACING[4]};
  background: ${COLORS.OVERLAY};
`

const Dialog = styled.div`
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  background: ${COLORS.SURFACE};
  border-radius: ${BORDER_RADIUS.XL};
  box-shadow: ${SHADOWS.XL};
  padding: ${SPACING[6]};

  /* Full-screen sheet on small screens. */
  @media (max-width: 640px) {
    max-width: 100%;
    max-height: 100vh;
    height: 100vh;
    border-radius: 0;
    padding: ${SPACING[5]} ${SPACING[4]};
  }
`

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${SPACING[3]};
  margin-bottom: ${SPACING[4]};
`

const Title = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: ${TYPOGRAPHY.WEIGHT_BOLD};
  color: ${COLORS.TEXT};
`

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  background: transparent;
  border-radius: ${BORDER_RADIUS.FULL};
  color: ${COLORS.MUTED_TEXT};
  cursor: pointer;

  &:hover {
    background: ${COLORS.DISABLED};
  }
  &:focus-visible {
    outline: 2px solid ${COLORS.PRIMARY};
    outline-offset: 2px;
  }
`

const Explainer = styled.ul`
  margin: 0 0 ${SPACING[5]};
  padding-left: ${SPACING[5]};
  display: flex;
  flex-direction: column;
  gap: ${SPACING[2]};
  font-size: 0.9375rem;
  line-height: 1.5;
  color: ${COLORS.MUTED_TEXT};
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING[1]};
  margin-bottom: ${SPACING[4]};
`

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: ${TYPOGRAPHY.WEIGHT_BOLD};
  color: ${COLORS.TEXT};
`

const Input = styled.input`
  min-height: 44px;
  padding: ${SPACING[2]} ${SPACING[3]};
  border: 1px solid ${COLORS.BORDER};
  border-radius: ${BORDER_RADIUS.MD};
  font-size: 1rem;
  color: ${COLORS.TEXT};

  &:focus-visible {
    outline: 2px solid ${COLORS.PRIMARY};
    outline-offset: 1px;
  }
  &:disabled {
    background: ${COLORS.DISABLED};
  }
`

const FieldHint = styled.span`
  font-size: 0.8125rem;
  color: ${COLORS.MUTED_TEXT};
`

const ConsentRow = styled.label`
  display: flex;
  gap: ${SPACING[3]};
  align-items: flex-start;
  padding: ${SPACING[3]};
  margin-bottom: ${SPACING[4]};
  border: 1px solid ${COLORS.BORDER};
  border-radius: ${BORDER_RADIUS.MD};
  font-size: 0.9375rem;
  line-height: 1.5;
  color: ${COLORS.TEXT};
  cursor: pointer;

  input {
    width: 20px;
    height: 20px;
    margin-top: 2px;
    flex-shrink: 0;
  }
`

const ErrorText = styled.p`
  margin: 0 0 ${SPACING[3]};
  font-size: 0.875rem;
  color: ${COLORS.ERROR_DARK};
`

const Actions = styled.div`
  display: flex;
  gap: ${SPACING[3]};
  justify-content: flex-end;

  @media (max-width: 640px) {
    flex-direction: column-reverse;
  }
`

const Secondary = styled.button`
  min-height: 44px;
  padding: ${SPACING[2]} ${SPACING[5]};
  border-radius: ${BORDER_RADIUS.FULL};
  border: 1px solid ${COLORS.BORDER};
  background: ${COLORS.SURFACE};
  color: ${COLORS.TEXT};
  font-weight: ${TYPOGRAPHY.WEIGHT_MEDIUM};
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${COLORS.PRIMARY};
    outline-offset: 2px;
  }
`

const Primary = styled.button`
  min-height: 44px;
  padding: ${SPACING[2]} ${SPACING[5]};
  border-radius: ${BORDER_RADIUS.FULL};
  border: none;
  background: ${COLORS.PRIMARY};
  color: ${COLORS.SURFACE};
  font-weight: ${TYPOGRAPHY.WEIGHT_BOLD};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${COLORS.PRIMARY_DARK};
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 2px solid ${COLORS.PRIMARY_DARK};
    outline-offset: 2px;
  }
`

export interface UpgradeModalProps {
  eligibility: UpgradeEligibility
  returnTo: string
  isSubmitting: boolean
  errorMessage?: string | null
  onClose: () => void
  onConfirm: (payload: {
    budget: number
    reward_per_share: number
    payout_consent: boolean
    payment_method_id?: string | null
  }) => void
}

export function UpgradeModal({
  eligibility,
  returnTo,
  isSubmitting,
  errorMessage,
  onClose,
  onConfirm,
}: UpgradeModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  const [budget, setBudget] = useState('')
  const [rewardPerShare, setRewardPerShare] = useState('')
  const [consent, setConsent] = useState(false)

  // Restore focus to whatever opened the dialog when it closes.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement
    dialogRef.current?.querySelector<HTMLElement>('input, button')?.focus()
    return () => previouslyFocused.current?.focus()
  }, [])

  // ESC to close, and a simple focus trap across the dialog's tabbables.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
  }, [onClose])

  const budgetValue = Number(budget)
  const rewardValue = Number(rewardPerShare)
  const readiness = eligibility.payout_readiness

  const amountsValid =
    Number.isFinite(budgetValue) &&
    Number.isFinite(rewardValue) &&
    budgetValue > 0 &&
    rewardValue > 0 &&
    budgetValue >= rewardValue

  const canSubmit = amountsValid && consent && readiness.ready && !isSubmitting

  const sharesCovered = amountsValid ? Math.floor(budgetValue / rewardValue) : 0

  return (
    <Overlay
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <Dialog ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <Header>
          <Title id={titleId}>
            <Sparkles size={18} aria-hidden="true" /> Upgrade to a Share Campaign
          </Title>
          <CloseButton type="button" onClick={onClose} aria-label="Close">
            <X size={20} aria-hidden="true" />
          </CloseButton>
        </Header>

        <Explainer>
          <li>Supporters earn a reward each time their share brings someone in.</li>
          <li>
            Your campaign keeps everything it has now — the same page, story, photos, donations and
            supporters.
          </li>
          <li>
            <strong>You pay sharers directly.</strong> HonestNeed tracks who earned what and never
            holds your money.
          </li>
          <li>This change is permanent, though you can pause paid sharing at any time.</li>
        </Explainer>

        {!readiness.ready && (
          <div style={{ marginBottom: 16 }}>
            <PayoutMethodGate level={readiness.level} method={readiness.method} returnTo={returnTo} />
          </div>
        )}

        {readiness.ready && readiness.level === 'provisional' && (
          <div style={{ marginBottom: 16 }}>
            <PayoutMethodGate level="provisional" method={readiness.method} returnTo={returnTo} />
          </div>
        )}

        <Field>
          <Label htmlFor="upgrade-reward">Reward per share (USD)</Label>
          <Input
            id="upgrade-reward"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={rewardPerShare}
            disabled={isSubmitting}
            onChange={(e) => setRewardPerShare(e.target.value)}
            aria-describedby="upgrade-reward-hint"
          />
          <FieldHint id="upgrade-reward-hint">What one qualifying share earns.</FieldHint>
        </Field>

        <Field>
          <Label htmlFor="upgrade-budget">Total reward budget (USD)</Label>
          <Input
            id="upgrade-budget"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={budget}
            disabled={isSubmitting}
            onChange={(e) => setBudget(e.target.value)}
            aria-describedby="upgrade-budget-hint"
          />
          <FieldHint id="upgrade-budget-hint">
            {amountsValid
              ? `Covers about ${sharesCovered} reward${sharesCovered === 1 ? '' : 's'}.`
              : 'Must cover at least one reward.'}
          </FieldHint>
        </Field>

        <ConsentRow htmlFor="upgrade-consent">
          <input
            id="upgrade-consent"
            type="checkbox"
            checked={consent}
            disabled={isSubmitting}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            I understand that I pay these rewards directly to sharers, and that HonestNeed only
            keeps track of who has earned and who has been paid.
          </span>
        </ConsentRow>

        {errorMessage && <ErrorText role="alert">{errorMessage}</ErrorText>}

        <Actions>
          <Secondary type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Secondary>
          <Primary
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              onConfirm({
                budget: budgetValue,
                reward_per_share: rewardValue,
                payout_consent: consent,
                payment_method_id: readiness.method?.id ?? null,
              })
            }
          >
            {isSubmitting ? 'Upgrading…' : 'Upgrade my campaign'}
          </Primary>
        </Actions>
      </Dialog>
    </Overlay>
  )
}

export default UpgradeModal
