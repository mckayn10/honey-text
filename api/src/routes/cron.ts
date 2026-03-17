import express from 'express'
import { authenticateCron } from '../middleware/cronAuth.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { sendConversationMessage } from '../lib/twilio.js'
import { DateTime } from 'luxon'

const router = express.Router()

// POST /cron/send-weekly-questions - Send weekly questions (cron protected)
router.post('/send-weekly-questions', authenticateCron, async (req, res) => {
  try {
    const now = DateTime.now()
    const results = []

    // Get all groups
    const { data: groups, error: groupsError } = await supabaseAdmin
      .from('groups')
      .select('*')

    if (groupsError) throw groupsError

    for (const group of groups || []) {
      try {
        if (group.status !== 'active') continue
        // Convert current time to group's timezone
        const groupTime = now.setZone(group.schedule_timezone)
        const currentDay = groupTime.weekday === 7 ? 0 : groupTime.weekday // Convert Sunday from 7 to 0
        const currentTime = groupTime.toFormat('HH:mm')

        // Check if it's the right day and time (within a 1-hour window)
        if (currentDay === group.schedule_day) {
          const [scheduleHour, scheduleMinute] = group.schedule_time.split(':').map(Number)
          const [currentHour, currentMinute] = currentTime.split(':').map(Number)
          
          const scheduleMinutes = scheduleHour * 60 + scheduleMinute
          const currentMinutes = currentHour * 60 + currentMinute
          
          // Send if within the same hour (allows for cron running every hour)
          if (currentHour === scheduleHour) {
            // Get send state
            const { data: sendState } = await supabaseAdmin
              .from('group_send_state')
              .select('last_question_index')
              .eq('group_id', group.id)
              .single()

            if (!sendState) continue

            // Get questions for this question set
            const { data: questions } = await supabaseAdmin
              .from('questions')
              .select('*')
              .eq('question_set_id', group.question_set_id)
              .order('sort_order')

            if (!questions || questions.length === 0) continue

            // Don't send until all invites for this group are resolved (accepted or deleted)
            const { count: pendingInviteCount } = await supabaseAdmin
              .from('group_invites')
              .select('*', { count: 'exact', head: true })
              .eq('group_id', group.id)
              .eq('status', 'pending')
            if ((pendingInviteCount ?? 0) > 0) continue

            // Get the current question index (loop if needed)
            const questionIndex = sendState.last_question_index % questions.length
            const question = questions[questionIndex]

            const nextIndex = (sendState.last_question_index + 1) % questions.length

            // Group MMS (Conversation). Requires conversation_sid and A2P 10DLC for delivery.
            if (!group.conversation_sid) continue

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

            await supabaseAdmin
              .from('group_messages')
              .insert({
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
          }
        }
      } catch (groupError: any) {
        console.error(`Error processing group ${group.id}:`, groupError)
        results.push({
          group_id: group.id,
          error: groupError.message,
        })
      }
    }

    res.json({
      success: true,
      processed_at: now.toISO(),
      results,
    })
  } catch (error: any) {
    console.error('Error in cron job:', error)
    res.status(500).json({
      error: error.message || 'Failed to process weekly questions',
    })
  }
})

export default router
