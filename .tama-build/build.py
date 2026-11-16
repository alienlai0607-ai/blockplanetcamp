from pathlib import Path
import subprocess,json,hashlib,re,time,os
root=Path.cwd(); website=root/'teacher-tools/pokemon-trainer'
fqbn='esp32:esp32:esp32s3:CDCOnBoot=cdc,FlashSize=16M,PSRAM=opi,PartitionScheme=app3M_fat9M_16MB'
subprocess.run(['npm','ci','--ignore-scripts'],cwd=website,check=True)
subprocess.run(['node','--test','tests/ui.test.mjs','tests/usb-ui.test.mjs','tests/custom-food.test.mjs','tests/usb.test.mjs'],cwd=website,check=True)
for folder,board,target in [('TamaPoke_StopWatch_dev','stopwatch-c152','M5Stack StopWatch C152'),('TamaPoke_Waveshare175G_dev','waveshare-175g','Waveshare ESP32-S3-Touch-AMOLED-1.75G')]:
 project=root/'.tama-build'/folder; source=project/'firmware/TamaPoke'; out=project/'firmware_bin';out.mkdir(exist_ok=True)
 verify=project/'verification';verify.mkdir(exist_ok=True)
 subprocess.run(['make','asan'],cwd=project/'upstream_tests',check=True)
 subprocess.run(['python3',str(project/'tests/check_together.py')],check=True)
 subprocess.run(['python3',str(project/'tests/check_boot_intro.py')],check=True)
 subprocess.run(['python3',str(project/'tests/check_shutdown.py')],check=True)
 subprocess.run(['c++','-std=c++17','-O1','-fsanitize=address,undefined',str(project/'tests/link_tests.cpp'),'-o',str(project/'link-tests')],check=True)
 subprocess.run([str(project/'link-tests')],check=True)
 actual={str(p.relative_to(source)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(source.rglob('*')) if p.is_file() and p.relative_to(source).parts[0]!='build'}
 expected_path=verify/'built_source_sha256.json'
 reuse=expected_path.exists() and json.loads(expected_path.read_text())==actual
 if reuse:
  import zipfile
  public=website/'firmware'/('stopwatch' if board=='stopwatch-c152' else board)
  manifest=json.loads((public/'manifest.json').read_text())
  for entry in manifest['files']:
   payload=(public/entry['file']).read_bytes();assert len(payload)==entry['bytes'] and hashlib.sha256(payload).hexdigest()==entry['sha256']
  assert hashlib.sha256((public/'source.zip').read_bytes()).hexdigest()==manifest['source']['sha256']
  print('Reusing verified binaries: firmware sources are byte-identical for '+board,flush=True)
 else:
  print('Compiling '+board,flush=True)
 start=time.time()
 if not reuse:
  subprocess.run(['arduino-cli','compile','--fqbn',fqbn,'--jobs','2','--warnings','all','--build-property','compiler.c.elf.extra_flags=-Wl,--strip-debug','--build-path',str(root/'.tama-build/cache'/board),'--output-dir',str(out),str(source)],check=True)
  sources={str(p.relative_to(source)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(source.rglob('*')) if p.is_file() and p.relative_to(source).parts[0]!='build'}
  status={'status':'compiled','target':target,'fqbn':fqbn,'flashed':False,'hardware_tested':False,'elapsed_seconds':round(time.time()-start),'binaries':[{'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(out.glob('*.bin'))]}
  (verify/'build_status.json').write_text(json.dumps(status,indent=2));(verify/'built_source_sha256.json').write_text(json.dumps(sources,indent=2))
 if not reuse:
  subprocess.run(['python3',str(project/'tools/package_release.py'),str(website)],check=True)
 else:
  # Repackage source-only docs/tests without changing or claiming a new binary build.
  prefix=folder+'/'
  with zipfile.ZipFile(public/'source.zip') as original: entries={n:original.read(n) for n in original.namelist()}
  for p in project.rglob('*'):
   rel=p.relative_to(project)
   if not p.is_file() or any(x in ['build','__pycache__','firmware_bin'] or x.startswith('.') for x in rel.parts) or p.suffix in ['.log','.pyc']:continue
   if rel.parts[0] in ['tools','tests','upstream_tests','localization','assets','verification'] or str(rel) in ['README.md','CREDITS.md','LICENSE']:entries[prefix+str(rel)]=p.read_bytes()
  with zipfile.ZipFile(public/'source.zip','w',zipfile.ZIP_DEFLATED) as archive:
   for name,data in entries.items():archive.writestr(name,data)
  manifest['source']['sha256']=hashlib.sha256((public/'source.zip').read_bytes()).hexdigest();(public/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
  (public/'README.md').write_bytes((project/'README.md').read_bytes())

subprocess.run(['npm','test'],cwd=website,check=True)
