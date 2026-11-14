#pragma once
#include "trainer_profile.h"

// Animate the child's complete drawing, without guessing facial features or
// cutting arbitrary artwork into body parts. Coordinates are source pixels.
namespace TrainerMotion {
enum Action { Idle, Walk, Cheer, Bath, Sleep, Feed };
struct Offset { int x, y; };
inline Offset sample(Action action, uint32_t now) {
  const int step = (now / 160u) % 4u;
  const int sway[4] = {0, 1, 0, -1};
  const int hop[4] = {0, -1, -2, -1};
  switch (action) {
    case Walk: return {sway[step], hop[step]};
    case Cheer: return {0, hop[step] * 2};
    case Bath: return {sway[step], 0};
    case Feed: return {int((now / 400u) % 2u), 0};
    case Sleep: return {0, 0};
    default: return {0, -int((now / 800u) % 2u)};
  }
}
struct Bounds { int left, top, right, bottom; };
inline Bounds bounds(const uint8_t *p) {
  if (!p) p = TrainerProfile::fallback();
  Bounds b{32,32,0,0};
  for(int y=0;y<32;y++)for(int x=0;x<32;x++){
    const int i=y*32+x;
    if(!(p[2112+i/8]&(1<<(i%8))))continue;
    if(x<b.left)b.left=x;if(y<b.top)b.top=y;
    if(x+1>b.right)b.right=x+1;if(y+1>b.bottom)b.bottom=y+1;
  }
  return b;
}
inline int fitScale(Bounds b,int width,int height,int limit=16) {
  int scale=limit;
  while(scale>1&&((b.right-b.left)*scale>width||(b.bottom-b.top)*scale>height))--scale;
  return scale;
}
struct Pair { int trainerCx, trainerGround, trainerScale, partnerCx; };
inline Pair pair(const uint8_t *profile,int partnerWidth,int ground,int height,Action action=Idle) {
  const Bounds b=bounds(profile);
  // Reserve the whole animation lift, including compact drawings enlarged to 8x.
  const int lift=action==Cheer?4:action==Walk?2:action==Idle?1:0;
  const int scale=fitScale({b.left,b.top,b.right,b.bottom+lift},160,height,8);
  const int width=b.right>b.left?(b.right-b.left)*scale:0;
  const int left=233-(width+12+partnerWidth)/2;
  return {left+(16-b.left)*scale,ground+(32-b.bottom)*scale,scale,
          left+width+12+partnerWidth/2};
}
template<class G> void draw(G *gfx, const uint8_t *profile, int cx,
                            int ground, int scale, Action action, uint32_t now) {
  const Offset pose = sample(action, now);
  TrainerProfile::draw(gfx, profile, cx + pose.x * scale,
                       ground + pose.y * scale, scale);
}
}
