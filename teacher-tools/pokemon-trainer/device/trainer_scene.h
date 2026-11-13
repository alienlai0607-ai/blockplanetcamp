#pragma once
#include "Arduino_GFX_Library.h"
bool trainerSceneBegin();
// Prepare before persistent commit; publish is allocation-free and cannot fail.
uint16_t *trainerScenePrepare(const uint8_t *data,size_t size);
void trainerScenePublish(uint16_t *candidate);
bool trainerSceneDraw(Arduino_GFX *gfx,int hour);

const uint8_t *trainerProfileData();
