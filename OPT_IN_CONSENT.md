# Opt-in and consent for HoneyText messaging

HoneyText sends weekly SMS conversation-starter questions to small groups (e.g. couples, families). Recipients only receive messages after they have opted in.

## How users opt in

1. **Invitation**  
   A group creator adds the recipient’s name and phone number and sends them an **invite link** (e.g. `https://yourapp.com/invite/<token>`).

2. **Review and accept**  
   The recipient opens the link, sees the group name, creator name, and their own name and phone number. They must click **“Accept Invitation”** to opt in.

3. **After acceptance**  
   Only after they accept are they added as a participant and included in that group’s weekly question messages. No messages are sent before acceptance.

## Proof of consent

- **Consent is explicit:** The recipient must take the action “Accept Invitation” on the invite page. There is no pre-checked box or passive consent.
- **Consent is recorded:** Acceptance is stored (e.g. `confirmed_at` and participant status) so we know who has opted in.
- **Scope:** Consent is for receiving the group’s weekly question messages. We do not send marketing or promotional messages.
- **Opt-out:** Recipients can be removed from a group by the group owner; they then stop receiving messages for that group.

## Contact

For questions about opt-in or messaging, use the contact details provided in the toll-free verification application.
