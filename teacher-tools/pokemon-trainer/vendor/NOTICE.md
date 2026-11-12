# Browser runtime notices

- esptool-js 0.7.1 — Espressif Systems, Apache-2.0. The unmodified official bundle is self-hosted. See esptool-js-LICENSE.txt and sources.json for source and verified archive integrity.
- The project-owned ../esp-flash-read.js adapter replaces READ_FLASH with a one-packet window and consumes/verifies the final MD5 trailer before the next command. It does not modify the vendored bundle. See ../tests/esp-flash-read.test.mjs for the original failure and regression coverage.
- The esptool-js bundle includes pako (MIT / Zlib) and atob-lite (MIT). Their license notices are retained alongside this file.
- spark-md5 3.0.2 — André Cruz and contributors, WTFPL (see spark-md5-LICENSE.txt). Only its module wrapper was adapted from UMD to ESM; the implementation is unchanged. Used for compatibility with ESP flash MD5 checks; firmware downloads additionally use SHA-256.
- TamaPoke firmware code and embedded artwork have separate upstream credits and terms in ../firmware/stopwatch/TamaPoke-LICENSE.txt and TamaPoke-CREDITS.md. The StopWatch port, game additions, Chinese interface, creator format, receiver and web installation workflow were modified for this project.

All runtime dependencies are served by this website. No executable is installed on the child's computer and no device backup is uploaded to a server.
