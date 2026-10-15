"""Copy the production environment of Vercel project `theanhmarketing` to the
Cloudflare production Worker, without printing any value.

  plan     -> list which variable NAMES exist / are missing / are undecryptable
  public   -> write NEXT_PUBLIC_* (build-time, public) to .env.cfproduction (git-ignored)
  secrets  -> push server variables + fresh native secrets with `wrangler secret bulk`

Uses the existing local Vercel CLI session (auth.json) read-only. Values only
transit this process and a 0600 temp file that is deleted immediately.
"""
import argparse, base64, json, os, secrets as rnd, subprocess, sys, tempfile, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT, TEAM, WORKER = "prj_vjOKusW9puv9LqALfEHl9ROjyf8y", "team_YIVvyUzGxKcfr7hyqZZltpqE", "theanh-main-cf-production"
AUTH = Path.home() / "Library/Application Support/com.vercel.cli/auth.json"
SKIP = {"VERCEL_ENV", "VERCEL_PROJECT_PRODUCTION_URL", "NODE_ENV", "AUTH_GUARD_ENABLED", "CF_R2_STAGE_PRIVATE_DELIVERY"}
# Declared as required secrets in cloudflare.config.ts; production gets fresh random values
# (native gates are off). STUDENT_PORTAL_PROVISION_SECRET is copied from Vercel instead.
FRESH = ["NATIVE_AUTH_REFRESH_KEY", "NATIVE_AUTH_CREDENTIAL_KEY", "NATIVE_AUTH_LIMITER_KEY", "R2_PRIVATE_URL_SECRET"]


def vercel_env():
    token = json.loads(AUTH.read_text())["token"]
    req = urllib.request.Request(f"https://api.vercel.com/v10/projects/{PROJECT}/env?decrypt=true&teamId={TEAM}",
                                 headers={"Authorization": "Bearer " + token})
    with urllib.request.urlopen(req, timeout=30) as r:
        envs = json.load(r)["envs"]
    out, undecryptable = {}, []
    for e in envs:
        if "production" not in (e.get("target") or []): continue
        if e.get("type") == "sensitive" or e.get("value") in (None, ""):
            undecryptable.append(e["key"]); continue
        out[e["key"]] = e["value"]
    return out, sorted(set(undecryptable))


def used_names():
    out = subprocess.run(["grep", "-rhoE", r"process\.env\.[A-Z0-9_]+", "app", "lib", "services", "components", "data", "proxy.ts"], cwd=ROOT, capture_output=True, text=True).stdout
    return sorted({l.split(".")[-1] for l in out.split()})


def main():
    p = argparse.ArgumentParser(description=__doc__); p.add_argument("stage", choices=["plan", "public", "secrets"]); a = p.parse_args()
    env, undecryptable = vercel_env(); used = used_names()
    public = {k: v for k, v in env.items() if k.startswith("NEXT_PUBLIC_")}
    server = {k: v for k, v in env.items() if not k.startswith("NEXT_PUBLIC_") and k not in SKIP and (k in used or k in ("STUDENT_PORTAL_PROVISION_SECRET",))}
    if a.stage == "plan":
        print(json.dumps({"vercelProductionVars": len(env), "public": sorted(public), "serverToCopy": sorted(server),
                          "usedButMissingOnVercel": sorted(set(used) - set(env) - SKIP), "undecryptable": undecryptable,
                          "vercelOnlyNotUsedByCode": sorted(set(env) - set(used) - set(public))}, indent=1))
    elif a.stage == "public":
        public["NEXT_PUBLIC_SITE_URL"] = "https://www.theanhmarketing.com"
        path = ROOT / ".env.cfproduction"
        path.write_text("".join(f"{k}={json.dumps(v)}\n" for k, v in sorted(public.items()))); os.chmod(path, 0o600)
        print("wrote .env.cfproduction:", sorted(public))
    else:
        bundle = dict(server)
        for k in FRESH: bundle[k] = base64.urlsafe_b64encode(rnd.token_bytes(32)).decode().rstrip("=")
        fd, tmp = tempfile.mkstemp(prefix="cfsecrets-", suffix=".json"); os.close(fd); os.chmod(tmp, 0o600)
        try:
            Path(tmp).write_text(json.dumps(bundle))
            r = subprocess.run([str(ROOT / "node_modules/.bin/wrangler"), "secret", "bulk", tmp, "--name", WORKER], cwd=ROOT, capture_output=True, text=True)
        finally:
            Path(tmp).unlink(missing_ok=True)
        tail = (r.stdout + r.stderr)[-600:]
        for v in bundle.values():  # never echo a value even if wrangler did
            if len(v) >= 6: tail = tail.replace(v, "[redacted]")
        print("wrangler exit", r.returncode); print(tail); print("secret names:", sorted(bundle))
        sys.exit(r.returncode)


if __name__ == "__main__":
    main()
