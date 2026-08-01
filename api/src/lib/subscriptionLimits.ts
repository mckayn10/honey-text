import { supabaseAdmin } from './supabase.js'
import { TIER_CONFIG, BETA_TIER } from './subscriptionConfig.js'

export function getTierLimits(tier: string | null): { maxGroups: number; maxMembersPerGroup: number } {
  if (!tier) return { maxGroups: 0, maxMembersPerGroup: 0 }
  if (tier === BETA_TIER) return { maxGroups: Infinity, maxMembersPerGroup: Infinity }
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

/**
 * Check if the user can switch to the given tier based on current usage.
 * Returns { allowed: true } or { allowed: false, reason: string }.
 */
export async function checkCanSwitchToTier(
  userId: string,
  targetTier: string
): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  const { maxGroups, maxMembersPerGroup } = getTierLimits(targetTier)
  if (maxGroups === 0 && maxMembersPerGroup === 0) {
    return { allowed: false, reason: 'Invalid plan' }
  }

  const { count: groupCount } = await supabaseAdmin
    .from('groups')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userId)

  if ((groupCount ?? 0) > maxGroups) {
    return {
      allowed: false,
      reason: `${targetTier.charAt(0).toUpperCase() + targetTier.slice(1)} allows ${maxGroups} group${maxGroups === 1 ? '' : 's'}. You have ${groupCount} group${(groupCount ?? 0) === 1 ? '' : 's'}. Delete a group before switching.`,
    }
  }

  const { data: groups } = await supabaseAdmin
    .from('groups')
    .select('id')
    .eq('owner_id', userId)

  for (const group of groups || []) {
    const { count: memberCount } = await supabaseAdmin
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group.id)
    if ((memberCount ?? 0) > maxMembersPerGroup) {
      return {
        allowed: false,
        reason: `${targetTier.charAt(0).toUpperCase() + targetTier.slice(1)} allows up to ${maxMembersPerGroup} members per group. You have a group with ${memberCount} members. Remove members or choose a different plan.`,
      }
    }
  }

  return { allowed: true }
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
