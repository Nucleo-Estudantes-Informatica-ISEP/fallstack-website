"""Host-side cgroup/AuthNEI sampler for the isolated capacity453v3 stack."""
import json,time,pathlib,subprocess,urllib.request,datetime,signal
out=pathlib.Path('/tmp/fallstack-capacity-v3/resources.jsonl').open('a',buffering=1)
while True:
 started=time.monotonic(); row={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 try:
  cs=json.loads(subprocess.check_output(['docker','inspect']+subprocess.check_output(['docker','ps','-aq'],text=True).split(),stderr=subprocess.DEVNULL))
  selected=[c for c in cs if c['Name'].startswith('/capacity453v3-') or any(x in c['Name'] for x in ['zitadel-','login-','db-x13','db-skoc','coolify-proxy'])]
  proxy=pathlib.Path('/data/coolify/proxy/dynamic/capacity453v3.yaml')
  config=json.loads(proxy.read_text())['http'] if proxy.exists() else {}
  service=config.get('services',{}).get('capacity453v3',{})
  servers=service.get('loadBalancer',{}).get('servers',[])
  row['test_proxy_owned']=bool(servers) and all(x['url'] in [f'http://capacity453v3-web-{i}:4000' for i in range(1,5)] for x in servers) and all(x.get('service')=='capacity453v3' for x in config.get('routers',{}).values())
  row['test_web_running']=sum(c['Name'].startswith('/capacity453v3-web-') and c['State']['Running'] for c in cs)
  row['containers']=[]
  for c in selected:
   x={'name':c['Name'][1:],'running':c['State']['Running'],'oom':c['State']['OOMKilled'],'restarts':c['RestartCount'],'cpu_limit':c['HostConfig']['NanoCpus']/1e9,'memory_limit':c['HostConfig']['Memory']}
   cg=pathlib.Path('/sys/fs/cgroup/system.slice/docker-'+c['Id']+'.scope')
   if cg.exists():
    for name in ['cpu.stat','memory.current','memory.peak','memory.events','memory.swap.current']:
     try:x[name]=(cg/name).read_text().strip()
     except OSError:pass
   row['containers'].append(x)
  row['meminfo']={k:int(v.split()[0])*1024 for k,v in (l.split(':') for l in pathlib.Path('/proc/meminfo').read_text().splitlines()) if k in ['MemTotal','MemAvailable','SwapTotal','SwapFree']}
  row['vmstat']={k:int(v) for k,v in (l.split() for l in pathlib.Path('/proc/vmstat').read_text().splitlines()) if k in ['pswpin','pswpout','oom_kill']}
  row['cpu']=pathlib.Path('/proc/stat').read_text().splitlines()[0]
  row['load']=pathlib.Path('/proc/loadavg').read_text().strip()
  try:
   row['postgres']=json.loads(subprocess.check_output(['docker','exec','capacity453v3-postgres-1','psql','-U','postgres','-d','postgres','-Atc',"SELECT row_to_json(s) FROM (SELECT numbackends,xact_commit,xact_rollback,deadlocks,temp_bytes,blk_read_time,blk_write_time FROM pg_stat_database WHERE datname='postgres') s;"],text=True))
  except Exception: row['postgres']=None
  origins=[]
  for role,prefix in [('auth_dev_origin','/zitadel-x13x0b0xscm6klv80nqpy4qa-'),('auth_prod_origin','/zitadel-skoc4c8c4o4cwcos0gws4ckc-')]:
   container=next(c for c in cs if c['Name'].startswith(prefix) and c['State']['Running'])
   ip=next(n['IPAddress'] for n in container['NetworkSettings']['Networks'].values() if n.get('IPAddress'))
   origins.append((role,'http://'+ip+':8080/debug/ready'))
  for name,url in origins+[('auth_dev','https://auth.dev.nei-isep.org/debug/ready'),('auth_prod','https://auth.nei-isep.org/debug/ready')]:
   t=time.monotonic()
   try:
    with urllib.request.urlopen(url,timeout=3) as r:row[name]={'status':r.status,'ms':round((time.monotonic()-t)*1000,2)}
   except Exception as e:row[name]={'status':getattr(e,'code',0)}
 except Exception as e:row['sampler_error']=type(e).__name__
 out.write(json.dumps(row)+'\n');time.sleep(max(0,5-(time.monotonic()-started)))
