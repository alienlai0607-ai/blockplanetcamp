#!/usr/bin/env python3
"""Validate a TPD1 package and optionally embed it in a StopWatch source tree. Never flashes."""
from pathlib import Path
import argparse,hashlib,json,os,shlex,struct,sys,tempfile,zlib
HEADER=144

def inspect(data):
    def bad():raise ValueError('Invalid TPD1 package; no source files were changed.')
    if len(data)<HEADER or len(data)>65536 or data[:4]!=b'TPD1':bad()
    u16=lambda at:struct.unpack_from('<H',data,at)[0]
    u32=lambda at:struct.unpack_from('<I',data,at)[0]
    if u16(4)!=1 or u16(6)!=HEADER or u32(8)!=len(data) or u16(16)!=1 or u32(24):bad()
    if zlib.crc32(data[:12]+b'\0'*4+data[16:])!=u32(12):bad()
    w,h,frames,fps,bg,count=data[18:24]
    if w not in (16,32,64) or w!=h or not 1<=frames<=4 or not 1<=fps<=8 or bg!=64 or count!=frames+3:bad()
    decoded=frames*(w*h*2+w*h//8)+24576
    if u32(28)!=decoded:bad()
    offset=HEADER
    for i in range(7):
        at=32+i*16
        if i>=count:
            if any(data[at:at+16]):bad()
            continue
        kind,index,encoding,mask=data[at:at+4]
        start,colors,maskbytes=struct.unpack_from('<III',data,at+4)
        sprite=i<frames;n=w*h if sprite else 4096
        if kind!=(0 if sprite else i-frames+1) or index!=(i if sprite else 0) or encoding not in (0,1) or mask!=int(sprite) or start!=offset or maskbytes!=(n//8 if sprite else 0) or not colors or colors+maskbytes>len(data)-offset:bad()
        if encoding==0:
            if colors!=n*2:bad()
        else:
            if colors%4:bad()
            total=0
            for run,color in struct.iter_unpack('<HH',data[offset:offset+colors]):
                if not run or run>n-total:bad()
                total+=run
            if total!=n:bad()
        offset+=colors+maskbytes
    if offset!=len(data):bad()
    return dict(format='TPD1',profile='StopWatch C152',bytes=len(data),decoded_bytes=decoded,background_runtime_bytes=24576,width=w,frames=frames,fps=fps,sha256=hashlib.sha256(data).hexdigest())

def atomic(path,data):
    fd,name=tempfile.mkstemp(prefix=path.name+'.',suffix='.tmp',dir=path.parent)
    try:
        with os.fdopen(fd,'wb') as f:f.write(data);f.flush();os.fsync(f.fileno())
        os.replace(name,path)
    finally:
        if os.path.exists(name):os.unlink(name)

def install(data,firmware):
    metadata=inspect(data)
    firmware=Path(firmware)
    if not (firmware/'TamaPoke.ino').is_file() or not (firmware/'trainer_scene.cpp').is_file():raise ValueError('Select the updated StopWatch firmware/TamaPoke directory.')
    source='#include "custom_scene_data.h"\nconst uint8_t CUSTOM_SCENE_DATA[] = {\n'
    source+='\n'.join('  '+','.join(f'0x{v:02x}' for v in data[i:i+24])+',' for i in range(0,len(data),24))
    source+='\n};\nconst size_t CUSTOM_SCENE_SIZE = sizeof(CUSTOM_SCENE_DATA);\n'
    target=firmware/'custom_scene_data.cpp'
    if target.exists():
        previous=target.read_bytes();backup=firmware.parent/'trainer_source_backups';backup.mkdir(exist_ok=True)
        saved=backup/('custom_scene_'+hashlib.sha256(previous).hexdigest()[:16]+'.cpp')
        if not saved.exists():atomic(saved,previous)
    atomic(target,source.encode())
    return metadata

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('package',type=Path,nargs='?')
    parser.add_argument('--firmware',type=Path,help='Updated firmware/TamaPoke directory')
    parser.add_argument('--install',action='store_true',help='Replace only the embedded scene source after validation')
    args=parser.parse_args()
    try:
        if args.package is None:
            raw=input('請拖入從網站下載的 .tpdevice 檔案，再按 Enter：').strip()
            if not raw:raise ValueError('沒有選擇檔案，未修改任何資料。')
            if Path(raw).expanduser().is_file():args.package=Path(raw).expanduser()
            else:
                parts=shlex.split(raw)
                if len(parts)!=1:raise ValueError('請一次選擇一個素材檔。')
                args.package=Path(parts[0]).expanduser()
        if args.package.stat().st_size>65536:raise ValueError('Package exceeds 64 KiB.')
        data=args.package.read_bytes()
        if args.install and not args.firmware:raise ValueError('--install requires --firmware')
        result=install(data,args.firmware) if args.install else inspect(data)
        result['source_installed']=args.install;result['device_written']=False
        print(json.dumps(result,ensure_ascii=False,indent=2))
        if args.install:print('素材原始碼已更新。下一步重新編譯；本工具沒有寫入開發板。')
        return 0
    except (OSError,ValueError,EOFError) as e:print(str(e),file=sys.stderr);return 1
if __name__=='__main__':sys.exit(main())
