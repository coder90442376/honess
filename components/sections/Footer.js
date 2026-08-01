'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FiMail, FiArrowRight, FiCheck } from 'react-icons/fi';
import Container from '../ui/Container';
import Button from '../ui/Button';
import StyledInput from '../ui/Input';

const FooterWrapper = styled.footer`
  background-color: ${({ theme }) => theme?.colors?.text || '#0F172A'};
  color: white;
  padding: ${({ theme }) => theme?.spacing?.['5xl'] || '64px'} 0 ${({ theme }) => theme?.spacing?.xl || '24px'};
`;

const FooterGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme?.spacing?.['2xl'] || '32px'};
  margin-bottom: ${({ theme }) => theme?.spacing?.['3xl'] || '48px'};

  @media (min-width: ${({ theme }) => theme?.breakpoints?.tablet || '1024px'}) {
    grid-template-columns: 2fr 1fr 1fr 1fr;
  }
`;

const BrandColumn = styled.div``

const Logo = styled.a`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme?.spacing?.sm || '8px'};
  font-family: ${({ theme }) => theme?.typography?.headingFont || 'Inter, sans-serif'};
  font-size: ${({ theme }) => theme?.typography?.sizes?.h4?.size || '20px'};
  font-weight: ${({ theme }) => theme?.typography?.weights?.bold || 'bold'};
  color: white;
  text-decoration: none;
  margin-bottom: ${({ theme }) => theme?.spacing?.lg || '16px'};

  img {
    display: block;
    height: 28px;
    width: auto;
  }

  svg {
    color: ${({ theme }) => theme?.colors?.primary || '#6366F1'};
    width: 28px;
    height: 28px;
  }

  span {
    color: ${({ theme }) => theme?.colors?.primary || '#6366F1'};
  }
`;

const MissionText = styled.p`
  font-size: ${({ theme }) => theme?.typography?.sizes?.body?.size || '16px'};
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.7;
  margin-bottom: ${({ theme }) => theme?.spacing?.lg || '16px'};
`;

const Slogan = styled.div`
  font-family: ${({ theme }) => theme?.typography?.headingFont || 'Inter, sans-serif'};
  font-size: ${({ theme }) => theme?.typography?.sizes?.h4?.size || '20px'};
  font-weight: ${({ theme }) => theme?.typography?.weights?.bold || 'bold'};
  background: linear-gradient(135deg, ${({ theme }) => theme?.colors?.primary || '#6366F1'} 0%, ${({ theme }) => theme?.colors?.secondary || '#F43F5E'} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Column = styled.div``

const ColumnTitle = styled.h4`
  font-size: ${({ theme }) => theme?.typography?.sizes?.body?.size || '16px'};
  font-weight: ${({ theme }) => theme?.typography?.weights?.semibold || '600'};
  color: white;
  margin-bottom: ${({ theme }) => theme?.spacing?.lg || '16px'};
`;

const LinkList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const LinkItem = styled.li`
  margin-bottom: ${({ theme }) => theme?.spacing?.md || '12px'};
`;

const FooterLink = styled.a`
  font-size: ${({ theme }) => theme?.typography?.sizes?.body?.size || '16px'};
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: color ${({ theme }) => theme?.transitions?.fast || '100ms ease'};

  &:hover {
    color: white;
  }
`;

const NewsletterSection = styled.div`
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: ${({ theme }) => theme?.radii?.large || '20px'};
  padding: ${({ theme }) => theme?.spacing?.xl || '24px'};
  margin-bottom: ${({ theme }) => theme?.spacing?.['3xl'] || '48px'};
`;

const NewsletterTitle = styled.h3`
  font-size: ${({ theme }) => theme?.typography?.sizes?.h4?.size || '20px'};
  font-weight: ${({ theme }) => theme?.typography?.weights?.bold || 'bold'};
  color: white;
  margin-bottom: ${({ theme }) => theme?.spacing?.sm || '8px'};
`;

const NewsletterText = styled.p`
  font-size: ${({ theme }) => theme?.typography?.sizes?.body?.size || '16px'};
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: ${({ theme }) => theme?.spacing?.lg || '16px'};
`;

const NewsletterForm = styled.form`
  display: flex;
  gap: ${({ theme }) => theme?.spacing?.md || '12px'};
  flex-wrap: wrap;

  @media (min-width: ${({ theme }) => theme?.breakpoints?.mobile || '768px'}) {
    flex-wrap: nowrap;
  }
`;

const NewsletterInput = styled(StyledInput)`
  flex: 1;
  min-width: 250px;
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: white;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  &:focus {
    border-color: ${({ theme }) => theme?.colors?.primary || '#6366F1'};
  }
`;

const SuccessMessage = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme?.spacing?.sm || '8px'};
  padding: ${({ theme }) => theme?.spacing?.md || '12px'};
  background-color: rgba(16, 185, 129, 0.2);
  border-radius: ${({ theme }) => theme?.radii?.medium || '12px'};
  color: ${({ theme }) => theme?.colors?.success || '#10B981'};

  svg {
    width: 20px;
    height: 20px;
  }
