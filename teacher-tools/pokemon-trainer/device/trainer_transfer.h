#pragma once
#include <Arduino.h>
void trainerTransferBegin();
void trainerTransferTick(uint32_t now);
bool trainerTransferCommand(const String &line,const char *version);
