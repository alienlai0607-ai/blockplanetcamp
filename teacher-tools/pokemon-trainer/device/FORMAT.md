# TPD1 v1 — StopWatch device artwork package

Little-endian, at most 65,536 bytes, no executable code or filesystem paths. One character animation (16/32/64 square, 1–4 frames), three 64×64 backgrounds. RGB565 colors, opaque-character bitmask, optional lossless run compression after RGB565 conversion. Profile 1 means StopWatch C152, 466×466 round panel. Other boards need an explicitly verified profile.

## Header (144 bytes)

| Offset | Type | Value |
| --- | --- | --- |
| 0 | char[4] | TPD1 |
| 4 | u16 | format version 1 |
| 6 | u16 | header length 144 |
| 8 | u32 | exact total file length |
| 12 | u32 | CRC32/IEEE over entire file, treating these four bytes as zero |
| 16 | u16 | board profile 1 |
| 18,19 | u8 | character width and height, equal; 16, 32 or 64 |
| 20 | u8 | character frame count 1–4 |
| 21 | u8 | device FPS 1–8 |
| 22 | u8 | background size 64 |
| 23 | u8 | section count = frames + 3 |
| 24 | u32 | reserved, zero |
| 28 | u32 | decoded colors + character masks; <= 59,392 bytes |
| 32 | 7×16 bytes | ordered section entries; unused entries all zero |

Each section entry: kind u8 (0 character, 1 morning, 2 day, 3 night), frame index u8 (background 0), encoding u8 (0 raw, 1 runs), mask flag u8 (character 1 / background 0), offset u32, color byte length u32, mask byte length u32. Sections appear as frame 0…N−1, morning, day, night. Each starts exactly after the previous one; no gaps, overlap, trailing bytes or partial sections permitted.

Raw colors: one u16 RGB565 per pixel, row-major. Runs: repeated (positive u16 count, u16 color), total exactly the image pixel count. Export uses runs only if smaller than raw. Character mask follows colors: one bit/pixel, LSB first, 1=opaque; exactly width×height/8 bytes. Transparent pixels have canonical color zero; opaque black remains visible through its mask. Background fallback source colors: morning #f3c3a4, day #83b5df, night #263449 (then converted to RGB565). Backgrounds have no mask; transparent authoring pixels are filled with the documented time-specific sky color before export.

No name or gameplay ID is required. The editable JSON retains names, original RGB colors, alpha, source FPS and all art. Device FPS above 8 is reduced only in the exported package and round device preview. This is a conservative target, not a measured performance guarantee.

## Display and time

Background mapping: nearest-neighbor, no interpolation. Source pixel boundaries are ceil(x×466/64); equivalently each destination pixel samples floor(x×64/466). The panel clips to a centered radius-233 circle. Native framebuffer is 466×466×2 = 434,312 bytes, already allocated by existing firmware; do not allocate another full-screen framebuffer.

Morning 05:00–09:59; day 10:00–17:59; night 18:00–04:59, using the existing board clock. Home sleeping behavior still forces night. Background decoding occurs once at boot into 24,576 bytes of PSRAM, not every frame. Failed CRC, shape checks, unsupported version or allocation failure use the existing scenery.

Character preview uses union bounds across all frames for stable anchoring, up to 6× integer scale. Home: ground 260, max 148 pixels tall (current home controls begin at 264); exploration: ground 306, max dimension 168. Character integration into individual pets, abilities and battle states is deliberately not automatic: this release enables the three backgrounds in the firmware; packages retain character frames for the later binding step. Original pet names, species, stats, animations and saves remain authoritative.

## Installation and rollback

Initial bridge: download .tpdevice → validate/embed into source with prepare_scene.py → compile using the existing verified toolchain → use the existing backed-up firmware update workflow when requested. No browser serial/network permission, flash write, partition edit, SD card or NVS migration is introduced. This does not promise a direct browser-to-device transfer.

prepare_scene.py without --install only checks the file. With --install it requires the updated sketch, preserves the previous custom_scene_data.cpp by content hash, then atomically replaces that one source file. Invalid inputs leave source intact. The package contains no filenames. Return to the empty custom_scene_data.cpp and rebuild to restore built-in scenery. A power loss during a later physical firmware flash still requires the existing backup/recovery procedure; this source installer is not an OTA/dual-bank update system.

Before enabling direct transfer, choose USB versus Wi-Fi, verify actual free partition space, design two-slot commit/readback checks, power-loss recovery, installed-asset selection and user-visible acknowledgement. Do not write arbitrary offsets into the unused-looking FAT partition.

The StopWatch flash workflow now compares the source tree against built_source_sha256.json before staging images. Changed or missing artwork requires a rebuild; tests cover refusal without opening a serial port. Existing full backup and readback gates remain in place.
