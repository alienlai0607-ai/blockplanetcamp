#pragma once
#include <stdint.h>
#include <stddef.h>
#include <string.h>
#include "trainer_profile.h"
// Transport-independent TPD1 decoder. No allocation, filesystem or game-state writes.
namespace TrainerAssets {
constexpr size_t HEADER=144,MAX_BYTES=65536;
inline uint16_t u16(const uint8_t*p){return uint16_t(p[0])|(uint16_t(p[1])<<8);}
inline uint32_t u32(const uint8_t*p){return uint32_t(p[0])|(uint32_t(p[1])<<8)|(uint32_t(p[2])<<16)|(uint32_t(p[3])<<24);}
inline uint32_t crc32(const uint8_t*p,size_t n){uint32_t crc=0xffffffffu;for(size_t i=0;i<n;i++){crc^=(i>=12&&i<16)?0:p[i];for(int bit=0;bit<8;bit++)crc=(crc>>1)^((crc&1)?0xedb88320u:0);}return crc^0xffffffffu;}
struct Section {const uint8_t*colors=nullptr;const uint8_t*mask=nullptr;uint32_t colorBytes=0,maskBytes=0;uint16_t pixels=0;uint8_t encoding=0;};
class Package {
 public:
  uint8_t width=0,height=0,frames=0,fps=0;uint32_t decodedBytes=0;const uint8_t*profile=nullptr;Section sections[7];bool valid=false;
  bool load(const uint8_t*b,size_t size){
    *this=Package();
    if(!b||size<HEADER||size>MAX_BYTES||memcmp(b,"TPD1",4)||(u16(b+4)!=1&&u16(b+4)!=2)||u16(b+6)!=(u16(b+4)==2?160:HEADER)||u32(b+8)!=size||u32(b+12)!=crc32(b,size)||u16(b+16)!=1)return false;
    bool modern=u16(b+4)==2;if(size<(modern?160:HEADER))return false;
    if((b[18]!=16&&b[18]!=32&&b[18]!=64)||b[19]!=b[18]||b[20]<1||b[20]>4||b[21]<1||b[21]>8||b[22]!=64||b[23]!=b[20]+(modern?4:3)||u32(b+24))return false;
    width=b[18];height=b[19];frames=b[20];fps=b[21];decodedBytes=frames*(width*height*2u+width*height/8u)+3*8192u+(modern?TrainerProfile::BYTES:0);
    if(u32(b+28)!=decodedBytes)return false;
    size_t offset=modern?160:HEADER;
    for(unsigned i=0;i<(modern?8u:7u);i++){
      const uint8_t*d=b+32+i*16;
      if(i>=b[23]){for(int k=0;k<16;k++)if(d[k])return false;continue;}
      if(modern&&i==unsigned(frames)+3){if(d[0]!=4||d[1]||d[2]||d[3]||u32(d+4)!=offset||u32(d+8)!=TrainerProfile::BYTES||u32(d+12)||TrainerProfile::BYTES>size-offset||!TrainerProfile::valid(b+offset))return false;profile=b+offset;offset+=TrainerProfile::BYTES;continue;}
      bool sprite=i<frames;uint32_t pixels=sprite?width*height:4096,maskBytes=sprite?pixels/8:0,colorBytes=u32(d+8);
      if(d[0]!=(sprite?0:i-frames+1)||d[1]!=(sprite?i:0)||d[2]>1||d[3]!=unsigned(sprite)||u32(d+4)!=offset||u32(d+12)!=maskBytes||!colorBytes||colorBytes>size-offset||maskBytes>size-offset-colorBytes)return false;
      Section s;s.colors=b+offset;s.mask=b+offset+colorBytes;s.colorBytes=colorBytes;s.maskBytes=maskBytes;s.pixels=pixels;s.encoding=d[2];
      if(!s.encoding){if(colorBytes!=pixels*2)return false;}
      else {if(colorBytes%4)return false;uint32_t count=0;for(uint32_t pos=0;pos<colorBytes;pos+=4){uint16_t run=u16(s.colors+pos);if(!run||run>pixels-count)return false;count+=run;}if(count!=pixels)return false;}
      sections[i]=s;offset+=colorBytes+maskBytes;
    }
    valid=offset==size;return valid;
  }
  bool decode(unsigned index,uint16_t*out,size_t capacity,uint8_t*mask=nullptr,size_t maskCapacity=0)const{
    if(!valid||index>=unsigned(frames)+3||!out)return false;const Section&s=sections[index];
    if(capacity<s.pixels||(s.maskBytes&&(!mask||maskCapacity<s.maskBytes)))return false;
    if(!s.encoding){for(unsigned i=0;i<s.pixels;i++)out[i]=u16(s.colors+i*2);}
    else{unsigned cursor=0;for(uint32_t pos=0;pos<s.colorBytes;pos+=4){uint16_t count=u16(s.colors+pos),color=u16(s.colors+pos+2);for(unsigned i=0;i<count;i++)out[cursor++]=color;}}
    if(s.maskBytes)memcpy(mask,s.mask,s.maskBytes);return true;
  }
};
inline uint8_t period(int hour){return hour>=5&&hour<10?0:hour>=10&&hour<18?1:2;}
inline uint8_t frameAt(uint32_t elapsed,uint8_t fps,uint8_t count){return count?uint8_t((uint64_t(elapsed)*fps/1000)%count):0;}
inline int edge(int coordinate){return (coordinate*466+63)/64;}
}
