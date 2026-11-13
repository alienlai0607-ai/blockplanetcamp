#pragma once
#include <stdint.h>
#include <stddef.h>
#include <string.h>
#include "battle_core.h"
#include "trainer_profile.h"

// Same wire format and battle rules on both boards. No persistent game data is written.
namespace LinkGame {
constexpr uint32_t RULES = 0x324C5031; // bump whenever battle rules or wire semantics change
constexpr unsigned WIRE_BYTES=240, FRIEND_LEVEL=50;
constexpr uint32_t RETRY_MS=400, PAUSE_MS=3000, TIMEOUT_MS=20000;
enum Type:uint8_t { Advertise=1, Join, Offer, Confirm, Start, StartAck, Move, Turn, TurnAck, Heartbeat, Quit, ProfileData, ProfileAck };
enum Phase:uint8_t { Closed, Searching, Waiting, Pairing, Starting, Battle, Cancelled, Failed };
enum Error:uint8_t { None, Timeout, Desync, OtherLeft, RadioError };
struct Packet {
  Type type=Advertise;uint8_t flags=0;
  uint64_t session=0,guest=0;
  uint32_t seed=0,round=0,hash=0,before=0;
  uint16_t species[2]={},moves[2]={};uint32_t profileHash=0;uint8_t data[176]={};
};
inline void put32(uint8_t*p,uint32_t n){for(int i=0;i<4;i++)p[i]=uint8_t(n>>(i*8));}
inline uint32_t get32(const uint8_t*p){uint32_t n=0;for(int i=0;i<4;i++)n|=uint32_t(p[i])<<(i*8);return n;}
inline uint32_t crc(const uint8_t*p,size_t n){uint32_t c=~0u;while(n--){c^=*p++;for(int i=0;i<8;i++)c=(c>>1)^((c&1)?0xedb88320u:0);}return ~c;}
inline void encode(const Packet&p,uint8_t*out){
  memset(out,0,WIRE_BYTES);put32(out,0x314c5054);out[4]=2;out[5]=p.type;out[6]=p.flags;out[7]=WIRE_BYTES;
  put32(out+8,RULES);put32(out+12,p.session);put32(out+16,p.session>>32);put32(out+20,p.guest);put32(out+24,p.guest>>32);
  put32(out+28,p.seed);put32(out+32,p.round);put32(out+36,p.hash);put32(out+40,p.before);
  for(int i=0;i<2;i++){out[44+i*2]=p.species[i];out[45+i*2]=p.species[i]>>8;out[48+i*2]=p.moves[i];out[49+i*2]=p.moves[i]>>8;}
  put32(out+52,p.profileHash);memcpy(out+60,p.data,176);put32(out+236,crc(out,236));
}
inline bool decode(const uint8_t*in,size_t n,Packet&p){
  if(n!=WIRE_BYTES||get32(in)!=0x314c5054||in[4]!=2||in[5]<Advertise||in[5]>ProfileAck||in[6]>3||in[7]!=WIRE_BYTES||get32(in+8)!=RULES||get32(in+236)!=crc(in,236))return false;
  for(int i=56;i<60;i++)if(in[i])return false;
  if(in[5]!=ProfileData)for(unsigned i=60;i<236;i++)if(in[i])return false;
  p={};p.profileHash=get32(in+52);memcpy(p.data,in+60,176);p.type=Type(in[5]);p.flags=in[6];p.session=uint64_t(get32(in+12))|(uint64_t(get32(in+16))<<32);p.guest=uint64_t(get32(in+20))|(uint64_t(get32(in+24))<<32);
  p.seed=get32(in+28);p.round=get32(in+32);p.hash=get32(in+36);p.before=get32(in+40);
  for(int i=0;i<2;i++){p.species[i]=uint16_t(in[44+i*2])|(uint16_t(in[45+i*2])<<8);p.moves[i]=uint16_t(in[48+i*2])|(uint16_t(in[49+i*2])<<8);}
  return p.session!=0;
}
inline uint32_t digest(const BattleGame::Engine&e){
  uint32_t h=2166136261u;
  auto add=[&](uint32_t n){for(int i=0;i<4;i++){h^=uint8_t(n>>(i*8));h*=16777619u;}};
  add(e.rounds);add(e.rng);add(e.result);
  for(auto &f:e.f){add(f.species);add(f.level);add(f.form);add(f.hp);add(f.maxHp);for(auto n:f.types)add(n);for(auto n:f.moves)add(n);for(auto n:f.stats)add(n);for(auto n:f.cooldown)add(n);
    add(f.burn);add(f.poison);add(f.slow);add(f.defDown);add(f.spaDown);add(f.spdDown);add(f.guard);add(f.transformed);add(f.confusion);}
  return h;
}
inline bool validSpecies(uint16_t id){return id>=1&&id<=151;}
inline bool sameMac(const uint8_t*a,const uint8_t*b){return memcmp(a,b,6)==0;}
inline bool legalMove(const BattleGame::Engine&e,unsigned who,uint16_t move){uint16_t c[2];BattleGame::choices(e.f[who],e.f[1-who],c);return move&&(move==c[0]||move==c[1]);}
struct Room {uint8_t mac[6]={};uint64_t session=0;uint32_t seed=0,seen=0,profileHash=0;uint16_t species=0;};
using Send=void(*)(void*,const uint8_t*,const Packet&);
struct Session {
  Phase phase=Closed;Error error=None;bool host=false,offered=false,confirmed=false,peerConfirmed=false,awaitAck=false;
  uint16_t ownSpecies=0,species[2]={},choice=0,remoteChoice=0;
  uint64_t session=0,guest=0;uint32_t seed=0,lastSeen=0,lastTx=0,serial=0;
  uint8_t peer[6]={};Room rooms[4];BattleGame::Engine engine;Packet lastTurn;
  static constexpr unsigned CHUNK=176,CHUNKS=(TrainerProfile::BYTES+CHUNK-1)/CHUNK;
  static constexpr uint32_t ALL_CHUNKS=(1u<<CHUNKS)-1;
  const uint8_t*localProfile=TrainerProfile::fallback();
  uint32_t localHash=crc(TrainerProfile::fallback(),TrainerProfile::BYTES),peerHash=0,rxMask=0,txMask=0,lastProfileTx=0;
  unsigned nextChunk=0;bool peerReady=false;uint8_t peerProfile[TrainerProfile::BYTES]={};
  bool profilesReady()const{return peerReady&&txMask==ALL_CHUNKS;}
  bool setProfile(const uint8_t*p){if(phase!=Closed||!TrainerProfile::valid(p))return false;localProfile=p;localHash=crc(p,TrainerProfile::BYTES);return true;}
  Send output=nullptr;void* context=nullptr;
  void reset(Send send,void*ctx){const uint8_t*keep=localProfile;*this=Session();localProfile=keep;localHash=crc(keep,TrainerProfile::BYTES);output=send;context=ctx;}
  bool connected()const{return phase==Pairing||phase==Starting||phase==Battle;}
  bool paused(uint32_t now)const{return connected()&&uint32_t(now-lastSeen)>PAUSE_MS;}
  unsigned side()const{return host?0:1;}
  Packet packet(Type t)const{Packet p;p.type=t;p.profileHash=localHash;p.session=session;p.guest=guest;p.seed=seed;p.species[0]=species[0];p.species[1]=species[1];p.flags=(host?confirmed:peerConfirmed)?1:0;p.flags|=(host?peerConfirmed:confirmed)?2:0;p.round=engine.rounds;p.hash=digest(engine);return p;}
  void emit(const Packet&p,bool broadcast=false){static const uint8_t all[6]={255,255,255,255,255,255};if(output)output(context,broadcast?all:peer,p);}
  void hosting(uint16_t id,uint64_t room,uint32_t random,uint32_t now){auto fn=output;auto ctx=context;reset(fn,ctx);if(!validSpecies(id)||!room)return;host=true;phase=Waiting;ownSpecies=species[0]=id;session=room;seed=random?random:1;lastSeen=now;lastTx=now-RETRY_MS;}
  void search(uint16_t id){auto fn=output;auto ctx=context;reset(fn,ctx);if(validSpecies(id)){phase=Searching;ownSpecies=id;}}
  bool join(unsigned index,uint64_t nonce,uint32_t now){
    if(phase!=Searching||index>=4||!rooms[index].session||uint32_t(now-rooms[index].seen)>PAUSE_MS||!nonce)return false;
    const auto&r=rooms[index];memcpy(peer,r.mac,6);session=r.session;seed=r.seed;peerHash=r.profileHash;guest=nonce;species[0]=r.species;species[1]=ownSpecies;phase=Pairing;lastSeen=now;lastTx=now-RETRY_MS;return true;
  }
  void confirm(uint32_t now){if(phase!=Pairing||!offered||!profilesReady()||paused(now))return;confirmed=true;lastTx=now-RETRY_MS;maybeStart(now);}
  void maybeStart(uint32_t now){if(host&&phase==Pairing&&confirmed&&peerConfirmed&&profilesReady()){engine.init(species[0],FRIEND_LEVEL,species[1],FRIEND_LEVEL,seed);phase=Starting;lastTx=now-RETRY_MS;}}
  bool choose(uint16_t move,uint32_t now){if(phase!=Battle||engine.result!=BattleGame::Playing||choice||awaitAck||paused(now)||!legalMove(engine,side(),move))return false;choice=move;lastTx=now-RETRY_MS;resolve(now);return true;}
  void resolve(uint32_t now){
    if(!host||phase!=Battle||awaitAck||!choice||!remoteChoice||paused(now))return;
    Packet p=packet(Turn);p.before=digest(engine);p.moves[0]=choice;p.moves[1]=remoteChoice;
    if(!engine.turn(choice,remoteChoice)){fail(Desync);return;}
    p.round=engine.rounds;p.hash=digest(engine);lastTurn=p;awaitAck=true;++serial;lastTx=now-RETRY_MS;
  }
  void fail(Error why){error=why;phase=Failed;}
  void cancel(){if(connected())emit(packet(Quit));phase=Cancelled;}
  void receive(const uint8_t*from,const Packet&p,uint32_t now){
    if(phase==Searching&&p.type==Advertise&&validSpecies(p.species[0])&&!p.guest&&p.seed){
      unsigned slot=4;for(unsigned i=0;i<4;i++)if(rooms[i].session==p.session&&sameMac(rooms[i].mac,from)){slot=i;break;}
      if(slot==4)for(unsigned i=0;i<4;i++)if(!rooms[i].session||uint32_t(now-rooms[i].seen)>PAUSE_MS){slot=i;break;}
      if(slot<4){auto&r=rooms[slot];memcpy(r.mac,from,6);r.session=p.session;r.species=p.species[0];r.seed=p.seed;r.seen=now;r.profileHash=p.profileHash;}return;
    }
    if(phase==Waiting&&host&&p.type==Join&&p.session==session&&p.seed==seed&&p.species[0]==ownSpecies&&validSpecies(p.species[1])&&p.guest){
      memcpy(peer,from,6);peerHash=p.profileHash;guest=p.guest;species[1]=p.species[1];offered=true;phase=Pairing;lastSeen=now;lastTx=now-RETRY_MS;return;
    }
    if(!connected()||!sameMac(from,peer)||p.session!=session||p.guest!=guest||p.seed!=seed||p.species[0]!=species[0]||p.species[1]!=species[1]||p.profileHash!=peerHash)return;
    if(p.type==ProfileAck){if(p.hash==localHash&&!(p.before&~ALL_CHUNKS)){txMask|=p.before;lastSeen=now;}return;}
    if(p.type==ProfileData){
      if(p.hash!=peerHash||p.before!=TrainerProfile::BYTES||p.round>=CHUNKS)return;
      unsigned offset=p.round*CHUNK,n=TrainerProfile::BYTES-offset;if(n>CHUNK)n=CHUNK;
      if(p.moves[0]!=n||p.moves[1])return;for(unsigned i=n;i<CHUNK;i++)if(p.data[i])return;
      if((rxMask&(1u<<p.round))&&memcmp(peerProfile+offset,p.data,n)){fail(Desync);return;}
      memcpy(peerProfile+offset,p.data,n);rxMask|=1u<<p.round;
      if(rxMask==ALL_CHUNKS){if(crc(peerProfile,TrainerProfile::BYTES)!=peerHash||!TrainerProfile::valid(peerProfile)){fail(Desync);return;}peerReady=true;}
      lastSeen=now;auto ack=packet(ProfileAck);ack.hash=peerHash;ack.before=rxMask;emit(ack);return;
    }
    if(p.type==Quit){lastSeen=now;fail(OtherLeft);return;}
    if(phase==Pairing){
      if(host&&(p.type==Join||p.type==Confirm)){lastSeen=now;if(p.type==Confirm&&(p.flags&2))peerConfirmed=true;maybeStart(now);return;}
      if(!host&&p.type==Offer){lastSeen=now;offered=true;peerConfirmed=peerConfirmed||(p.flags&1);return;}
      if(!host&&p.type==Start&&offered&&confirmed&&profilesReady()&&p.flags==3&&p.round==0){
        BattleGame::Engine e;e.init(species[0],FRIEND_LEVEL,species[1],FRIEND_LEVEL,seed);if(p.hash!=digest(e)){fail(Desync);return;}
        engine=e;peerConfirmed=true;phase=Battle;lastSeen=now;emit(packet(StartAck));return;
      }
      return;
    }
    if(host&&phase==Starting){if(p.type==StartAck&&p.round==0&&p.hash==digest(engine)){phase=Battle;lastSeen=now;lastTx=now-RETRY_MS;}return;}
    if(phase!=Battle)return;
    if(!host&&p.type==Start&&p.round==0){if(engine.rounds==0&&p.hash==digest(engine)){lastSeen=now;emit(packet(StartAck));}return;}
    if(p.type==Heartbeat){
      if(p.round==engine.rounds&&p.hash!=digest(engine)){fail(Desync);return;}
      if(p.round==engine.rounds||(p.round+1==engine.rounds)||(engine.rounds+1==p.round))lastSeen=now;
      return;
    }
    if(host&&p.type==Move){
      if(p.round==engine.rounds&&!awaitAck&&p.hash==digest(engine)&&legalMove(engine,1,p.moves[1])){
        if(remoteChoice&&remoteChoice!=p.moves[1]){fail(Desync);return;}
        remoteChoice=p.moves[1];lastSeen=now;resolve(now);
      }else if(awaitAck&&p.round+1==engine.rounds&&p.hash==lastTurn.before&&p.moves[1]==lastTurn.moves[1]){lastSeen=now;emit(lastTurn);}
      return;
    }
    if(!host&&p.type==Turn){
      if(p.round==engine.rounds&&p.hash==digest(engine)&&p.before==lastTurn.before&&p.moves[0]==lastTurn.moves[0]&&p.moves[1]==lastTurn.moves[1]){lastSeen=now;emit(packet(TurnAck));return;}
      if(p.round!=engine.rounds+1)return;
      if(!choice||p.moves[1]!=choice||p.before!=digest(engine)||!legalMove(engine,0,p.moves[0])||!legalMove(engine,1,p.moves[1])){fail(Desync);return;}
      auto next=engine;if(!next.turn(p.moves[0],p.moves[1])||p.hash!=digest(next)){fail(Desync);return;}
      engine=next;lastTurn=p;choice=0;++serial;lastSeen=now;emit(packet(TurnAck));return;
    }
    if(host&&p.type==TurnAck&&awaitAck&&p.round==engine.rounds&&p.hash==digest(engine)){awaitAck=false;choice=remoteChoice=0;lastSeen=now;}
  }
  void tick(uint32_t now){
    if(connected()&&uint32_t(now-lastSeen)>TIMEOUT_MS){fail(Timeout);return;}
    if(connected()&&txMask!=ALL_CHUNKS&&uint32_t(now-lastProfileTx)>=80){
      lastProfileTx=now;for(unsigned k=0;k<CHUNKS;k++){unsigned i=(nextChunk+k)%CHUNKS;if(txMask&(1u<<i))continue;
        auto p=packet(ProfileData);p.hash=localHash;p.before=TrainerProfile::BYTES;p.round=i;unsigned offset=i*CHUNK,n=TrainerProfile::BYTES-offset;if(n>CHUNK)n=CHUNK;p.moves[0]=n;p.moves[1]=0;memcpy(p.data,localProfile+offset,n);emit(p);nextChunk=(i+1)%CHUNKS;break;}
    }
    if(uint32_t(now-lastTx)<RETRY_MS)return;lastTx=now;
    if(phase==Waiting){auto p=packet(Advertise);p.guest=0;emit(p,true);}
    else if(phase==Pairing){auto p=packet(host?Offer:confirmed?Confirm:Join);emit(p);}
    else if(phase==Starting)emit(packet(Start));
    else if((phase==Cancelled||phase==Failed)&&session&&guest)emit(packet(Quit));
    else if(phase==Battle){emit(packet(Heartbeat));if(host&&awaitAck)emit(lastTurn);else if(!host&&choice){auto p=packet(Move);p.moves[1]=choice;emit(p);}}
  }
};
}
