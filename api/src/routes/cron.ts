import express from 'express'
import { authenticateCron } from '../middleware/cronAuth.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { sendConversationMessage } from '../lib/twilio.js'
import { DateTime } from 'luxon'

const router = express.Router()

// POST /cron/send-weekly-questions - Send weekly questions (cron protected)
// Add ?verbose=1 to see why groups were skipped (empty results otherwise).
router.post('/send-weekly-questions', authenticateCron, async (req, res) => {
  try {
    const now = DateTime.now()
    const results: Array<Record<string, unknown>> = []
    const verbose =
      req.query.verbose === '1' ||
      req.query.verbose === 'true' ||
      req.query.debug === '1'
    const skipped: Array<{ group_id: string; group_name?: string; reason: string }> = []

    const noteSkip = (group: { id: string; name?: string }, reason: string) => {
      if (verbose) {
        skipped.push({
          group_id: group.id,
          group_name: group.name,
          reason,
        })
      }
    }

    // Get all groups
    const { data: groups, error: groupsError } = await supabaseAdmin
      .from('groups')
      .select('*')

    if (groupsError) throw groupsError

    if (verbose && (!groups || groups.length === 0)) {
      skipped.push({
        group_id: '—',
        reason: 'no rows in groups table (wrong Supabase project or empty DB)',
      })
    }

    for (const group of groups || []) {
      try {
        if (group.status !== 'active') {
          noteSkip(group, `status is "${group.status}", not active`)
          continue
        }

        const groupTime = now.setZone(group.schedule_timezone)
        const currentDay = groupTime.weekday === 7 ? 0 : groupTime.weekday
        const currentTime = groupTime.toFormat('HH:mm')
        const scheduleDayNum = Number(group.schedule_day)

        if (Number.isNaN(scheduleDayNum) || currentDay !== scheduleDayNum) {
          noteSkip(
            group,
            `wrong day: now weekday index ${currentDay} (${groupTime.weekdayLong}) in ${group.schedule_timezone}, group schedule_day=${group.schedule_day}`
          )
          continue
        }

        const timeStr = String(group.schedule_time ?? '')
        const timeParts = timeStr.split(':')
        const scheduleHour = parseInt(timeParts[0], 10)
        const currentHour = parseInt(currentTime.split(':')[0], 10)

        if (Number.isNaN(scheduleHour) || currentHour !== scheduleHour) {
          noteSkip(
            group,
            `wrong hour: now ${currentTime} in ${group.schedule_timezone}, schedule_time=${timeStr}`
          )
          continue
        }

        const { data: sendState } = await supabaseAdmin
          .from('group_send_state')
          .select('last_question_index')
          .eq('group_id', group.id)
          .single()

        if (!sendState) {
          noteSkip(group, 'missing group_send_state row for this group')
          continue
        }

        const { data: questions } = await supabaseAdmin
          .from('questions')
          .select('*')
          .eq('question_set_id', group.question_set_id)
          .order('sort_order')

        if (!questions || questions.length === 0) {
          noteSkip(group, 'no questions in question set')
          continue
        }

        const { count: pendingInviteCount } = await supabaseAdmin
          .from('group_invites')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id)
          .eq('status', 'pending')
        if ((pendingInviteCount ?? 0) > 0) {
          noteSkip(group, `pending invites: ${pendingInviteCount}`)
          continue
        }

        if (!group.conversation_sid) {
          noteSkip(group, 'no conversation_sid (Conversation not created yet)')
          continue
        }

        const questionIndex = sendState.last_question_index % questions.length
        const question = questions[questionIndex]
        const nextIndex = (sendState.last_question_index + 1) % questions.length

        const authorIdentity = `honeytext-${group.id}`
        const formattedBody = `This week's question for ${group.name}: ${question.body}`
        const messageResult = await sendConversationMessage(
          group.conversation_sid,
          formattedBody,
          authorIdentity
        )

        const delivery = (messageResult as any)?.delivery
        if (delivery) {
          console.log(
            `[cron] group=${group.id} conversation=${group.conversation_sid} message_sid=${(messageResult as any)?.sid} delivery=${JSON.stringify(delivery)}`
          )
        }

        await supabaseAdmin.from('group_messages').insert({
          group_id: group.id,
          conversation_sid: group.conversation_sid,
          author: 'honeytext',
          body: formattedBody,
          direction: 'outbound',
        })
        await supabaseAdmin
          .from('group_send_state')
          .update({ last_question_index: nextIndex })
          .eq('group_id', group.id)

        results.push({
          group_id: group.id,
          group_name: group.name,
          members_sent: 'conversation',
          question: question.body,
          message_sid: (messageResult as any)?.sid,
          delivery: delivery || null,
        })
      } catch (groupError: any) {
        console.error(`Error processing group ${group.id}:`, groupError)
        results.push({
          group_id: group.id,
          error: groupError.message,
        })
      }
    }

    const payload: Record<string, unknown> = {
      success: true,
      processed_at: now.toISO(),
      results,
    }
    if (verbose) {
      payload.skipped = skipped
    }

    res.json(payload)
  } catch (error: any) {
    console.error('Error in cron job:', error)
    res.status(500).json({
      error: error.message || 'Failed to process weekly questions',
    })
  }
})

export default router
