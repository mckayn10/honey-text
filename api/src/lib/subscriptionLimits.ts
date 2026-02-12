import { supabaseAdmin } from './supabase.js'
import { TIER_CONFIG } from './subscriptionConfig.js'

export function getTierLimits(tier: string | null): { maxGroups: number; maxMembersPerGroup: number } {
  if (!tier) return { maxGroups: 0, maxMembersPerGroup: 0 }
  const config = TIER_CONFIG.find((t) => t.tier === tier)
  if (!config) return { maxGroups: 0, maxMembersPerGroup: 0 }
  return { maxGroups: config.maxGroups, maxMembersPerGroup: config.maxMembersPerGroup }
}

export async function checkCanCreateGroup(userId: string): Promise<boolean> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('subscription_tier')
    .eq('id', userId)
    .single()
  const { maxGroups } = getTierLimits(user?.subscription_tier ?? null)
  if (maxGroups === 0) return false

  const { count } = await supabaseAdmin
    .from('groups')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userId)
  return (count ?? 0) < maxGroups
}

export async function checkCanAddMemberToGroup(userId: string, groupId: string): Promise<boolean> {
  const { data: group } = await supabaseAdmin
    .from('groups')
    .select('owner_id')
    .eq('id', groupId)
    .single()
  if (!group || group.owner_id !== userId) return false

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('subscription_tier')
    .eq('id', userId)
    .single()
  const { maxMembersPerGroup } = getTierLimits(user?.subscription_tier ?? null)
  if (maxMembersPerGroup === 0) return false

  const { count } = await supabaseAdmin
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)
  return (count ?? 0) < maxMembersPerGroup
}
