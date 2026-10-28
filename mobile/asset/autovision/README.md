# AutoVision model for the mobile thesis demo

The Flutter form uses AutoVision v5.13.0 locally to suggest vehicle make and model from a photo. It does not read the license plate, VIN, color, or registration papers. The user reviews the suggestion before filling the form. The backend vehicle catalog remains authoritative.

`car_classifier.tflite` (44 MB) is committed directly to Git with the matching JSON metadata and license. A normal clone includes the model; no separate download, Git LFS setup, or staging script is required. Run `flutter pub get` from `mobile/` before launching the app. The expected model SHA-256 is `DC194F500890F7AAA96F80222FED246784CFFED052E3DC173F6BFC4AC0EDB825`. The optional `mobile/scripts/stage_autovision.ps1` script can restore the release artifacts if they are missing locally; it checks the expected SHA-256. Model and metadata must remain from the same AutoVision release.

Required Notice: Copyright (c) 2026 AutoVision / Bogdan Moldovan

See [LICENSE](LICENSE). AutoVision permits noncommercial use under the PolyForm Noncommercial License 1.0.0; a deployed commercial garage app requires a separate commercial license. Keep this notice and the license with any distributed demo.

The Flutter `tflite_flutter` dependency requires Android API 26 or newer. iOS and Android native runtime inference have not been validated on a physical device in this repository. The Dart image package uses bilinear resizing, but exact pixel parity with the Python PIL preprocessing has not yet been measured.
