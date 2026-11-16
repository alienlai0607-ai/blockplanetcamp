#pragma once
#include <stdint.h>
#include <string.h>
namespace FoodArt {
constexpr unsigned BYTES=16+4*544;
inline bool valid(const uint8_t*p){
 if(!p||memcmp(p,"TPF1",4)||p[4]!=1||p[5]!=16||p[6]!=4)return false;
 for(unsigned i=7;i<16;i++)if(p[i])return false;
 for(unsigned f=0;f<4;f++){bool any=false;for(unsigned i=0;i<32;i++)any|=p[16+f*544+512+i]!=0;if(!any)return false;}
 return true;
}
template<class G> void draw(G*g,const uint8_t*p,unsigned kind,int x,int y,int scale){
 if(!p||kind>3)return;const uint8_t*image=p+16+kind*544;
 for(int row=0;row<16;row++)for(int col=0;col<16;col++){
  unsigned i=row*16+col;if(image[512+i/8]&(1<<(i%8)))g->fillRect(x+col*scale,y+row*scale,scale,scale,uint16_t(image[2*i]|image[2*i+1]<<8));
 }
}
}
