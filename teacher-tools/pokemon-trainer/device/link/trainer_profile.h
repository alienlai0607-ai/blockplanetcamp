#pragma once
#include <stdint.h>
#include <stddef.h>
#include <string.h>
namespace TrainerProfile {
constexpr unsigned BYTES=2432;
inline bool valid(const uint8_t*p,size_t n=BYTES){
 if(!p||n!=BYTES||memcmp(p,"TPR1",4)||p[4]!=1||p[5]||p[6]!=32||p[7]!=32||!p[8]||p[8]>32)return false;
 for(unsigned i=9;i<16;i++)if(p[i])return false;for(unsigned i=16+p[8];i<64;i++)if(p[i])return false;
 unsigned count=0;for(unsigned i=16;i<16u+p[8];){uint32_t c=p[i++],min=0;unsigned extra=0;if(c>=0xc2&&c<=0xdf){c&=31;extra=1;min=0x80;}else if(c>=0xe0&&c<=0xef){c&=15;extra=2;min=0x800;}else if(c>=0xf0&&c<=0xf4){c&=7;extra=3;min=0x10000;}else if(c>=128)return false;
 if(i+extra>16u+p[8])return false;while(extra--){uint8_t b=p[i++];if((b&0xc0)!=0x80)return false;c=(c<<6)|(b&63);}if(c<min||c>0x10ffff||(c>=0xd800&&c<=0xdfff)||c<32||(c>=127&&c<=159)||(c>=0x200b&&c<=0x200f)||(c>=0x202a&&c<=0x202e)||(c>=0x2060&&c<=0x206f))return false;if(++count>8)return false;
 }return true;
}
inline void makeDefault(uint8_t*p){memset(p,0,BYTES);memcpy(p,"TPR1",4);p[4]=1;p[6]=p[7]=32;p[8]=7;memcpy(p+16,"TRAINER",7);
 auto rect=[&](int x,int y,int w,int h,uint16_t c){for(int j=y;j<y+h;j++)for(int i=x;i<x+w;i++){unsigned k=j*32+i;p[64+2*k]=c;p[65+2*k]=c>>8;p[2112+k/8]|=1<<(k%8);}};
 rect(11,3,10,5,0x2989);rect(10,5,13,3,0xb1aa);rect(12,8,9,8,0xf634);rect(11,8,2,6,0x2989);rect(18,10,2,2,0x2989);rect(10,16,12,9,0xb1aa);rect(8,17,3,7,0xf634);rect(22,17,3,7,0xf634);rect(12,17,7,3,0xf779);rect(11,25,4,5,0x2989);rect(18,25,4,5,0x2989);rect(9,29,6,2,0x53aa);rect(18,29,6,2,0x53aa);
}
inline const uint8_t* fallback(){static uint8_t p[BYTES]={};if(!p[0])makeDefault(p);return p;}
template<class G> void draw(G*g,const uint8_t*p,int cx,int ground,int scale,bool mirror=false){if(!p)p=fallback();for(int y=0;y<32;y++)for(int x=0;x<32;x++){unsigned i=y*32+x;if(p[2112+i/8]&(1<<(i%8))){uint16_t c=p[64+i*2]|uint16_t(p[65+i*2])<<8;g->fillRect(cx-16*scale+(mirror?31-x:x)*scale,ground-32*scale+y*scale,scale,scale,c);}}}
template<class G> void name(G*g,const uint8_t*p,int cx,int y,uint16_t color,int scale=1){if(!p)p=fallback();bool any=false;for(int i=0;i<192;i++)any|=p[2240+i]!=0;
 if(!any){g->setTextColor(color);g->setTextSize(1);g->setCursor(cx-21,y+4);g->print("TRAINER");return;}
 for(int j=0;j<16;j++)for(int x=0;x<96;x++){unsigned i=j*96+x;if(p[2240+i/8]&(1<<(i%8)))g->fillRect(cx-48*scale+x*scale,y+j*scale,scale,scale,color);}
}
}
