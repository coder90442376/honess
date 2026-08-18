'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { FiMenu, FiX, FiHeart, FiUsers, FiArrowRight, FiChevronDown, FiLogIn, FiLogOut, FiGrid } from 'react-icons/fi';
import { useAuthStore } from '@/store/authStore';

// ─── Keyframes ────────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
`;

const pulseRing = keyframes`
  0%   { transform: scale(1);   opacity: 0.4; }
  70%  { transform: scale(1.5); opacity: 0;   }
  100% { transform: scale(1.5); opacity: 0;   }
`;

const floatY = keyframes`
  0%, 100% { transform: translateY(0px);  }
  50%       { transform: translateY(-3px); }
`;

// ─── Header Wrapper ───────────────────────────────────────────────────────────

const HeaderWrapper = styled(motion.header)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 200;
  transition: background 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease;

  ${({ $scrolled }) =>
    $scrolled
      ? css`
          background: rgba(253, 252, 255, 0.88);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid rgba(226, 232, 240, 0.7);
          box-shadow: 0 4px 24px rgba(15, 23, 42, 0.07), 0 1px 4px rgba(15, 23, 42, 0.04);
        `
      : css`
          background: rgba(253, 252, 255, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(226, 232, 240, 0.3);
          box-shadow: none;
        `}
`;

const HeaderContainer = styled.div`
  max-width: 1360px;
  margin: 0 auto;
  padding: 0 20px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;

  @media (min-width: 1024px) {
    padding: 0 40px;
    height: 68px;
  }
`;

// ─── Logo ─────────────────────────────────────────────────────────────────────

const LogoLink = styled(motion.a)`
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  flex-shrink: 0;
`;

const LogoImg = styled.img`
  height: 38px;
  width: auto;
  display: block;

  @media (min-width: 1024px) {
    height: 42px;
  }
`;

const LogoWordmark = styled.div`
  display: none;

  @media (min-width: 480px) {
    display: flex;
    flex-direction: column;
    line-height: 1;
  }

  .name {
    font-family: 'Nunito', 'Poppins', sans-serif;
    font-size: 17px;
    font-weight: 900;
    letter-spacing: -0.03em;
    background: linear-gradient(135deg, #F59E0B 0%, #EF4444 50%, #EC4899 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: ${shimmer} 5s linear infinite;
  }

  .tagline {
    font-size: 9.5px;
    font-weight: 700;
    color: #94A3B8;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-top: 1px;
  }
`;

// ─── Desktop Nav ──────────────────────────────────────────────────────────────

const Nav = styled.nav`
  display: none;
  align-items: center;
  gap: 4px;

  @media (min-width: 1024px) {
    display: flex;
  }
`;

const NavLink = styled.a`
  position: relative;
  font-family: 'Nunito', 'Inter', sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: #475569;
  text-decoration: none;
  padding: 8px 14px;
  border-radius: 10px;
  transition: color 0.18s ease, background 0.18s ease;
  display: flex;
  align-items: center;
  gap: 5px;

  &:hover {
    color: #0F172A;
    background: rgba(15, 23, 42, 0.04);
  }

  /* Animated underline dot */
  &::after {
    content: '';
    position: absolute;
    bottom: 4px;
    left: 50%;
    transform: translateX(-50%) scaleX(0);
    width: 20px;
    height: 2px;
    border-radius: 999px;
    background: linear-gradient(90deg, #F59E0B, #EF4444);
    transition: transform 0.22s cubic-bezier(0.2, 0.9, 0.2, 1);
  }

  &:hover::after {
    transform: translateX(-50%) scaleX(1);
  }
`;

// ─── Live Badge ───────────────────────────────────────────────────────────────

const LiveBadge = styled.div`
  display: none;
  align-items: center;
  gap: 7px;
  padding: 5px 12px 5px 8px;
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.22);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #15803D;
  white-space: nowrap;

  @media (min-width: 1024px) {
    display: flex;
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #22C55E;
    position: relative;
    flex-shrink: 0;

    &::after {
      content: '';
      position: absolute;
      inset: -3px;
      border-radius: 50%;
      border: 1.5px solid #22C55E;
      animation: ${pulseRing} 2s ease-out infinite;
    }
  }
`;

// ─── Desktop CTA ──────────────────────────────────────────────────────────────

const DesktopActions = styled.div`
  display: none;
  align-items: center;
  gap: 10px;

  @media (min-width: 1024px) {
    display: flex;
  }
`;

const SecondaryBtn = styled(motion.a)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #475569;
  text-decoration: none;
  border-radius: 11px;
  border: 1.5px solid #E2E8F0;
  background: transparent;
  transition: border-color 0.18s ease, color 0.18s ease, background 0.18s ease;

  &:hover {
    border-color: #94A3B8;
    color: #0F172A;
    background: rgba(15, 23, 42, 0.03);
    text-decoration: none;
  }
`;

const PrimaryBtn = styled(motion.a)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 800;
  color: white;
  text-decoration: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%);
  box-shadow: 0 3px 14px rgba(239, 68, 68, 0.30);
  letter-spacing: 0.01em;
  transition: box-shadow 0.2s ease;
  white-space: nowrap;

  .price {
    font-size: 11px;
    font-weight: 700;
    background: rgba(255,255,255,0.28);
    padding: 1px 7px;
    border-radius: 999px;
  }

  &:hover {
    color: white;
    text-decoration: none;
    box-shadow: 0 6px 22px rgba(239, 68, 68, 0.42);
  }
`;

// Same visual language as SecondaryBtn, but a real <button> for actions
// (log out) rather than a navigation link.
const SecondaryActionBtn = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  font-family: 'Nunito', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #475569;
  border: 1.5px solid #E2E8F0;
  background: transparent;
  border-radius: 11px;
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease, background 0.18s ease;

  &:hover {
    border-color: #94A3B8;
    color: #0F172A;
    background: rgba(15, 23, 42, 0.03);
  }
`;

// ─── Mobile Controls ──────────────────────────────────────────────────────────

const MobileControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  @media (min-width: 1024px) {
    display: none;
  }
`;

const MobilePrimaryBtn = styled(motion.a)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-family: 'Nunito', sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: white;
  text-decoration: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%);
  box-shadow: 0 2px 10px rgba(239, 68, 68, 0.28);
  white-space: nowrap;

  &:hover {
    color: white;
    text-decoration: none;
  }
