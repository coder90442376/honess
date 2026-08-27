import { apiClient } from '@/lib/api'

/**
 * Campaign Support Boost Service — Frontend
 *
 * COMMUNITY (peer) boosts: one user amplifying another user's campaign, free.
 *
 * ⚠️ Not the same as the creator's paid Stripe "Promote" purchase, which lives
 * under /boosts and is surfaced on the creator's own boosts dashboard. Keep the
 * two apart in copy as well as in code: this one is "Boost"/"Support", that one
 * is "Promote".
 */

export type BoostState =
  | 'available'
  | 'already_boosted_today'
  | 'self_boost'
  | 'ineligible_campaign'
  | 'unauthenticated'

export interface BoostEligibility {
  campaign_id: string
  community_boost_count: number
  community_boost_score: number
  can_boost: boolean
  state: BoostState
  reason?: string
  next_boost_available_at?: string
}

export interface BoostResult {
  boost_id: string | null
  counted: boolean
  suppressed_reason: string | null
  xp_awarded: number
  campaign: {
    community_boost_count: number
    community_boost_score: number
  }
  next_boost_available_at: string
}

export interface BoostStats {
  campaign_id: string
  community_boost_count: number
  community_boost_score: number
  last_community_boost_at: string | null
  recent_boosters: Array<{
    name: string
    avatar_url: string | null
    boosted_at: string
  }>
}

export type BoostSource = 'campaign_page' | 'discover' | 'share_flow' | 'notification' | 'api'

export const campaignBoostService = {
  async getEligibility(campaignId: string): Promise<BoostEligibility> {
    const { data } = await apiClient.get(`/campaigns/${campaignId}/support-boost/eligibility`)
    return data.data
  },

  /**
   * Boost a campaign.
   *
   * Note: an over-quota boost (the user already boosted this campaign today) is
   * NOT an error — the API returns success with `counted: false`, mirroring the
   * "over-quota shares are free" rule sharers already know. Callers should show
   * that as information, not as a failure.
   */
  async boost(
    campaignId: string,
    payload: { source?: BoostSource; share_id?: string; channel?: string } = {}
  ): Promise<{ success: boolean; code: string | null; message: string; data: BoostResult }> {
    const { data } = await apiClient.post(`/campaigns/${campaignId}/support-boost`, {
      source: payload.source || 'campaign_page',
      share_id: payload.share_id,
      channel: payload.channel,
    })
    return data
  },

  async getStats(campaignId: string): Promise<BoostStats> {
    const { data } = await apiClient.get(`/campaigns/${campaignId}/support-boost/stats`)
    return data.data
  },

  async getMyBoostActivity(params?: { page?: number; limit?: number }) {
    const { data } = await apiClient.get('/campaigns/support-boosts/mine', { params })
    return data.data
  },
}

export default campaignBoostService
