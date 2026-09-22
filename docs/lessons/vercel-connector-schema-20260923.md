# Vercel connector schema — 23/09/2026

Applicability: current Vercel connector in this Codex session, deployment inspection only.
Observation: get_project exposed projectId but runtime required idOrName; get_deployment_build_logs returned tool not found. Cause: connector/runtime schema mismatch is CANDIDATE, not confirmed upstream.
Correction: use the existing authenticated Vercel CLI inspect / inspect --logs; retain doctor/preflight and normal authorization. Do not change deployment protection.
Verification: CLI inspect --wait confirmed dpl_AtMykk6RPVFztnbgFAEfvV31Xm4B READY with production aliases; public source hash verified separately. CLI fallback VERIFIED for this session. get_deployment and runtime log connector calls remain functional.
Limit: do not generalize to all connector tools or future versions. Preview login redirect is not proof of rendered application content.
