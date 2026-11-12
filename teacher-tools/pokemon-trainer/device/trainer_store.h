#pragma once
#include "trainer_assets.h"

// Raw artwork store in the first 140 KiB of the exactly matched ffat partition.
// Claim ONLY erased reserved sectors; leave the rest of the partition untouched.
namespace TrainerStore {
constexpr uint32_t PARTITION_ADDRESS=0x610000, PARTITION_SIZE=0x9e0000;
constexpr uint32_t FIRST=0x1000, SLOT_SIZE=0x11000, PAYLOAD=0x1000;
constexpr uint32_t RESERVED_SIZE=FIRST+2*SLOT_SIZE;
static_assert(RESERVED_SIZE==0x23000&&RESERVED_SIZE<=PARTITION_SIZE,"artwork bounds");
inline void put32(uint8_t*p,uint32_t n){for(int i=0;i<4;i++)p[i]=uint8_t(n>>(i*8));}
inline uint32_t checksum(const uint8_t*p,size_t n){uint32_t c=~0u;for(size_t i=0;i<n;i++){c^=p[i];for(int b=0;b<8;b++)c=(c>>1)^((c&1)?0xedb88320u:0);}return ~c;}
struct Flash {
  virtual bool read(uint32_t offset,uint8_t*out,size_t size)=0;
  virtual bool erase(uint32_t offset,size_t size)=0;
  virtual bool write(uint32_t offset,const uint8_t*data,size_t size)=0;
  virtual void breathe(){}
  virtual ~Flash(){}
};
struct Record {uint32_t sequence=0,size=0,crc=0;int slot=-1;};
class Store {
  Flash &flash;
  bool owned=false,blocked=false;
  bool header(int slot,Record &r){
    uint8_t h[32];if(!flash.read(FIRST+slot*SLOT_SIZE,h,sizeof h))return false;
    if(memcmp(h,"TPS1",4)||TrainerAssets::u32(h+4)!=1||!TrainerAssets::u32(h+8)||TrainerAssets::u32(h+12)<TrainerAssets::HEADER||TrainerAssets::u32(h+12)>TrainerAssets::MAX_BYTES||TrainerAssets::u32(h+20)!=1||TrainerAssets::u32(h+24)||TrainerAssets::u32(h+28)!=checksum(h,28))return false;
    r.sequence=TrainerAssets::u32(h+8);r.size=TrainerAssets::u32(h+12);r.crc=TrainerAssets::u32(h+16);r.slot=slot;return true;
  }
  void ownerHeader(uint8_t*h){memset(h,0,32);memcpy(h,"TPO1",4);put32(h+4,1);put32(h+8,PARTITION_ADDRESS);put32(h+12,PARTITION_SIZE);put32(h+16,FIRST);put32(h+20,SLOT_SIZE);put32(h+24,2);put32(h+28,checksum(h,28));}
  bool claim(){
    if(blocked)return false;if(owned)return true;
    uint8_t b[1024];
    for(uint32_t offset=0;offset<RESERVED_SIZE;offset+=sizeof b){
      if(!flash.read(offset,b,sizeof b)){blocked=true;return false;}
      for(uint8_t byte:b)if(byte!=0xff){blocked=true;return false;}
      flash.breathe();
    }
    uint8_t h[32],check[32];ownerHeader(h);
    if(!flash.write(0,h,sizeof h)||!flash.read(0,check,sizeof check)||memcmp(h,check,sizeof h)){blocked=true;return false;}
    owned=true;return true;
  }
 public:
  Record active;
  explicit Store(Flash&f):flash(f){}
  const char*state()const{return blocked?"blocked":owned?"ready":"unclaimed";}
  bool available()const{return !blocked;}
  // Caller supplies bounded scratch memory. A corrupt newer slot falls back to the older one.
  size_t load(uint8_t*out,size_t capacity){
    active=Record();owned=false;blocked=false;
    uint8_t h[32],expected[32];ownerHeader(expected);
    if(!flash.read(0,h,sizeof h)){blocked=true;return 0;}
    if(memcmp(h,expected,sizeof h)){
      for(uint8_t b:h)if(b!=0xff){blocked=true;break;}
      return 0;
    }
    owned=true;Record candidates[2];bool valid[2]={header(0,candidates[0]),header(1,candidates[1])};
    int first=(valid[1]&&(!valid[0]||candidates[1].sequence>candidates[0].sequence))?1:0;
    for(int n=0;n<2;n++){
      int slot=n?1-first:first;Record&r=candidates[slot];
      if(!valid[slot]||!out||capacity<r.size)continue;
      if(!flash.read(FIRST+slot*SLOT_SIZE+PAYLOAD,out,r.size))continue;
      TrainerAssets::Package p;
      if(p.load(out,r.size)&&TrainerAssets::u32(out+12)==r.crc){active=r;return r.size;}
    }
    return 0;
  }
  bool commit(const uint8_t*data,size_t size){
    TrainerAssets::Package p;if(!p.load(data,size)||active.sequence==0xffffffffu||!claim())return false;
    const int slot=active.slot==0?1:0;const uint32_t base=FIRST+slot*SLOT_SIZE;
    // Erase only the inactive slot. The old slot and owner record remain untouched.
    for(uint32_t off=0;off<SLOT_SIZE;off+=4096){if(!flash.erase(base+off,4096))return false;flash.breathe();}
    uint8_t check[256];
    for(size_t offset=0;offset<size;offset+=sizeof check){
      size_t count=size-offset<sizeof check?size-offset:sizeof check;
      if(!flash.write(base+PAYLOAD+offset,data+offset,count)||!flash.read(base+PAYLOAD+offset,check,count)||memcmp(data+offset,check,count))return false;
      flash.breathe();
    }
    uint8_t h[32]={};memcpy(h,"TPS1",4);put32(h+4,1);put32(h+8,active.sequence+1);put32(h+12,size);put32(h+16,TrainerAssets::u32(data+12));put32(h+20,1);put32(h+28,checksum(h,28));
    // Publication is the final write; both header and payload are validated on boot.
    if(!flash.write(base,h,sizeof h)||!flash.read(base,check,sizeof h)||memcmp(h,check,sizeof h))return false;
    active.sequence++;active.size=size;active.crc=TrainerAssets::u32(data+12);active.slot=slot;return true;
  }
};
}
