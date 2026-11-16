from pathlib import Path
import subprocess,json,hashlib,re,time,os
root=Path.cwd(); website=root/'teacher-tools/pokemon-trainer'
fqbn='esp32:esp32:esp32s3:CDCOnBoot=cdc,FlashSize=16M,PSRAM=opi,PartitionScheme=app3M_fat9M_16MB'
for folder,board,target in [('TamaPoke_StopWatch_dev','stopwatch-c152','M5Stack StopWatch C152'),('TamaPoke_Waveshare175G_dev','waveshare-175g','Waveshare ESP32-S3-Touch-AMOLED-1.75G')]:
 project=root/'.tama-build'/folder; source=project/'firmware/TamaPoke'; out=project/'firmware_bin';out.mkdir(exist_ok=True)
 verify=project/'verification';verify.mkdir(exist_ok=True)
 print('Compiling '+board,flush=True);start=time.time()
 subprocess.run(['arduino-cli','compile','--fqbn',fqbn,'--jobs','2','--warnings','all','--build-property','compiler.c.elf.extra_flags=-Wl,--strip-debug','--build-path',str(root/'.tama-build/cache'/board),'--output-dir',str(out),str(source)],check=True)
 sources={str(p.relative_to(source)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(source.rglob('*')) if p.is_file() and p.relative_to(source).parts[0]!='build'}
 status={'status':'compiled','target':target,'fqbn':fqbn,'flashed':False,'hardware_tested':False,'elapsed_seconds':round(time.time()-start),'binaries':[{'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(out.glob('*.bin'))]}
 (verify/'build_status.json').write_text(json.dumps(status,indent=2));(verify/'built_source_sha256.json').write_text(json.dumps(sources,indent=2))
 subprocess.run(['make','asan'],cwd=project/'upstream_tests',check=True)
 subprocess.run(['c++','-std=c++17','-O1','-fsanitize=address,undefined',str(project/'tests/link_tests.cpp'),'-o',str(project/'link-tests')],check=True)
 subprocess.run([str(project/'link-tests')],check=True)
 subprocess.run(['python3',str(project/'tools/package_release.py'),str(website)],check=True)
subprocess.run(['npm','ci','--ignore-scripts'],cwd=website,check=True)
subprocess.run(['npm','test'],cwd=website,check=True)
