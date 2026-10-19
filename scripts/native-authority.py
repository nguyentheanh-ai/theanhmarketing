"""Create the native writer authority (d1_data_authority, phase native) for a native DB.

Writes <out>.json (the AuthorityHandoff for the NATIVE_DATA_AUTHORITY secret) and
<out>.sql (schema + one authority row). Applying the SQL is the writer switch.
Usage: python3 scripts/native-authority.py <manifest.json> <out-prefix> "<approval text>"
"""
import datetime, hashlib, json, sys, uuid
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
manifest, out, approval = sys.argv[1], sys.argv[2], sys.argv[3]
now = datetime.datetime.now(datetime.timezone.utc)
iso = lambda d: d.strftime('%Y-%m-%dT%H:%M:%S.') + f'{d.microsecond // 1000:03d}Z'
cut, prep, act = iso(now - datetime.timedelta(seconds=30)), iso(now - datetime.timedelta(seconds=20)), iso(now - datetime.timedelta(seconds=10))
h = lambda s: hashlib.sha256(s.encode()).hexdigest()
H = {'projectId': 'vsxxgdzwtscuxcmjfckt', 'component': 'auth', 'epoch': str(uuid.uuid4()), 'restoreFence': str(uuid.uuid4()), 'transitionId': str(uuid.uuid4()),
     'sourceCutoffAt': cut, 'manifestDigest': h(Path(manifest).read_text()), 'sourceFenceReceipt': h('supabase read-only after ' + cut), 'approvalReceipt': h(approval)}
Path(out + '.json').write_text(json.dumps(H))
sql = (ROOT / 'scripts/d1-data-authority.sql').read_text() + (
    f"\nINSERT INTO d1_data_authority(source_project_id,component,epoch,restore_fence,transition_id,last_operation_id,phase,source_cutoff_at,manifest_digest,source_fence_receipt,approval_receipt,prepared_at,activated_at,frozen_at)"
    f" VALUES('{H['projectId']}','auth','{H['epoch']}','{H['restoreFence']}','{H['transitionId']}','{uuid.uuid4()}','native','{cut}','{H['manifestDigest']}','{H['sourceFenceReceipt']}','{H['approvalReceipt']}','{prep}','{act}',NULL);\n")
Path(out + '.sql').write_text(sql)
print('authority prepared', out)
