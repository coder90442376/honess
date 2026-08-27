'use client'

import React, { useState, useCallback, Suspense } from 'react'
import styled, { keyframes, createGlobalStyle } from 'styled-components'
import { AlertCircle, CheckCircle2, Loader2, CreditCard, ArrowLeft, Info } from 'lucide-react'
import { PaymentMethodManager } from '@/components/campaign/PaymentMethodManager'
import { AddPaymentMethodModal } from '@/components/campaign/AddPaymentMethodModal'
import { PaymentMethod } from '@/components/campaign/AddPaymentMethodForm'
import {
  usePaymentMethods,
  useAddPaymentMethod,
  useUpdatePaymentMethod,
  useDeletePaymentMethod,
  useSetPrimaryPaymentMethod,
} from '@/api/hooks/usePaymentMethods'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── Fonts & Global ───────────────────────────────────────────────────────────

const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; -webkit-font-smoothing: antialiased; }
`

// ─── Design Tokens (shared with /dashboard) ───────────────────────────────────

const tk = {
  ink:         '#18171A',
  inkLight:    '#242228',
  inkMid:      '#302E35',
  inkBorder:   '#3D3A44',
  canvas:      '#F7F5F1',
  canvasDeep:  '#EEEBe5',
  border:      '#E2DDD6',
  white:       '#FFFFFF',
  offWhite:    '#F0EDE8',
  muted:       '#8C8790',
  body:        '#4A4750',
  heading:     '#18171A',
  amber:       '#D4870A',
  amberLight:  '#FBF3E0',
  amberMid:    '#F5C961',
  amberDark:   '#A8680A',
  green:       '#1A7A4A',
  greenLight:  '#E8F5EE',
  red:         '#C0392B',
  redLight:    '#FBE9E7',
  blue:        '#1A5FA8',
  blueLight:   '#E8F0FB',
}

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
`

const spin = keyframes`
  to { transform: rotate(360deg); }
`

const shimmer = keyframes`
  0%   { background-position: -600px 0; }
  100% { background-position: 600px 0; }
`

// ─── Page Shell ───────────────────────────────────────────────────────────────

const Page = styled.div`
  min-height: 100vh;
  background: ${tk.canvas};
  font-family: 'DM Sans', sans-serif;
  color: ${tk.body};
  display: flex;
  flex-direction: column;
`

// ─── Top Bar ──────────────────────────────────────────────────────────────────

const TopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(247, 245, 241, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 2px solid ${tk.blue};
  padding: 0 clamp(1rem, 3vw, 2rem);
  height: 60px;
  display: flex;
  align-items: center;
  gap: 1rem;
`

const BackBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${tk.body};
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  transition: background 140ms, color 140ms;

  svg { width: 17px; height: 17px; }

  &:hover { background: ${tk.canvasDeep}; color: ${tk.heading}; }
`

const TopBarTitle = styled.span`
  font-family: 'Syne', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: ${tk.heading};
`

// ─── Page Body ────────────────────────────────────────────────────────────────

const PageBody = styled.main`
  width: 100%;
  max-width: 880px;
  margin: 0 auto;
  padding: clamp(1.25rem, 3vw, 2rem) clamp(1rem, 3vw, 2rem) 4rem;
  flex: 1;
`

// ─── Page Header ──────────────────────────────────────────────────────────────

const PageHeader = styled.div`
  margin-bottom: 1.75rem;
  animation: ${fadeUp} 0.4s ease both;
`

const Greeting = styled.div`
  font-family: 'DM Mono', monospace;
  font-size: 0.72rem;
  font-weight: 400;
  color: ${tk.muted};
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin-bottom: 4px;
`

const PageTitle = styled.h1`
  font-family: 'Syne', sans-serif;
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 800;
  background: linear-gradient(135deg, ${tk.heading} 0%, ${tk.blue} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  line-height: 1.1;
  letter-spacing: -0.5px;
`

const PageSub = styled.p`
  font-size: 0.9rem;
  color: ${tk.muted};
  margin: 10px 0 0;
  line-height: 1.55;
  max-width: 56ch;
`

// ─── Toast / Alert ────────────────────────────────────────────────────────────

const Toast = styled.div<{ $type: 'error' | 'success' | 'info' }>`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1.125rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  animation: ${fadeUp} 0.25s ease both;
  border: 1px solid transparent;

  svg { width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; }

  ${p => p.$type === 'success' && `
    background: ${tk.greenLight};
    border-color: rgba(26,122,74,0.2);
    color: ${tk.green};
  `}
  ${p => p.$type === 'error' && `
    background: ${tk.redLight};
    border-color: rgba(192,57,43,0.2);
    color: ${tk.red};
  `}
  ${p => p.$type === 'info' && `
    background: ${tk.blueLight};
    border-color: rgba(26,95,168,0.2);
    color: ${tk.blue};
  `}
`

const ToastText = styled.div`
  font-size: 0.875rem;
  line-height: 1.5;
  font-weight: 500;
`

// ─── Content Card ─────────────────────────────────────────────────────────────

const Card = styled.div`
  background: ${tk.white};
  border-radius: 14px;
  border: 1px solid ${tk.border};
  padding: 1.5rem;
  margin-bottom: 1.25rem;
  transition: border-color 200ms, box-shadow 200ms;

  &:hover {
    border-color: ${tk.blue};
    box-shadow: 0 2px 8px rgba(26, 95, 168, 0.08);
  }

  @media (max-width: 480px) {
    padding: 1.125rem;
  }
`

// ─── Loading skeleton ─────────────────────────────────────────────────────────

const SkeletonRow = styled.div`
  height: 140px;
  border-radius: 14px;
  background: linear-gradient(90deg, ${tk.canvasDeep} 25%, ${tk.border} 50%, ${tk.canvasDeep} 75%);
  background-size: 600px 100%;
  animation: ${shimmer} 1.4s infinite linear;
  margin-bottom: 0.75rem;
`

const LoadingWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`

const LoadingSpinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2.5rem 1rem;
  color: ${tk.muted};
  font-size: 0.9rem;
  font-weight: 500;

  svg {
    width: 20px;
    height: 20px;
    color: ${tk.amber};
    animation: ${spin} 0.75s linear infinite;
  }
`

// ─── Info Box ─────────────────────────────────────────────────────────────────

const InfoBox = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 1rem 1.25rem;
  background: ${tk.amberLight};
  border: 1px solid rgba(212,135,10,0.25);
  border-radius: 14px;

  svg { width: 18px; height: 18px; color: ${tk.amber}; flex-shrink: 0; margin-top: 1px; }
`

const InfoText = styled.div`
  font-size: 0.84rem;
  color: ${tk.amberDark};
  line-height: 1.55;
  font-weight: 500;

  strong { color: ${tk.ink}; }
`

// ─── Stats strip ──────────────────────────────────────────────────────────────

const StatsStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.25rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
`

const StatCard = styled.div`
  background: ${tk.white};
  border: 1px solid ${tk.border};
  border-radius: 14px;
  padding: 1rem 1.25rem;
  animation: ${fadeUp} 0.5s ease both;
  transition: box-shadow 180ms, border-color 180ms;

  &:hover {
    border-color: ${tk.blue};
    box-shadow: 0 4px 16px rgba(26, 95, 168, 0.12);
  }

  p.label {
    font-size: 0.72rem;
    font-weight: 500;
    color: ${tk.muted};
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin: 0 0 0.4rem;
  }

  p.value {
    font-family: 'Syne', sans-serif;
    font-size: 1.4rem;
    font-weight: 800;
    color: ${tk.heading};
    line-height: 1;
    margin: 0;
  }

  p.sub {
    font-family: 'DM Mono', monospace;
    font-size: 0.67rem;
    color: ${tk.muted};
    margin: 0.4rem 0 0;
  }
`

// ─── Page Component ───────────────────────────────────────────────────────────

/**
 * useSearchParams() must sit inside a Suspense boundary in the App Router, or
 * the whole route is forced into client-side rendering at build time. Same
 * wrapper pattern as the admin moderation page.
 */
export default function CreatorSettingsPage() {
  return (
    <Suspense fallback={null}>
      <CreatorSettingsContent />
    </Suspense>
  )
}

function CreatorSettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Callers that send a creator here to unblock themselves (e.g. the Share
  // Campaign upgrade gate) pass ?returnTo=. Honour it so "Back" returns them to
  // what they were doing instead of wherever history happens to point.
  // Only relative in-app paths are accepted — an absolute URL here would be an
  // open redirect.
  const rawReturnTo = searchParams.get('returnTo')
  const returnTo =
    rawReturnTo && rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//')
      ? rawReturnTo
      : null
  const goBack = useCallback(() => {
    if (returnTo) router.push(returnTo)
    else router.back()
  }, [returnTo, router])
  const [isModalOpen,   setIsModalOpen]   = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [successMsg,    setSuccessMsg]    = useState<string | null>(null)
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null)

  const {
    data: paymentMethods = [],
    isLoading: isLoadingMethods,
    error: methodsError,
  } = usePaymentMethods()

  const addPaymentMethod    = useAddPaymentMethod()
  const updatePaymentMethod = useUpdatePaymentMethod()
  const setAsPrimary        = useSetPrimaryPaymentMethod()
  const deletePaymentMethod = useDeletePaymentMethod()

  const flash = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 5000) }
    else                    { setErrorMsg(msg);   setTimeout(() => setErrorMsg(null),   5000) }
  }

  const handleAddMethod = useCallback(async (method: PaymentMethod) => {
    try {
      await addPaymentMethod.mutateAsync(method)
      flash('success', 'Payment method added successfully.')
      setEditingMethod(null)
      setIsModalOpen(false)

      // The creator was sent here mid-flow (e.g. blocked from upgrading to a
      // Share Campaign). They have what they came for — return them to it
      // rather than leaving them on a settings page wondering what happened.
      if (returnTo) {
        setTimeout(() => router.push(returnTo), 900)
      }
    } catch (err: any) {
      flash('error', err?.message || 'Failed to add payment method.')
    }
  }, [addPaymentMethod, returnTo, router])

  const handleEditMethod = useCallback(async (method: PaymentMethod) => {
    if (!editingMethod?.id) return
    try {
      await updatePaymentMethod.mutateAsync({ id: editingMethod.id, ...method })
      flash('success', 'Payment method updated successfully.')
      setEditingMethod(null)
      setIsModalOpen(false)
    } catch (err: any) {
      flash('error', err?.message || 'Failed to update payment method.')
    }
  }, [editingMethod, updatePaymentMethod])

  const handleSetPrimary = useCallback(async (methodId: string) => {
    try {
      await setAsPrimary.mutateAsync(methodId)
      flash('success', 'Primary payment method updated.')
    } catch (err: any) {
      flash('error', err?.message || 'Failed to set primary payment method.')
    }
  }, [setAsPrimary])

  const handleDeleteMethod = useCallback(async (methodId: string) => {
    if (!confirm('Remove this payment method? This action cannot be undone.')) return
    try {
      await deletePaymentMethod.mutateAsync(methodId)
      flash('success', 'Payment method removed.')
    } catch (err: any) {
      flash('error', err?.message || 'Failed to remove payment method.')
    }
  }, [deletePaymentMethod])

  const handleOpenAdd  = () => { setEditingMethod(null); setIsModalOpen(true) }
  const handleOpenEdit = (m: PaymentMethod) => { setEditingMethod(m); setIsModalOpen(true) }

  const primaryCount = paymentMethods.filter(m => m.isPrimary).length

  return (
    <>
      <GlobalStyle />
      <Page>
        {/* ── Top bar ── */}
        <TopBar>
          <BackBtn onClick={goBack} aria-label={returnTo ? 'Back to your campaign' : 'Go back'}>
            <ArrowLeft /> Back
          </BackBtn>
          <TopBarTitle>Payment Settings</TopBarTitle>
        </TopBar>

        <PageBody>
          {/* ── Header ── */}
          <PageHeader>
            <Greeting>Payout Settings</Greeting>
            <PageTitle>Payout Methods</PageTitle>
            <PageSub>
              Manage where you get paid. Campaign creators send your share-to-earn
              rewards directly to the method you set here.
            </PageSub>
          </PageHeader>

          {/* ── Toasts ── */}
          {successMsg && (
            <Toast $type="success">
              <CheckCircle2 />
              <ToastText>{successMsg}</ToastText>
            </Toast>
          )}
          {(errorMsg || methodsError) && (
            <Toast $type="error">
              <AlertCircle />
              <ToastText>
                {errorMsg || 'Failed to load payment methods. Please refresh the page.'}
              </ToastText>
            </Toast>
          )}

          {/* ── Stats strip ── */}
          {!isLoadingMethods && paymentMethods.length > 0 && (
            <StatsStrip>
              <StatCard>
                <p className="label">Total methods</p>
                <p className="value">{paymentMethods.length}</p>
                <p className="sub">Connected</p>
              </StatCard>
              <StatCard>
                <p className="label">Primary</p>
                <p className="value">{primaryCount > 0 ? '✓' : '—'}</p>
                <p className="sub">{primaryCount > 0 ? 'Set for payouts' : 'Not set yet'}</p>
              </StatCard>
              <StatCard>
                <p className="label">Security</p>
                <p className="value" style={{ fontSize: '1.1rem', paddingTop: '2px' }}>🔒</p>
                <p className="sub">Encrypted at rest</p>
              </StatCard>
            </StatsStrip>
          )}

          {/* ── Main card ── */}
          <Card>
            {isLoadingMethods ? (
              <LoadingWrap>
                <LoadingSpinner>
                  <Loader2 /> Loading payment methods…
                </LoadingSpinner>
                <SkeletonRow />
                <SkeletonRow style={{ opacity: 0.6 }} />
              </LoadingWrap>
            ) : (
              <PaymentMethodManager
                methods={paymentMethods}
                onSetPrimary={handleSetPrimary}
                onEdit={handleOpenEdit}
                onAdd={handleOpenAdd}
                onDelete={handleDeleteMethod}
                isLoading={setAsPrimary.isPending}
              />
            )}
          </Card>

          {/* ── Info box ── */}
          <InfoBox>
            <Info />
            <InfoText>
              <strong>How payouts work:</strong> HonestNeed never holds your money. When you
              request a payout, each campaign&apos;s creator pays you directly to the method you
              choose. Set a <strong>primary</strong> method and we&apos;ll preselect it on your
              next request — you can add several methods and switch anytime.
            </InfoText>
          </InfoBox>
        </PageBody>

        {/* ── Modal ── */}
        <AddPaymentMethodModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingMethod(null) }}
          onSubmit={editingMethod ? handleEditMethod : handleAddMethod}
          isLoading={editingMethod ? updatePaymentMethod.isPending : addPaymentMethod.isPending}
          initialMethod={editingMethod || undefined}
          isEditing={!!editingMethod}
        />
      </Page>
    </>
  )
}
