#!/bin/bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")" && pwd)"
python3 "$project_dir/tools/prepare_trainer_scene.py" --firmware "$project_dir/firmware/TamaPoke" --install "$@"
printf '\n完成素材安裝後，請執行 Build_StopWatch.command 重新編譯。此工具沒有寫入開發板。\n'