`;

const HamburgerBtn = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1.5px solid #E2E8F0;
  background: rgba(255,255,255,0.8);
  color: #334155;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease;

  &:hover {
    border-color: #CBD5E1;
    background: #F8FAFC;
  }
`;

// ─── Mobile Drawer ────────────────────────────────────────────────────────────

const DrawerOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 300;
  backdrop-filter: blur(4px);
`;

const Drawer = styled(motion.div)`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(340px, 92vw);
  z-index: 310;
  background: rgba(253, 252, 255, 0.97);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-left: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: -20px 0 60px rgba(15, 23, 42, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  /* Top gradient accent */
  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, #F59E0B, #EF4444, #EC4899, #6366F1);
    z-index: 1;
  }
`;

const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px 16px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
`;

const DrawerCloseBtn = styled(motion.button)`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1.5px solid #E2E8F0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748B;
  cursor: pointer;
  transition: all 0.18s ease;

  &:hover {
    background: #F1F5F9;
    color: #0F172A;
  }
`;

const DrawerNavSection = styled.div`
  padding: 20px 22px 16px;
  flex: 1;
`;

const DrawerNavLabel = styled.div`
  font-size: 10.5px;
  font-weight: 700;
  color: #94A3B8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 10px;
`;

const DrawerNavItem = styled(motion.a)`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 14px;
  border-radius: 14px;
  text-decoration: none;
  margin-bottom: 4px;
  transition: background 0.18s ease;

  &:hover {
    background: rgba(15, 23, 42, 0.04);
    text-decoration: none;
  }

  .icon-wrap {
    width: 38px;
    height: 38px;
    border-radius: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
    background: ${({ $iconBg }) => $iconBg || '#F1F5F9'};
  }

  .text-wrap {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .link-label {
    font-family: 'Nunito', sans-serif;
    font-size: 15px;
    font-weight: 700;
    color: #0F172A;
    line-height: 1.2;
  }

  .link-desc {
    font-size: 12px;
    color: #94A3B8;
    font-weight: 500;
  }
`;

