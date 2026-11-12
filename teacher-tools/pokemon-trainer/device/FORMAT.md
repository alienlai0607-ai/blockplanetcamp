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

## Web installation and USB artwork transfer (SWdev12)

The public website self-hosts the pinned esptool-js 0.7.1 bundle and precompiled StopWatch binaries. It needs HTTPS and desktop Web Serial (Chrome/Edge are the initial supported teaching setup). No Arduino SDK, Python or local compiler is required on the child's computer. Browser permission and a USB data cable remain necessary. Firmware and artwork operations are separate.

The firmware installer verifies each downloadable binary's SHA-256 and exact permitted offset, checks ESP32-S3 and 16 MB flash, refuses secure boot/encrypted devices, and requires the user to identify the physical StopWatch C152. Chip identification cannot distinguish all ESP32-S3 board models. Before any persistent write it reads all 16 MB, compares the backup to the device's MD5, stores and re-reads the backup in IndexedDB, then asks the user to download and confirm the backup. The backup stays on the user's computer, never uploads to our server. IndexedDB alone is not an archival backup; users should retain the downloaded file.

Update mode requires an exact match with the existing partition table and never erases the full flash. It writes bootloader (0), partition table (0x8000), OTA boot selection (0xe000), and application (0x10000); NVS and artwork data are outside these regions. It verifies written bytes by reading them back, and separately checks NVS and both artwork slots against the backup. An incomplete application may be retried in update mode as long as the partition table matches. First-install mode is distinct, explicitly warns that the prior system/data will be erased, and requires that extra acknowledgement before whole-chip erase. A successful flash readback is not a successful boot test: the user must reconnect to the running game afterward.

### Artwork ownership and two slots

No partition-table change is made. Only the existing `ffat` data/FAT partition at 0x610000, size 0x9e0000, may be used. This release reserves its first 0x23000 bytes (140 KiB), absolute [0x610000, 0x633000), for raw artwork. The entire partition must not be mounted/formatted as FAT by another firmware component. An encrypted, missing or differently placed partition is refused.

On a partition with no ownership header, the receiver scans **every byte of the reserved 140 KiB** and claims that prefix only if all bytes are 0xff. Non-empty foreign data inside that prefix is refused. Data beyond 0x633000 is retained and never adopted, erased or formatted. The concrete flash adapter independently bounds all writes and erases to the reserved prefix. A partially written ownership header is refused rather than guessed. An established ownership record means subsequent updates may only write the two fixed slots below.

SWdev11 scanned the entire partition; old FAT remnants far beyond the artwork slots therefore blocked a first upload even when every reserved artwork sector was empty. SWdev12 narrows the blank check without changing slot locations, headers, package format or existing artwork compatibility. The reported backup had an entirely erased artwork prefix and a legacy FAT boot sector at 0xa01000. Tests apply the real backup offline and assert that every byte beyond the reservation is preserved; the backup itself is never included in public source/tests.

All offsets here are relative to that partition:

| Area | Offset | Size |
| --- | --- | --- |
| Ownership | 0 | 32 bytes in a reserved 0x1000 sector |
| Slot 0 | 0x1000 | 0x11000 |
| Slot 1 | 0x12000 | 0x11000 |
| Slot payload | slot offset + 0x1000 | up to 65,536 bytes |

The 32-byte ownership header contains `TPO1`, u32 version 1, partition address, partition size, first-slot offset, slot size, slot count 2, CRC32 over its preceding 28 bytes. Each slot's 32-byte header contains `TPS1`, u32 version 1, monotonically increasing sequence, package size, TPD1 CRC, profile 1, reserved zero, CRC32 over its preceding 28 bytes. Headers are little-endian.

The receiver buffers one bounded package in PSRAM, validates its TPD1 contents and prepares the replacement background cache before touching flash. It erases only the inactive slot, writes and reads back the payload, then publishes the slot header as the final write. The older slot stays intact. Boot selects the highest-sequence valid header whose complete package also validates; corruption of the newer slot falls back to the older slot. A successful commit atomically swaps the in-memory scene pointer on the main loop. NVS game records are never opened by the artwork receiver. Corrupt flash, hardware failure or an interrupted *firmware* flash still requires backup/recovery; two artwork slots do not make firmware flashing power-loss-proof.

### USB protocol 1

ASCII, 115200 baud, newline terminated. The main loop uses a bounded nonblocking line buffer (640 bytes) rather than a blocking read-until-newline. Lines beyond the bound are discarded through the next newline. Transfer commands are limited to 600 bytes. Browser-generated transaction tokens are eight hexadecimal characters, used to match responses (not authentication).

| Command | Reply |
| --- | --- |
| `TP token HELLO` | `TP token INFO protocol=1 board=stopwatch-c152 fw=… max=65536 chunk=256 storage=ready|unclaimed|blocked size=… crc=… generation=… capabilities=backgrounds` |
| `TP token BEGIN size crc` | `TP token READY 0` |
| `TP token DATA offset hexbytes` | `TP token ACK nextOffset` |
| `TP token COMMIT` | `TP token STORED size crc` |
| `TP token ABORT` | `TP token ABORTED ok` |
| Invalid command/data | `TP token ERR reason` |

CRC is eight lowercase hexadecimal digits, the embedded TPD1 CRC with its own field zeroed during calculation. `DATA` contains 1–256 bytes, encoded as hex. Offsets must be sequential; identical retransmissions already received are acknowledged without appending twice. Other tokens cannot replace an active transfer. A duplicate successful COMMIT for the same token returns the existing result without a second flash write. The receiver drops incomplete sessions after 30 seconds of inactivity; the browser retries missing chunk ACKs twice and allows 45 seconds for commit (the first ownership scan may take longer than ordinary updates). A cancelled/incomplete transfer never publishes a new slot. The browser checks the final stored size, CRC and generation after commit. If the final acknowledgement is lost or USB disconnects during commit, it reports an uncertain result and asks the user to reconnect, rather than claiming failure or success without evidence.

### Compatibility and verification limits

This release applies morning/day/night backgrounds to the home/exploration renderer. Character frames are stored in the package but are not yet bound to game companions, stats or battles. The full editable JSON is still the source of truth for names, original colors and animation settings. Saved USB artwork takes precedence over a locally embedded package. The optional old prepare_scene.py source-embedding route remains available for developers, but changing an embedded package will not supersede an already stored USB package.

Automated validation covers browser DOM behavior, the real C++ receiver connected to the JS client through a simulated serial stream, retries/cancel/reboot, checksums, interrupted writes, the renderer, backup persistence, and guarded flash/readback with a fake ESP transport. A complete Arduino ESP32 build is required. These checks do not replace Windows/macOS browser, native USB reconnect, on-device display, or power-interruption tests with actual hardware; this release is marked as a test version until those are performed.

The existing local flash tool retains its source hash guard and backup/readback behavior. No direct serial or flash operation is performed merely by loading the website.
