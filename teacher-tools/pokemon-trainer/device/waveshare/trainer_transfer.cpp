#include "trainer_transfer.h"
#include "trainer_store.h"
#include "trainer_scene.h"
#include <esp_partition.h>
#include <esp_system.h>

namespace {
class PartitionFlash:public TrainerStore::Flash {
 public:
  const esp_partition_t *partition=nullptr;
  bool range(uint32_t offset,size_t size){return partition&&offset<=partition->size&&size<=partition->size-offset;}
  bool artworkRange(uint32_t offset,size_t size){return range(offset,size)&&offset<=TrainerStore::RESERVED_SIZE&&size<=TrainerStore::RESERVED_SIZE-offset;}
  bool read(uint32_t o,uint8_t*p,size_t n)override{return range(o,n)&&esp_partition_read(partition,o,p,n)==ESP_OK;}
  bool erase(uint32_t o,size_t n)override{return artworkRange(o,n)&&esp_partition_erase_range(partition,o,n)==ESP_OK;}
  bool write(uint32_t o,const uint8_t*p,size_t n)override{return artworkRange(o,n)&&esp_partition_write(partition,o,p,n)==ESP_OK;}
  void breathe()override{delay(1);}
} flash;
TrainerStore::Store store(flash);
uint8_t *incoming=nullptr;
uint32_t expected=0,received=0,expectedCRC=0,lastActivity=0;
char session[9]={},committed[9]={};
bool partitionOK=false,storageLoaded=false;
void abortTransfer(){free(incoming);incoming=nullptr;expected=received=expectedCRC=0;session[0]=0;}
bool number(const char*s,uint32_t&value,int base=10){
  if(!s||!*s)return false;uint64_t n=0;
  for(;*s;s++){int digit=*s>='0'&&*s<='9'?*s-'0':*s>='a'&&*s<='f'?*s-'a'+10:*s>='A'&&*s<='F'?*s-'A'+10:99;if(digit>=base)return false;n=n*base+digit;if(n>0xffffffffu)return false;}
  value=uint32_t(n);return true;
}
bool tokenOK(const char*s){uint32_t ignored;return s&&strlen(s)==8&&number(s,ignored,16);}
void reply(const char*token,const char*kind,const char*message){Serial.printf("TP %s %s %s\n",token,kind,message);}
void info(const char*token,const char*version){
  Serial.printf("TP %s INFO protocol=1 board=waveshare-175g fw=%s max=65536 chunk=256 storage=%s size=%lu crc=%08lx generation=%lu capabilities=backgrounds\n",token,version,
    partitionOK&&storageLoaded?store.state():"blocked",(unsigned long)store.active.size,(unsigned long)store.active.crc,(unsigned long)store.active.sequence);
}
}
void trainerTransferBegin(){
  flash.partition=esp_partition_find_first(ESP_PARTITION_TYPE_DATA,ESP_PARTITION_SUBTYPE_DATA_FAT,"ffat");
  partitionOK=flash.partition&&flash.partition->address==TrainerStore::PARTITION_ADDRESS&&flash.partition->size==TrainerStore::PARTITION_SIZE&&!flash.partition->encrypted;
  if(!partitionOK){flash.partition=nullptr;return;}
  auto *scratch=static_cast<uint8_t*>(ps_malloc(TrainerAssets::MAX_BYTES));
  if(!scratch)return;
  size_t size=store.load(scratch,TrainerAssets::MAX_BYTES);storageLoaded=true;
  if(size){auto *scene=trainerScenePrepare(scratch,size);if(scene)trainerScenePublish(scene);}
  free(scratch);
}
void trainerTransferTick(uint32_t now){if(incoming&&uint32_t(now-lastActivity)>30000)abortTransfer();}
bool trainerTransferCommand(const String &line,const char *version){
  if(!line.startsWith("TP "))return false;
  // At most one 256-byte hex chunk per line. No command can name a flash offset.
  if(line.length()>600)return true;
  char text[601];memcpy(text,line.c_str(),line.length()+1);char*save=nullptr;
  strtok_r(text," ",&save);char *token=strtok_r(nullptr," ",&save),*command=strtok_r(nullptr," ",&save);
  if(!tokenOK(token)||!command)return true;
  char *a=strtok_r(nullptr," ",&save),*b=strtok_r(nullptr," ",&save),*extra=strtok_r(nullptr," ",&save);
  if(!strcmp(command,"HELLO")&&!a){info(token,version);return true;}
  if(!strcmp(command,"ABORT")&&!a){if(!incoming||!strcmp(token,session)){abortTransfer();reply(token,"ABORTED","ok");}else reply(token,"ERR","busy");return true;}
  if(!strcmp(command,"BEGIN")){
    uint32_t size,crc;
    if(extra||!number(a,size)||!b||strlen(b)!=8||!number(b,crc,16)||size<TrainerAssets::HEADER||size>TrainerAssets::MAX_BYTES){reply(token,"ERR","invalid_size");return true;}
    if(!partitionOK||!storageLoaded||!store.available()){reply(token,"ERR","storage_blocked");return true;}
    if(incoming){if(!strcmp(token,session)&&size==expected&&crc==expectedCRC){Serial.printf("TP %s READY %lu\n",token,(unsigned long)received);lastActivity=millis();}else reply(token,"ERR","busy");return true;}
    incoming=static_cast<uint8_t*>(ps_malloc(size));if(!incoming){reply(token,"ERR","memory");return true;}
    expected=size;expectedCRC=crc;received=0;strcpy(session,token);committed[0]=0;lastActivity=millis();reply(token,"READY","0");return true;
  }
  if(!strcmp(command,"COMMIT")&&!a&&!incoming&&!strcmp(token,committed)){
    Serial.printf("TP %s STORED %lu %08lx\n",token,(unsigned long)store.active.size,(unsigned long)store.active.crc);return true;
  }
  if(!incoming||strcmp(token,session)){reply(token,"ERR","no_session");return true;}
  lastActivity=millis();
  if(!strcmp(command,"DATA")){
    uint32_t offset;size_t chars=b?strlen(b):0;uint8_t chunk[256];
    if(extra||!number(a,offset)||!chars||chars%2||chars>512||offset>expected||chars/2>expected-offset){reply(token,"ERR","invalid_chunk");return true;}
    for(size_t i=0;i<chars/2;i++){char hex[3]={b[2*i],b[2*i+1],0};uint32_t n;if(!number(hex,n,16)){reply(token,"ERR","invalid_hex");return true;}chunk[i]=uint8_t(n);}
    size_t size=chars/2;
    if(offset==received){memcpy(incoming+offset,chunk,size);received+=size;}
    else if(offset>received||size>received-offset||memcmp(incoming+offset,chunk,size)){reply(token,"ERR","offset");return true;}
    Serial.printf("TP %s ACK %lu\n",token,(unsigned long)received);return true;
  }
  if(!strcmp(command,"COMMIT")&&!a){
    TrainerAssets::Package p;
    if(received!=expected){reply(token,"ERR","incomplete");return true;}
    if(!p.load(incoming,expected)||TrainerAssets::u32(incoming+12)!=expectedCRC){reply(token,"ERR","invalid_package");abortTransfer();return true;}
    auto *scene=trainerScenePrepare(incoming,expected);
    if(!scene){reply(token,"ERR","memory");abortTransfer();return true;}
    if(!store.commit(incoming,expected)){free(scene);reply(token,"ERR",store.available()?"storage_write":"storage_blocked");abortTransfer();return true;}
    trainerScenePublish(scene);strcpy(committed,token);abortTransfer();
    Serial.printf("TP %s STORED %lu %08lx\n",token,(unsigned long)store.active.size,(unsigned long)store.active.crc);return true;
  }
  reply(token,"ERR","invalid_command");return true;
}
