import type { ChatStreamItem, Escalation, Ticket } from "@/types"

export const initialChatStream: ChatStreamItem[] = [
  {
    type: "message",
    id: "m1",
    role: "agent",
    content:
      "Hi, I'm Resolv. I can see order #48213 hasn't arrived yet — sorry about that. What would you like to do: track it, or ask about a refund?",
    timestamp: "9:41 AM",
  },
  {
    type: "message",
    id: "m2",
    role: "user",
    content: "It's 9 days late. I'd rather just get a refund at this point.",
    timestamp: "9:42 AM",
  },
  {
    type: "tool",
    id: "t1",
    label: "Checking order status",
    status: "done",
  },
  {
    type: "tool",
    id: "t2",
    label: "Searching refund policy",
    status: "done",
  },
  {
    type: "message",
    id: "m3",
    role: "agent",
    content:
      "That's fair — 9 days past the delivery window qualifies for a full refund under our late-delivery policy. I've drafted a $42.00 refund and sent it to a manager for approval, since it's over the amount I can issue on my own. You'll hear back within a few hours.",
    timestamp: "9:42 AM",
    citations: [
      {
        id: 1,
        policyLabel: "Late Delivery Policy §2.1",
        excerpt:
          "Orders more than 5 business days past their delivery estimate qualify for a full refund on request.",
      },
      {
        id: 2,
        policyLabel: "Refund Authorization §4.0",
        excerpt:
          "Refunds over $25 require sign-off from a support manager before funds are released.",
      },
    ],
  },
]

export const tickets: Ticket[] = [
  {
    id: "4821",
    customerName: "Priya Nandan",
    subject: "Refund for order #48213 — 9 days late",
    priority: "high",
    waitingSince: "12 min",
  },
  {
    id: "4819",
    customerName: "Marcus Webb",
    subject: "Account locked after password reset",
    priority: "high",
    waitingSince: "18 min",
  },
  {
    id: "4815",
    customerName: "Elena Sokolova",
    subject: "Duplicate charge on last invoice",
    priority: "high",
    waitingSince: "26 min",
  },
  {
    id: "4802",
    customerName: "Tomás Rivera",
    subject: "Downgrade plan, prorate this cycle",
    priority: "medium",
    waitingSince: "41 min",
  },
  {
    id: "4798",
    customerName: "Grace Lin",
    subject: "Update billing address on file",
    priority: "medium",
    waitingSince: "1 hr",
  },
  {
    id: "4791",
    customerName: "Owen Baptiste",
    subject: "Question about annual invoice PDF",
    priority: "low",
    waitingSince: "2 hr",
  },
]

export const escalations: Record<string, Escalation> = {
  "4821": {
    ticketId: "4821",
    aiSummary:
      "Customer's order (#48213) is 9 days past its delivery estimate. Customer requested a refund rather than continued shipping. Refund qualifies automatically under the late-delivery policy, but the amount exceeds my $25 auto-approval limit.",
    evidence: [
      {
        id: "e1",
        source: "Late Delivery Policy §2.1",
        excerpt:
          "Orders more than 5 business days past their delivery estimate qualify for a full refund on request.",
      },
      {
        id: "e2",
        source: "Refund Authorization §4.0",
        excerpt:
          "Refunds over $25 require sign-off from a support manager before funds are released.",
      },
    ],
    action: {
      type: "refund",
      description: "Issue refund to original payment method",
      amount: 42.0,
    },
    transcript: [
      {
        id: "t1",
        role: "agent",
        content:
          "Hi, I'm Resolv. I can see order #48213 hasn't arrived yet — sorry about that. What would you like to do: track it, or ask about a refund?",
        timestamp: "9:41 AM",
      },
      {
        id: "t2",
        role: "user",
        content: "It's 9 days late. I'd rather just get a refund at this point.",
        timestamp: "9:42 AM",
      },
      {
        id: "t3",
        role: "agent",
        content:
          "That's fair — 9 days past the delivery window qualifies for a full refund under our late-delivery policy. I've drafted a $42.00 refund and sent it to a manager for approval, since it's over the amount I can issue on my own.",
        timestamp: "9:42 AM",
      },
    ],
  },
  "4819": {
    ticketId: "4819",
    aiSummary:
      "Customer was locked out after three failed password-reset attempts from a new device. Identity confirmed via account email and last-4 of the card on file. Requesting manual unlock, which requires manager approval per the account-security policy.",
    evidence: [
      {
        id: "e1",
        source: "Account Security Policy §6.3",
        excerpt:
          "Manual account unlocks after repeated failed resets require manager approval, even when identity has been confirmed.",
      },
    ],
    action: {
      type: "account_unlock",
      description: "Manually unlock account and force a new password reset",
    },
    transcript: [
      {
        id: "t1",
        role: "user",
        content: "I've been locked out of my account for an hour, I can't reset my password.",
        timestamp: "9:12 AM",
      },
      {
        id: "t2",
        role: "agent",
        content:
          "I can see three failed reset attempts from a new device. I've confirmed your identity with your account email and card ending 4471 — I'll request a manual unlock now.",
        timestamp: "9:14 AM",
      },
    ],
  },
  "4815": {
    ticketId: "4815",
    aiSummary:
      "Customer was billed twice for invoice #INV-2291 due to a retried payment. Duplicate charge confirmed against the payment processor log. Refund of the duplicate amount is recommended.",
    evidence: [
      {
        id: "e1",
        source: "Billing Error Policy §1.4",
        excerpt:
          "Confirmed duplicate charges are refunded in full without requiring the customer to dispute with their bank.",
      },
    ],
    action: {
      type: "refund",
      description: "Refund duplicate charge on invoice #INV-2291",
      amount: 118.0,
    },
    transcript: [
      {
        id: "t1",
        role: "user",
        content: "I was charged twice for the same invoice this month, can you check?",
        timestamp: "8:55 AM",
      },
      {
        id: "t2",
        role: "agent",
        content:
          "You're right — the payment processor shows a retried charge that went through twice on invoice #INV-2291. I'll route the duplicate $118.00 for refund.",
        timestamp: "8:58 AM",
      },
    ],
  },
}
