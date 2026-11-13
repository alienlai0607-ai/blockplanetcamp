#pragma once
#include <stdint.h>
#include <string.h>
#include "battle_data.h"
namespace BattleGame {
enum Result : uint8_t { Playing, Win, Lose, Draw, Escaped, Caught };
struct Fighter {
  uint16_t species=1,level=1,form=1;
  uint8_t types[2]={1,0},cooldown[2]={0,0};
  uint16_t moves[2]={33,33},stats[6]={};
  uint32_t hp=1,maxHp=1;
  bool burn=false,poison=false,slow=false,defDown=false,spaDown=false,spdDown=false,guard=false,transformed=false;
  uint8_t confusion=0;
  void init(uint16_t id,uint16_t lv){
    *this=Fighter();species=form=id>=1&&id<=151?id:1;level=lv?lv:1;if(level>999)level=999;
    const auto &s=SPECIES[species];types[0]=s.t1;types[1]=s.t2;moves[0]=s.m1;moves[1]=s.m2;
    for(int i=0;i<6;i++)stats[i]=2UL*s.stats[i]*level/100+(i?5:level+10);
    hp=maxHp=stats[0];
  }
  uint32_t speed()const{return slow?(stats[5]/2?stats[5]/2:1):stats[5];}
};
inline const Move &move(uint16_t id){for(const auto &m:MOVES)if(m.id==id)return m;return MOVES[0];}
// Quarter units: 0, 1/4, 1/2, 1, 2, 4 times; 0 is not clamped to 1 HP.
inline uint8_t effectiveness(uint8_t type,const Fighter &d){
  if(type<1||type>18)return 4;
  uint16_t v=TYPE_CHART[type-1][d.types[0]-1];
  if(d.types[1]&&d.types[1]!=d.types[0])v=v*TYPE_CHART[type-1][d.types[1]-1]/4;
  return v;
}
inline uint32_t damage(const Fighter &a,const Fighter &d,uint16_t mid,uint8_t roll=100){
  const auto &m=move(mid);if(!m.power)return 0;
  unsigned eff=mid==165?4:effectiveness(m.type,d);if(!eff)return 0;
  bool phys=m.category==1;uint32_t atk=a.stats[phys?1:3],def=d.stats[phys?2:4];
  if((phys&&a.burn)||(!phys&&a.spaDown))atk=atk*3/4;
  if((phys&&d.defDown)||(!phys&&d.spdDown))def=def*3/4;
  if(!atk)atk=1;if(!def)def=1;
  uint64_t base=((2*a.level/5+2)*uint64_t(m.power)*atk/def)/50+2;
  unsigned stab=mid!=165&&(m.type==a.types[0]||m.type==a.types[1])?3:2;
  uint32_t n=base*stab*eff*roll/(2*4*100*(d.guard?2:1));return n?n:1;
}
inline void choices(const Fighter &a,const Fighter &d,uint16_t out[2]){
  bool hits=false;for(int i=0;i<2;i++){out[i]=a.cooldown[i]?0:a.moves[i];if(out[i]&&move(out[i]).power&&(out[i]==165||effectiveness(move(out[i]).type,d)))hits=true;}
  if(!hits){uint16_t status=0;for(int i=0;i<2;i++)if(out[i]&&!move(out[i]).power)status=out[i];out[0]=status?status:165;out[1]=status?165:0;}
}
struct Event {uint16_t move=0;uint8_t actor=0,effect=0,multiplier=4;uint32_t amount=0,after[2]={};bool confused=false;};
struct Engine {
  Fighter f[2];Result result=Playing;uint32_t rounds=0,rng=1;Event events[3];uint8_t eventCount=0;
  uint32_t random(){rng^=rng<<13;rng^=rng>>17;rng^=rng<<5;return rng;}
  void init(uint16_t own,uint16_t ownLv,uint16_t wild,uint16_t wildLv,uint32_t seed){*this=Engine();rng=seed?seed:1;f[0].init(own,ownLv);f[1].init(wild,wildLv);}
  void finish(){if(!f[0].hp&&!f[1].hp)result=Draw;else if(!f[0].hp)result=Lose;else if(!f[1].hp)result=Win;}
  uint16_t npcMove(){uint16_t c[2];choices(f[1],f[0],c);if(c[0]==144&&!f[1].transformed&&f[0].species!=132)return 144;return c[1]?(random()&1?c[1]:c[0]):c[0];}
  void attack(uint8_t who,uint16_t mid){
    if(!mid)return;Event &e=events[eventCount++];e={};e.actor=who;e.move=mid;
    Fighter &a=f[who],&d=f[1-who];const auto &m=move(mid);
    if(a.confusion){--a.confusion;if(random()%100<25){uint32_t n=a.maxHp/16;if(!n)n=1;a.hp=a.hp>n?a.hp-n:0;e.confused=true;goto done;}}
    if(m.effect==Transform){
      if(!a.transformed&&!d.transformed&&(d.moves[0]!=144||d.moves[1]!=165)){
        a.types[0]=d.types[0];a.types[1]=d.types[1];for(int i=1;i<6;i++)a.stats[i]=d.stats[i];
        a.moves[0]=d.moves[0];a.moves[1]=d.moves[1];a.cooldown[0]=a.cooldown[1]=0;a.form=d.form;a.transformed=true;e.effect=Transform;
      }goto done;
    }
    if(m.effect==Guard){a.guard=true;e.effect=Guard;}
    else if(m.power){
      e.multiplier=mid==165?4:effectiveness(m.type,d);e.amount=damage(a,d,mid,85+random()%16);if(e.amount>d.hp)e.amount=d.hp;d.hp-=e.amount;
      if(e.amount&&d.guard)d.guard=false;
      if(e.amount&&m.effect==Drain){uint32_t n=e.amount/2;if(!n)n=1;a.hp+=n;if(a.hp>a.maxHp)a.hp=a.maxHp;e.effect=Drain;}
      if(m.effect==Recoil){uint32_t n=a.maxHp/8;if(!n)n=1;a.hp=a.hp>n?a.hp-n:0;e.effect=Recoil;}
      if(e.amount&&d.hp&&random()%100<m.chance){
        bool fire=d.types[0]==10||d.types[1]==10,immune=d.types[0]==4||d.types[1]==4||d.types[0]==9||d.types[1]==9;
        switch(m.effect){
        case Burn:if(!fire&&!d.poison){d.burn=true;e.effect=Burn;}break;
        case Poison:if(!immune&&!d.burn){d.poison=true;e.effect=Poison;}break;
        case Slow:d.slow=true;e.effect=Slow;break;
        case Confuse:if(!d.confusion){d.confusion=2;e.effect=Confuse;}break;
        case DefDown:d.defDown=true;e.effect=DefDown;break;
        case SpaDown:d.spaDown=true;e.effect=SpaDown;break;
        case SpdDown:d.spdDown=true;e.effect=SpdDown;break;
        default:break;
        }
      }
    }
    for(int i=0;i<2;i++)if(a.moves[i]==mid&&m.cooldown)a.cooldown[i]=m.cooldown+1;
    done:e.after[0]=f[0].hp;e.after[1]=f[1].hp;
  }
  bool turn(uint16_t left,uint16_t right){
    if(result!=Playing)return false;
    uint16_t requested[]={left,right};
    for(int i=0;i<2;i++){uint16_t c[2];choices(f[i],f[1-i],c);if(requested[i]&&requested[i]!=c[0]&&requested[i]!=c[1])return false;}
    eventCount=0;++rounds;
    int first=0;int pa=left?move(left).priority:-1,pb=right?move(right).priority:-1;
    if(pb>pa||(pb==pa&&(f[1].speed()>f[0].speed()||(f[1].speed()==f[0].speed()&&(random()&1)))))first=1;
    attack(first,requested[first]);finish();if(result==Playing){attack(1-first,requested[1-first]);finish();}
    if(result==Playing){bool tick=false;for(auto &a:f)if(a.burn||a.poison){uint32_t n=a.maxHp/16;if(!n)n=1;a.hp=a.hp>n?a.hp-n:0;tick=true;}
      if(tick){auto &e=events[eventCount++];e={};e.effect=StatusTick;e.after[0]=f[0].hp;e.after[1]=f[1].hp;}finish();}
    for(auto &a:f)for(auto &c:a.cooldown)if(c)--c;
    return true;
  }
};
inline uint8_t catchChance(const Fighter &wild,uint8_t rarity){uint32_t missing=100-wild.hp*100/wild.maxHp;int n=35+missing*45/100-rarity*8;return n<10?10:n>85?85:n;}
}
