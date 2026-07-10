const SCORE_RULES = {
  form_submit: 10,
  email_open: 3,
  email_click: 8,
  course_page_view: 5,
  checkout_click: 20,
  consult_call_success: 20,
  pending_payment: 30,
  inactive_long: -10,
} as const;

export type LeadScoreEventType = keyof typeof SCORE_RULES;

export function scoreLeadEvent(eventType: string) {
  return SCORE_RULES[eventType as LeadScoreEventType] ?? 0;
}

export function applyLeadScore(currentScore: number, eventType: string) {
  return Math.max(0, currentScore + scoreLeadEvent(eventType));
}

export function getLeadScoreRules() {
  return { ...SCORE_RULES };
}
