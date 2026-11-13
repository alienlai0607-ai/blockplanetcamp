#include <cassert>
#include <cstdio>
#include <vector>
#include <random>
#include <algorithm>
#include "link_core.h"
using namespace LinkGame;
struct Net {
  struct Message{int from,to;Packet p;uint32_t due;};
  struct Endpoint{Net*n;int side;};
  Session a,b;Endpoint ea{this,0},eb{this,1};std::vector<Message> q;
  uint8_t mac[2][6]={{2,0,0,0,0,1},{2,0,0,0,0,2}};
  uint32_t now=0;std::mt19937 rng;unsigned loss=0,duplicates=0,maxDelay=0;bool connected=true;int dropType=0;
  Net(uint32_t seed=1):rng(seed){a.reset(send,&ea);b.reset(send,&eb);}
  static void send(void*ctx,const uint8_t*dest,const Packet&p){
    auto&e=*static_cast<Endpoint*>(ctx);auto&n=*e.n;int to=1-e.side;
    assert(dest[0]==255||sameMac(dest,n.mac[to]));
    uint8_t bytes[WIRE_BYTES];encode(p,bytes);Packet decoded;assert(decode(bytes,sizeof(bytes),decoded));
    if(!n.connected||p.type==n.dropType||n.rng()%100<n.loss)return;
    auto due=[&](){return n.now+(n.maxDelay?n.rng()%(n.maxDelay+1):0);};
    n.q.push_back({e.side,to,decoded,due()});if(n.rng()%100<n.duplicates)n.q.push_back({e.side,to,decoded,due()});
  }
  void step(unsigned dt=40){now+=dt;a.tick(now);b.tick(now);for(unsigned i=0;i<q.size();){if(int32_t(now-q[i].due)<0){i++;continue;}auto m=q[i];q.erase(q.begin()+i);if(connected)(m.to?b:a).receive(mac[m.from],m.p,now);}}
  void setup(uint16_t x=25,uint16_t y=7){a.hosting(x,0x12345678abcdefULL,8321,now);b.search(y);}
  void pair(){
    for(int i=0;i<400;i++){step();if(b.phase==Searching&&b.rooms[0].session)b.join(0,0x998877665544ULL,now);if(a.phase==Pairing&&!a.confirmed)a.confirm(now);if(b.phase==Pairing&&!b.confirmed)b.confirm(now);if(a.phase==Battle&&b.phase==Battle)return;}
    assert(!"pair timeout");
  }
  void select(Session&s){if(s.phase!=Battle||s.choice||s.awaitAck||s.engine.result!=BattleGame::Playing)return;uint16_t c[2];choices(s.engine.f[s.side()],s.engine.f[1-s.side()],c);assert(s.choose(c[rng()%2&&c[1]?1:0],now));}
};
int main(){
  unsigned checks=0;
  {Packet p;p.type=Turn;p.session=~0ULL;p.guest=0x123456789abcdefULL;p.seed=123;p.round=99;p.moves[0]=33;p.moves[1]=165;p.species[0]=25;p.species[1]=151;p.hash=234;p.before=99;
   uint8_t b[WIRE_BYTES];encode(p,b);Packet out;assert(decode(b,64,out)&&out.guest==p.guest&&out.species[1]==151);for(unsigned i=0;i<64;i++){b[i]^=1;assert(!decode(b,64,out));b[i]^=1;}assert(!decode(b,63,out));b[8]^=2;put32(b+60,crc(b,60));assert(!decode(b,64,out));checks+=67;}
  {Net n;n.setup();for(int i=0;i<15;i++)n.step();assert(n.b.join(0,99,n.now));for(int i=0;i<25;i++)n.step();assert(n.a.phase==Pairing&&n.b.phase==Pairing);n.a.confirm(n.now);for(int i=0;i<25;i++)n.step();assert(n.a.phase==Pairing&&n.b.phase==Pairing);n.b.confirm(n.now);for(int i=0;i<25;i++)n.step();assert(n.a.phase==Battle&&n.b.phase==Battle);checks+=3;}
  {Net n;n.setup();n.pair();auto p=n.b.packet(Move);p.moves[1]=33;p.guest++;n.a.receive(n.mac[1],p,n.now);assert(!n.a.remoteChoice);p.guest--;p.moves[1]=65535;n.a.receive(n.mac[1],p,n.now);assert(!n.a.remoteChoice);uint8_t stranger[6]={4,1,2,3,4,5};p=n.b.packet(Quit);n.a.receive(stranger,p,n.now);assert(n.a.phase==Battle);checks+=3;}
  {Net n;n.setup();n.pair();n.dropType=TurnAck;n.select(n.a);n.select(n.b);for(int i=0;i<100;i++)n.step();assert(n.a.engine.rounds==1&&n.b.engine.rounds==1&&n.a.awaitAck);assert(digest(n.a.engine)==digest(n.b.engine));n.dropType=0;for(int i=0;i<25;i++)n.step();assert(!n.a.awaitAck&&n.a.engine.rounds==1);checks+=3;}
  {Net n;n.setup();n.pair();n.connected=false;for(int i=0;i<100;i++)n.step();assert(n.a.paused(n.now)&&n.b.paused(n.now));assert(!n.a.choose(33,n.now));n.connected=true;for(int i=0;i<30;i++)n.step();assert(!n.a.paused(n.now)&&n.a.phase==Battle&&n.b.phase==Battle);n.connected=false;for(int i=0;i<510;i++)n.step();assert(n.a.phase==Failed&&n.b.phase==Failed&&n.a.error==Timeout);checks+=4;}
  {Net n;n.setup();n.pair();n.a.cancel();for(int i=0;i<25;i++)n.step();assert(n.b.phase==Failed&&n.b.error==OtherLeft);checks++;}
  {Net n;n.setup();n.pair();auto p=n.b.packet(Heartbeat);p.hash^=1;n.a.receive(n.mac[1],p,n.now);assert(n.a.phase==Failed&&n.a.error==Desync);checks++;}
  {Net n;n.now=0xfffff000;n.setup();n.pair();for(int i=0;i<300;i++)n.step();assert(n.a.phase==Battle&&n.b.phase==Battle);checks++;}
  for(unsigned seed=1;seed<=160;seed++){
    Net n(seed);n.loss=25;n.duplicates=30;n.maxDelay=600;n.setup(1+(seed*23)%151,1+(seed*61)%151);n.pair();
    for(int i=0;i<20000;i++){
      n.step();assert(n.a.phase==Battle&&n.b.phase==Battle);
      if(!n.a.paused(n.now))n.select(n.a);if(!n.b.paused(n.now))n.select(n.b);
      if(n.a.engine.result!=BattleGame::Playing&&n.b.engine.result!=BattleGame::Playing&&!n.a.awaitAck)break;
      if(i==19999){std::fprintf(stderr,"stalled seed %u rounds %u %u\n",seed,n.a.engine.rounds,n.b.engine.rounds);assert(false);}
    }
    assert(digest(n.a.engine)==digest(n.b.engine));assert(n.a.engine.rounds==n.b.engine.rounds);assert(n.a.engine.f[0].level==50&&n.a.engine.f[1].level==50);checks+=3;
  }
  // A malformed but CRC-valid peer result must never change battle state.
  {Net n;n.setup();n.pair();n.select(n.b);auto before=digest(n.b.engine);Packet p=n.a.packet(Turn);p.round=1;p.moves[0]=33;p.moves[1]=n.b.choice;p.before=before;p.hash=123;n.b.receive(n.mac[0],p,n.now);assert(n.b.phase==Failed&&digest(n.b.engine)==before);checks++;}
  std::printf("Link protocol tests passed: %u assertions plus 160 complete lossy/duplicate/reordered battles.\n",checks);
}
