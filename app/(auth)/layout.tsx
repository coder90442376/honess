import styled from 'styled-components'
import { ReactNode } from 'react'

const AuthContainer = styled.div`
  /* Full viewport: these routes render without the global header (see
     app/LayoutHeader.js), so there is no 4rem chrome to subtract — doing so
     left the card sitting visibly above centre. */
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: #ffffff;

  @media (min-width: 640px) {
    padding: 1.5rem;
  }

  @media (min-width: 1024px) {
    padding: 2rem;
  }
`

const AuthContent = styled.div`
  width: 100%;
  max-width: 28rem;
`

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthContainer>
      <AuthContent>{children}</AuthContent>
    </AuthContainer>
  )
}
