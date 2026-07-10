export function isCrmV2Enabled() {
  return process.env.CRM_V2_ENABLED === "true";
}

export function shouldUseCrmV2DemoData() {
  return process.env.NODE_ENV !== "production" && process.env.CRM_V2_USE_DEMO_DATA !== "false";
}

export function getCrmV2MissingLiveConfigMessage(scope: string) {
  return `${scope}: thiếu Supabase live env hoặc service role nên CRM v2 không chạy mock trên production.`;
}
