#include "trainer_scene.h"
#include "trainer_assets.h"
#include "custom_scene_data.h"
#include <Arduino.h>
#include <new>
namespace {
uint16_t *backgrounds=nullptr;
}
uint16_t *trainerScenePrepare(const uint8_t *data,size_t size){
  TrainerAssets::Package package;
  if(!package.load(data,size))return nullptr;
  auto *candidate=static_cast<uint16_t*>(ps_malloc(3u*64u*64u*sizeof(uint16_t)+TrainerProfile::BYTES+sizeof(CustomCompanion::Art)));
  if(!candidate)return nullptr;
  for(unsigned time=0;time<3;time++)if(!package.decode(package.frames+time,candidate+time*4096,4096)){
    free(candidate);return nullptr;
  }
  memcpy(reinterpret_cast<uint8_t*>(candidate+3*4096),package.profile?package.profile:TrainerProfile::fallback(),TrainerProfile::BYTES);
  auto *art=reinterpret_cast<CustomCompanion::Art*>(reinterpret_cast<uint8_t*>(candidate+3*4096)+TrainerProfile::BYTES);
  new(art) CustomCompanion::Art();
  if(package.food)memcpy(art->food,package.food,FoodArt::BYTES);
  if(package.companion){
    art->width=package.width;art->frames=package.frames;art->fps=package.fps;memcpy(art->metadata,package.companion,CustomCompanion::META_BYTES);
    unsigned pixels=art->width*art->width;
    for(unsigned f=0;f<art->frames;f++)if(!package.decode(f,art->colors+f*pixels,pixels,art->masks+f*pixels/8,pixels/8)){free(candidate);return nullptr;}
    art->finish();if(!art->ready()){free(candidate);return nullptr;}
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
  Serial.printf("TRAINER backgrounds ready bytes=%u psram=24576 character_binding=available\n",unsigned(CUSTOM_SCENE_SIZE));
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

const uint8_t *trainerProfileData(){return backgrounds?reinterpret_cast<const uint8_t*>(backgrounds+3*4096):TrainerProfile::fallback();}

const CustomCompanion::Art *trainerCompanionArt(){if(!backgrounds)return nullptr;auto *a=reinterpret_cast<const CustomCompanion::Art*>(reinterpret_cast<const uint8_t*>(backgrounds+3*4096)+TrainerProfile::BYTES);return a->ready()?a:nullptr;}

const uint8_t *trainerFoodData(){auto*a=trainerCompanionArt();return a&&FoodArt::valid(a->food)?a->food:nullptr;}
