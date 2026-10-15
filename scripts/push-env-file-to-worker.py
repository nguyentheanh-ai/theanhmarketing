"""Push production variables from a local dotenv file (e.g. an old
`.vercel/.env.production.local`) to Worker theanh-main-cf-production with
`wrangler secret bulk`, plus fresh random native keys. Prints names only.
Usage: python3 scripts/push-env-file-to-worker.py <dotenv-file>
"""
import base64, json, os, re, secrets, subprocess, sys, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
WORKER = "theanh-main-cf-production"
DROP = re.compile(r"^(VERCEL|TURBO|NX_|NEXT_PUBLIC_)|^(AUTH_GUARD_ENABLED|NODE_ENV|CF_R2_STAGE_PRIVATE_DELIVERY)$")
FRESH = ["NATIVE_AUTH_REFRESH_KEY", "NATIVE_AUTH_CREDENTIAL_KEY", "NATIVE_AUTH_LIMITER_KEY", "R2_PRIVATE_URL_SECRET"]
env = {}
for line in Path(sys.argv[1]).read_text().splitlines():
    m = re.match(r"^([A-Z0-9_]+)=(.*)$", line)
    if not m or DROP.search(m.group(1)): continue
    v = m.group(2)
    if len(v) >= 2 and v[0] == v[-1] == '"': v = json.loads(v)
    if v: env[m.group(1)] = v
# `vercel env pull` writes the same short placeholder for every Sensitive var.
# Refuse such files instead of pushing placeholders as secrets.
import collections
repeated = [v for v, n in collections.Counter(env.values()).items() if n > 2]
if repeated:
    sys.exit(f"Refusing: {sum(collections.Counter(env.values())[v] for v in repeated)} variables share identical values (Sensitive placeholders). Use scripts/set-production-secrets.sh.")
for k in FRESH: env[k] = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("=")
fd, tmp = tempfile.mkstemp(suffix=".json"); os.close(fd); os.chmod(tmp, 0o600)
try:
    Path(tmp).write_text(json.dumps(env))
    r = subprocess.run([str(ROOT / "node_modules/.bin/wrangler"), "secret", "bulk", tmp, "--name", WORKER], cwd=ROOT, capture_output=True, text=True)
finally:
    Path(tmp).unlink(missing_ok=True)
out = r.stdout + r.stderr
for v in env.values():
    if len(v) >= 6: out = out.replace(v, "[redacted]")
print("exit", r.returncode); print(out[-700:]); print("names:", sorted(env))
sys.exit(r.returncode)
