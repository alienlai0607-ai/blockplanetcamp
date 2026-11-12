#include "trainer_scene.h"
#include "trainer_assets.h"
#include "custom_scene_data.h"
#include <Arduino.h>
namespace {
uint16_t *backgrounds=nullptr;
}
uint16_t *trainerScenePrepare(const uint8_t *data,size_t size){
  TrainerAssets::Package package;
  if(!package.load(data,size))return nullptr;
  auto *candidate=static_cast<uint16_t*>(ps_malloc(3u*64u*64u*sizeof(uint16_t)));
  if(!candidate)return nullptr;
  for(unsigned time=0;time<3;time++)if(!package.decode(package.frames+time,candidate+time*4096,4096)){
    free(candidate);return nullptr;
  }
  return candidate;
}
void trainerScenePublish(uint16_t *candidate){free(backgrounds);backgrounds=candidate;}
bool trainerSceneBegin(){
  trainerScenePublish(nullptr);
  if(!CUSTOM_SCENE_SIZE)return false;
  auto *candidate=trainerScenePrepare(CUSTOM_SCENE_DATA,CUSTOM_SCENE_SIZE);
  if(!candidate)return false;
  trainerScenePublish(candidate);
  Serial.printf("TRAINER backgrounds ready bytes=%u psram=24576 character_binding=pending\n",unsigned(CUSTOM_SCENE_SIZE));
  return true;
}
bool trainerSceneDraw(Arduino_GFX *gfx,int hour){
  if(!backgrounds||!gfx)return false;
  const uint16_t *pixels=backgrounds+TrainerAssets::period(hour)*4096;
  for(int y=0;y<64;y++)for(int x=0;x<64;){
    uint16_t color=pixels[y*64+x];int end=x+1;
    while(end<64&&pixels[y*64+end]==color)end++;
    const int x0=TrainerAssets::edge(x),y0=TrainerAssets::edge(y);
    gfx->fillRect(x0,y0,TrainerAssets::edge(end)-x0,TrainerAssets::edge(y+1)-y0,color);x=end;
  }
  return true;
}