`;

const BottomBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme?.spacing?.md || '12px'};
  padding-top: ${({ theme }) => theme?.spacing?.xl || '24px'};
  border-top: 1px solid rgba(255, 255, 255, 0.1);

  @media (min-width: ${({ theme }) => theme?.breakpoints?.tablet || '1024px'}) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

const Copyright = styled.p`
  font-size: ${({ theme }) => theme?.typography?.sizes?.small?.size || '14px'};
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 0;
`;

const LegalLinks = styled.div`
  display: flex;
  gap: ${({ theme }) => theme?.spacing?.lg || '16px'};
`;

const LegalLink = styled.a`
  font-size: ${({ theme }) => theme?.typography?.sizes?.small?.size || '14px'};
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  transition: color ${({ theme }) => theme?.transitions?.fast || '100ms ease'};

  &:hover {
    color: white;
  }
`;

const footerLinks = {
  platform: [
    { label: 'Browse Campaigns', href: '#campaigns' },
    { label: 'How it Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
  ],
  support: [
    { label: 'Contact Us', href: '/contact' },
  ],
};

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <FooterWrapper>
      <Container>
        <NewsletterSection>
          <NewsletterTitle>Get Launch Updates</NewsletterTitle>
          <NewsletterText>
            Subscribe to get notified about new features, discounts, and campaigns in your area.
          </NewsletterText>
          {subscribed ? (
            <SuccessMessage
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <FiCheck />
              Thanks for subscribing! We&apos;ll keep you updated.
            </SuccessMessage>
          ) : (
            <NewsletterForm onSubmit={handleSubmit}>
              <NewsletterInput
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" icon={FiArrowRight}>
                Subscribe
              </Button>
            </NewsletterForm>
          )}
        </NewsletterSection>

        <FooterGrid>
          <BrandColumn>
            <Logo href="/">
              <img src="/1000019752.png" alt="HonestNeed" />
              Honest<span>Need</span>
            </Logo>
            <MissionText>
              HonestNeed is a community-first platform built for neighbors who help neighbors. 
              We make it simple to post needs, share them, and connect people who can help.
            </MissionText>
            <Slogan>See Good. Do Good. Together We Win.</Slogan>
          </BrandColumn>

          <Column>
            <ColumnTitle>Platform</ColumnTitle>
            <LinkList>
              {footerLinks.platform.map((link) => (
                <LinkItem key={link.label}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </LinkItem>
              ))}
            </LinkList>
          </Column>

          <Column>
            <ColumnTitle>Support</ColumnTitle>
            <LinkList>
              {footerLinks.support.map((link) => (
                <LinkItem key={link.label}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </LinkItem>
              ))}
            </LinkList>
          </Column>

          <Column>
            <ColumnTitle>Contact Us</ColumnTitle>
            <p style={{ opacity: 0.7, fontSize: '0.9rem', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>
              🌐 honestneed.com<br />
              <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                Responses within 24–48 business hours
              </span>
            </p>
          </Column>
        </FooterGrid>

        <BottomBar>
          <Copyright>
            © 2024 HonestNeed. All rights reserved. HonestNeed lists payment options; users transfer funds P2P.
          </Copyright>
          <LegalLinks>
            <LegalLink href="/privacy-policy">Privacy Policy</LegalLink>
            <LegalLink href="/terms">Terms of Service</LegalLink>
            <LegalLink href="/refund-policy">Refund Policy</LegalLink>
            <LegalLink href="/cookie-policy">Cookie Policy</LegalLink>
            <LegalLink href="/contact">Contact Us</LegalLink>
          </LegalLinks>
        </BottomBar>
      </Container>
    </FooterWrapper>
  );
}
