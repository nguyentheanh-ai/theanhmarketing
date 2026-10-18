#!/usr/bin/env python3
"""Default PLAN_ONLY; --run tests source settlement against an encrypted local clone.

Never contacts a provider. PostgreSQL outbound is OS-denied; cron/pg_net inert.
PostgREST exposes only a QA-filtered, updatable view, not customer tables/RPCs.
The ephemeral clone is dropped in finally; original restore and dump stay intact.
"""
import argparse,base64,hashlib,hmac,importlib.util,json,os,re,secrets,subprocess,tempfile,time,urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('restore',ROOT/'scripts/restore-check.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--run',action='store_true');parser.add_argument('--candidate-index',action='store_true');parser.add_argument('--worker-webhook',action='store_true');args=parser.parse_args()
    if not args.run:
        print(json.dumps({'mode':'PLAN_ONLY','productionContacted':False,'usesEncryptedLocalClone':True}));return 0
    os.umask(0o077)
    db='qa_payment_'+secrets.token_hex(6);prefix='TAMCFQA'+secrets.token_hex(6).upper()
    started=False;created=False;rest=None;result=1
    report_path=ROOT/'main/reports/cloudflare-handoff-20261018'/('source-webhook-workers.json' if args.worker_webhook else 'source-payment-local-candidate.json' if args.candidate_index else 'source-payment-local-baseline.json')
    env=dict(os.environ,PGHOST=str(m.SOCKET),PGPORT=m.PORT,PGUSER='restore_admin',PGCONNECT_TIMEOUT='10')
    def sql(database,query):
        with (m.VOLUME/'payment-local-errors.log').open('ab') as log:
            r=subprocess.run([str(m.BIN/'psql'),'-X','-qAt','-v','ON_ERROR_STOP=1','-d',database,'-c',query],env=env,stdout=log,stderr=log,timeout=60)
        if r.returncode:raise RuntimeError('Local SQL failed; raw log retained encrypted')
    try:
        m.checked([os.sys.executable,str(m.VOLUME_TOOL),'check'],'encrypted check');m.checked([os.sys.executable,str(m.VOLUME_TOOL),'mount'],'mount')
        if not os.path.ismount(m.VOLUME):raise RuntimeError('encrypted mount missing')
        profile=Path(tempfile.mkdtemp(prefix='tam-payment-local-',dir='/private/tmp'))/'deny-outbound.sb';profile.write_text('(version 1)(allow default)(deny network-outbound)')
        m.SOCKET.mkdir(mode=0o700,exist_ok=True)
        opts=f"-c listen_addresses='' -c unix_socket_directories='{m.SOCKET}' -p {m.PORT} -c shared_preload_libraries=pg_cron,pg_net,pg_stat_statements -c cron.launch_active_jobs=off -c cron.database_name=restore_a -c pg_net.database_name=restore_transport_inert"
        m.checked(['/usr/bin/sandbox-exec','-f',str(profile),str(m.BIN/'pg_ctl'),'-D',str(m.DATA),'-l',str(m.VOLUME/'payment-local-server.log'),'-o',opts,'-w','start'],'isolated start');started=True
        sql('postgres',f'CREATE DATABASE {db} TEMPLATE restore_a');created=True
        sql(db,"CREATE SCHEMA qa_transport; CREATE VIEW qa_transport.orders AS SELECT * FROM public.orders WHERE order_code LIKE '"+prefix+"%' WITH LOCAL CHECK OPTION;")
        # Clone-only fixtures; no student, email or payment provider is involved.
        for suffix in 'ABCDEFGHIJKLMNO':
            status='expired' if suffix=='C' else 'pending'
            expires="now()-interval '1 hour'" if suffix=='C' else "now()+interval '1 hour'"
            sql(db,f"INSERT INTO public.orders(order_code,student_name,email,phone,course_slug,course_title,amount,status,expires_at,order_items) VALUES('{prefix+suffix}','Cloudflare local QA','migration-qa@example.invalid','','cf-local-qa','Local isolated fixture',2000,'{status}',{expires},'[]'::jsonb)")
        if args.worker_webhook:
            sql(db,"UPDATE public.orders SET accounting_email_sent_at=now(),purchase_event_sent=true WHERE order_code LIKE '"+prefix+"%'")
        if args.candidate_index:
            migration=ROOT/'main/supabase/migrations/20261018_sepay_transaction_uniqueness.sql'
            if not migration.is_file():raise RuntimeError('Reviewed local candidate migration missing')
            sql(db,migration.read_text())
        jwt_secret=secrets.token_urlsafe(32)
        def enc(value):return base64.urlsafe_b64encode(json.dumps(value,separators=(',',':')).encode()).decode().rstrip('=')
        message=enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'role':'restore_admin','exp':int(time.time())+300})
        jwt=message+'.'+base64.urlsafe_b64encode(hmac.new(jwt_secret.encode(),message.encode(),hashlib.sha256).digest()).decode().rstrip('=')
        config=m.VOLUME/'payment-local-postgrest.conf'
        config.write_text(f'db-uri = "host={m.SOCKET} port={m.PORT} user=restore_admin dbname={db}"\ndb-schemas = "qa_transport"\ndb-anon-role = "restore_admin"\ndb-channel-enabled = false\nserver-host = "127.0.0.1"\nserver-port = 55449\njwt-secret = "{jwt_secret}"\n')
        rest_env=dict(env,DYLD_LIBRARY_PATH=str(ROOT/'.tools/postgresql-17/lib'))
        with (m.VOLUME/'payment-local-postgrest.log').open('ab') as log:
            rest=subprocess.Popen([str(ROOT/'.tools/postgrest-16.4/postgrest'),str(config)],env=rest_env,stdout=log,stderr=log)
        for attempt in range(30):
            if rest.poll() is not None:raise RuntimeError('Local PostgREST failed; log encrypted')
            try:
                with urllib.request.urlopen('http://127.0.0.1:55449/',timeout=1) as response:
                    if response.status==200:break
            except Exception:time.sleep(.1)
        else:raise RuntimeError('Local PostgREST readiness timeout')
        run_env={k:v for k,v in os.environ.items() if not any(s in k for s in ('SUPABASE','SEPAY','META_','RESEND','TELEGRAM'))}
        run_env.update(TAM_QA_POSTGREST_ORIGIN='http://127.0.0.1:55449',TAM_QA_ORDER_PREFIX=prefix,TAM_QA_API_JWT=jwt,TAM_QA_REPORT=str(report_path))
        r=subprocess.run(['node','--import','tsx','scripts/test-source-webhook-workers.mjs' if args.worker_webhook else 'scripts/test-source-payment-local.mjs'],cwd=ROOT/'main',env=run_env,capture_output=True,text=True,timeout=90)
        if not report_path.is_file():raise RuntimeError('Service harness failed before report; raw output withheld')
        report=json.loads(report_path.read_text());report.update(candidateIndexAppliedToCloneOnly=args.candidate_index,realPostgrest=True,originalRestoreChanged=False);result=r.returncode
    except Exception as error:
        report={'status':'BLOCKED','reason':str(error),'productionContacted':False}
    finally:
        if rest is not None:
            rest.terminate()
            try:rest.wait(timeout=10)
            except subprocess.TimeoutExpired:rest.kill();rest.wait(timeout=5)
        cleanup_errors=[]
        if created:
            try:sql('postgres',f'DROP DATABASE {db} WITH (FORCE)');report['ephemeralCloneDropped']=True
            except Exception:cleanup_errors.append('clone_drop_failed')
        if started:
            try:m.checked([str(m.BIN/'pg_ctl'),'-D',str(m.DATA),'-m','fast','-w','stop'],'stop');report['localServerStopped']=True
            except Exception:cleanup_errors.append('server_stop_failed')
        if os.path.ismount(m.VOLUME):
            try:m.checked([os.sys.executable,str(m.VOLUME_TOOL),'unmount'],'unmount');report['encryptedVolumeUnmounted']=True
            except Exception:cleanup_errors.append('encrypted_unmount_failed')
        if cleanup_errors:report['cleanupErrors']=cleanup_errors;result=1
        report_path.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report));return result

if __name__=='__main__':raise SystemExit(main())
