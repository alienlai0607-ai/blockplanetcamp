#pragma once
#include "trainer_profile.h"
#include "trainer_motion.h"
#include "food_art.h"

// A single editable companion. Combat uses an existing species' rules; artwork
// never supplies stats or executable behaviour. The roster owns its growth.
namespace CustomCompanion {
constexpr unsigned META_BYTES=256;
inline bool valid(const uint8_t*p){
  if(!p||memcmp(p,"TPC1",4)||p[4]!=1||p[5]||p[6]<1||p[6]>151||p[7]||!p[8]||p[8]>32)return false;
  uint8_t profile[TrainerProfile::BYTES]={};
  memcpy(profile,"TPR1",4);profile[4]=1;profile[6]=profile[7]=32;
  memcpy(profile+8,p+8,56);return TrainerProfile::valid(profile);
}
struct Art {
  uint8_t width=0,frames=0,fps=0;
  uint8_t food[FoodArt::BYTES]={};
  uint8_t metadata[META_BYTES]={};
  uint16_t colors[4*64*64]={};
  uint8_t masks[4*64*64/8]={};
  TrainerMotion::Bounds bounds{0,0,0,0};
  uint8_t card[TrainerProfile::BYTES]={};
  bool ready()const{return width&&frames&&bounds.right>bounds.left&&bounds.bottom>bounds.top;}
  bool opaque(unsigned frame,unsigned i)const{return masks[frame*width*width/8+i/8]&(1<<(i%8));}
  void finish(){
    bounds={width,width,0,0};
    for(unsigned f=0;f<frames;f++)for(int y=0;y<width;y++)for(int x=0;x<width;x++)if(opaque(f,y*width+x)){
      if(x<bounds.left)bounds.left=x;if(y<bounds.top)bounds.top=y;
      if(x+1>bounds.right)bounds.right=x+1;if(y+1>bounds.bottom)bounds.bottom=y+1;
    }
    memset(card,0,sizeof(card));if(!ready())return;
    memcpy(card,"TPR1",4);card[4]=1;card[6]=card[7]=32;
    memcpy(card+8,metadata+8,56);memcpy(card+2240,metadata+64,192);
    // The peer receives a bounded 32x32 portrait, not a large animation bundle.
    int w=bounds.right-bounds.left,h=bounds.bottom-bounds.top,edge=w>h?w:h;
    unsigned frame=0;for(;frame+1<frames;frame++){bool any=false;for(unsigned i=0;i<width*width;i++)any|=opaque(frame,i);if(any)break;}
    for(int y=0;y<32;y++)for(int x=0;x<32;x++){
      int sx=bounds.left+(x*edge/32)-(edge-w)/2,sy=bounds.top+(y*edge/32)-(edge-h)/2;
      if(sx<bounds.left||sx>=bounds.right||sy<bounds.top||sy>=bounds.bottom||!opaque(frame,sy*width+sx))continue;
      unsigned i=y*32+x;uint16_t c=colors[frame*width*width+sy*width+sx];
      card[64+i*2]=c;card[65+i*2]=c>>8;card[2112+i/8]|=1<<(i%8);
    }
  }
  template<class G> void draw(G*g,int cx,int ground,int maxW,int maxH,uint32_t now,bool sleeping=false,bool silhouette=false)const{
    if(!ready())return;
    int w=bounds.right-bounds.left,h=bounds.bottom-bounds.top;
    // Integer output bounds also support 64px art in 36px roster icons.
    int dw=w,dh=h;
    if(w>maxW||h>maxH){dw=maxW;dh=h*maxW/w;if(dh>maxH){dh=maxH;dw=w*maxH/h;}if(dw<1)dw=1;if(dh<1)dh=1;}
    else{int s=TrainerMotion::fitScale(bounds,maxW,maxH);dw=w*s;dh=h*s;}
    unsigned f=sleeping?0:(uint64_t(now)*fps/1000)%frames;
    if(dw>=w&&dh>=h){int scale=dw/w;
      for(int y=bounds.top;y<bounds.bottom;y++)for(int x=bounds.left;x<bounds.right;x++){
        unsigned i=y*width+x;if(opaque(f,i))g->fillRect(cx-dw/2+(x-bounds.left)*scale,ground-dh+(y-bounds.top)*scale,scale,scale,silhouette?0x21a9:colors[f*width*width+i]);
      }return;
    }
    for(int y=0;y<dh;y++)for(int x=0;x<dw;x++){
      unsigned i=(bounds.top+y*h/dh)*width+bounds.left+x*w/dw;
      if(opaque(f,i))g->fillRect(cx-dw/2+x,ground-dh+y,1,1,silhouette?0x21a9:colors[f*width*width+i]);
    }
  }
};
}