const DrawerDivider = styled.div`
  height: 1px;
  background: rgba(226, 232, 240, 0.8);
  margin: 8px 22px 16px;
`;

const DrawerCTASection = styled.div`
  padding: 0 22px 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const DrawerPrimaryBtn = styled(motion.a)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 15px 20px;
  background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%);
  color: white;
  font-family: 'Nunito', sans-serif;
  font-size: 15px;
  font-weight: 800;
  border-radius: 14px;
  text-decoration: none;
  box-shadow: 0 4px 20px rgba(239, 68, 68, 0.28);
  letter-spacing: 0.01em;

  .price-chip {
    font-size: 11px;
    font-weight: 700;
    background: rgba(255,255,255,0.28);
    padding: 2px 8px;
    border-radius: 999px;
  }

  &:hover {
    color: white;
    text-decoration: none;
    box-shadow: 0 6px 24px rgba(239, 68, 68, 0.38);
  }
`;

const DrawerSecondaryBtn = styled(motion.a)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px 20px;
  background: transparent;
  color: #475569;
  font-family: 'Nunito', sans-serif;
  font-size: 15px;
  font-weight: 700;
  border-radius: 14px;
  text-decoration: none;
  border: 1.5px solid #E2E8F0;
  transition: all 0.18s ease;

  &:hover {
    color: #0F172A;
    border-color: #94A3B8;
    background: rgba(15, 23, 42, 0.03);
    text-decoration: none;
  }
`;

// Same visual language as DrawerSecondaryBtn, but a real <button> (log out)
const DrawerSecondaryActionBtn = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px 20px;
  background: transparent;
  color: #475569;
  font-family: 'Nunito', sans-serif;
  font-size: 15px;
  font-weight: 700;
  border-radius: 14px;
  border: 1.5px solid #E2E8F0;
  cursor: pointer;
  transition: all 0.18s ease;

  &:hover {
    color: #0F172A;
    border-color: #94A3B8;
    background: rgba(15, 23, 42, 0.03);
  }
`;

const DrawerUserRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 22px 16px;
  padding: 12px 14px;
  background: rgba(15, 23, 42, 0.03);
  border-radius: 14px;
`;

const DrawerUserAvatar = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: 15px;
  color: white;
  background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%);
`;

const DrawerUserInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;

  .welcome-name {
    font-family: 'Nunito', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: #0F172A;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .welcome-email {
    font-size: 12px;
    color: #94A3B8;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

// ─── Drawer Trust Strip ───────────────────────────────────────────────────────

const DrawerTrustStrip = styled.div`
  margin: 0 22px 16px;
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(34,197,94,0.06), rgba(56,189,248,0.06));
  border: 1px solid rgba(34, 197, 94, 0.18);
  border-radius: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const TrustIcon = styled.div`
  font-size: 20px;
  animation: ${floatY} 4s ease-in-out infinite;
`;

const TrustTextWrap = styled.div`
  .trust-title {
    font-size: 13px;
    font-weight: 700;
    color: #0F172A;
    margin-bottom: 2px;
  }
  .trust-sub {
    font-size: 11.5px;
    color: #64748B;
    font-weight: 500;
  }
`;

// ─── Data ─────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Browse', href: '#campaigns' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
];

const DRAWER_NAV = [
  {
    label: 'Browse Campaigns',
    desc: 'Find needs in your community',
    emoji: '🔍',
    href: '#campaigns',
    iconBg: 'linear-gradient(145deg, #DBEAFE, #BFDBFE)',
  },
  {
    label: 'How It Works',
    desc: 'Learn the simple 3-step process',
    emoji: '✨',
    href: '#how-it-works',
    iconBg: 'linear-gradient(145deg, #FEF9C3, #FDE68A)',
  },
  {
    label: 'Pricing',
    desc: 'Start for just $20',
    emoji: '💰',
    href: '#pricing',
    iconBg: 'linear-gradient(145deg, #D1FAE5, #A7F3D0)',
  },
  {
    label: 'View Sponsorships',
    desc: 'Support campaigns near you',
    emoji: '🤝',
    href: '/sponsorships',
    iconBg: 'linear-gradient(145deg, #FCE7F3, #FBCFE8)',
  },
];

// ─── Animation Variants ───────────────────────────────────────────────────────

const drawerVariants = {
  hidden: { x: '100%', opacity: 0.8 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 280, damping: 28 },
  },
  exit: {
    x: '110%',
    opacity: 0,
    transition: { duration: 0.25, ease: [0.4, 0, 1, 1] },
  },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const navItemVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.07 + 0.1, duration: 0.38, ease: [0.2, 0.9, 0.2, 1] },
  }),
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Header() {
  const router = useRouter();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  const handleLogout = () => {
    clearAuth();
    close();
    router.push('/');
  };

  const initial = (user?.displayName || user?.email || '?').trim().charAt(0).toUpperCase();

  return (
    <>
      <HeaderWrapper $scrolled={scrolled}>
        <HeaderContainer>
          {/* ── Logo ─────────────────────────────────────────────── */}
          <LogoLink
            href="/"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 22 }}
          >
            <LogoImg src="/1000019752.png" alt="HonestNeed logo" />
            <LogoWordmark>
              <span className="name">HonestNeed</span>
              <span className="tagline">Get your needs filled</span>
            </LogoWordmark>
          </LogoLink>

          {/* ── Desktop Nav ──────────────────────────────────────── */}
          <Nav>
            {NAV_LINKS.map((link) => (
              <NavLink key={link.label} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </Nav>

          {/* ── Desktop Right ─────────────────────────────────────── */}
          <DesktopActions>
            <LiveBadge>
              <span className="dot" />
              8,400+ supporters
            </LiveBadge>

            <SecondaryBtn
              href="/campaigns"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              View Campaigns
            </SecondaryBtn>

            {isAuthenticated ? (
              <>
                <SecondaryActionBtn
                  onClick={handleLogout}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <FiLogOut size={14} />
                  Log Out
                </SecondaryActionBtn>

                <PrimaryBtn
                  href="/dashboard"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <FiGrid size={14} />
                  Go to Dashboard
                </PrimaryBtn>
              </>
            ) : (
              <>
                <SecondaryBtn
                  href="/login"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <FiLogIn size={14} />
                  Log In
                </SecondaryBtn>

                <PrimaryBtn
                  href="/login"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <FiHeart size={14} />
                  Start a Campaign
                  <span className="price">$20</span>
                </PrimaryBtn>
              </>
            )}
          </DesktopActions>

          {/* ── Mobile Controls ───────────────────────────────────── */}
          <MobileControls>
            {isAuthenticated ? (
              <MobilePrimaryBtn
                href="/dashboard"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
              >
                <FiGrid size={12} />
                Dashboard
              </MobilePrimaryBtn>
            ) : (
              <MobilePrimaryBtn
                href="/login"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
              >
                <FiHeart size={12} />
                Start
              </MobilePrimaryBtn>
            )}

            <HamburgerBtn
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation menu"
              whileTap={{ scale: 0.93 }}
            >
              <FiMenu size={20} />
            </HamburgerBtn>
          </MobileControls>
        </HeaderContainer>
      </HeaderWrapper>

      {/* Spacer so content doesn't hide under fixed header */}
      <div style={{ height: 64 }} aria-hidden="true" />

      {/* ── Mobile Drawer ──────────────────────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <DrawerOverlay
              key="overlay"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={close}
            />

            {/* Drawer Panel */}
            <Drawer
              key="drawer"
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              {/* Drawer Header */}
              <DrawerHeader>
                <LogoLink href="/" onClick={close}>
                  <LogoImg src="/1000019752.png" alt="HonestNeed" style={{ height: 34 }} />
                  <LogoWordmark>
                    <span className="name">HonestNeed</span>
                    <span className="tagline">Get your needs filled</span>
                  </LogoWordmark>
                </LogoLink>
                <DrawerCloseBtn
                  onClick={close}
                  aria-label="Close menu"
                  whileTap={{ scale: 0.92 }}
                >
                  <FiX size={18} />
                </DrawerCloseBtn>
              </DrawerHeader>

              {/* Nav Items */}
              <DrawerNavSection>
                <DrawerNavLabel>Navigation</DrawerNavLabel>
                {DRAWER_NAV.map((item, i) => (
                  <DrawerNavItem
                    key={item.label}
                    href={item.href}
                    $iconBg={item.iconBg}
                    custom={i}
                    variants={navItemVariants}
                    initial="hidden"
                    animate="visible"
                    onClick={close}
                  >
                    <div className="icon-wrap">{item.emoji}</div>
                    <div className="text-wrap">
                      <span className="link-label">{item.label}</span>
                      <span className="link-desc">{item.desc}</span>
                    </div>
                  </DrawerNavItem>
                ))}
              </DrawerNavSection>

              {isAuthenticated && (
                <DrawerUserRow>
                  <DrawerUserAvatar>{initial}</DrawerUserAvatar>
                  <DrawerUserInfo>
                    <span className="welcome-name">{user?.displayName || 'Welcome back'}</span>
                    <span className="welcome-email">{user?.email}</span>
                  </DrawerUserInfo>
                </DrawerUserRow>
              )}

              <DrawerDivider />

              {/* Trust Strip */}
              <DrawerTrustStrip>
                <TrustIcon>🏘️</TrustIcon>
                <TrustTextWrap>
                  <div className="trust-title">8,400+ community supporters</div>
                  <div className="trust-sub">$120K+ in direct community impact</div>
                </TrustTextWrap>
              </DrawerTrustStrip>

              {/* CTA Buttons */}
              <DrawerCTASection>
                {isAuthenticated ? (
                  <>
                    <DrawerPrimaryBtn
                      href="/dashboard"
                      onClick={close}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <FiGrid size={16} />
                      Go to Dashboard
                    </DrawerPrimaryBtn>

                    <DrawerSecondaryBtn
                      href="/sponsorships"
                      onClick={close}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      View Sponsorships
                      <FiArrowRight size={15} />
                    </DrawerSecondaryBtn>

                    <DrawerSecondaryActionBtn
                      onClick={handleLogout}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <FiLogOut size={15} />
                      Log Out
                    </DrawerSecondaryActionBtn>
                  </>
                ) : (
                  <>
                    <DrawerPrimaryBtn
                      href="/login"
                      onClick={close}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <FiHeart size={16} />
                      Start a Campaign
                      <span className="price-chip">$20</span>
                    </DrawerPrimaryBtn>

                    <DrawerSecondaryBtn
                      href="/login"
                      onClick={close}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <FiLogIn size={15} />
                      Log In
                    </DrawerSecondaryBtn>

                    <DrawerSecondaryBtn
                      href="/sponsorships"
                      onClick={close}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      View Sponsorships
                      <FiArrowRight size={15} />
                    </DrawerSecondaryBtn>
                  </>
                )}
              </DrawerCTASection>
            </Drawer>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
