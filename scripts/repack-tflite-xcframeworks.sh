#!/bin/bash
# Rebuilds the TensorFlowLiteC and TensorFlowLiteCCoreML static-library
# xcframeworks published in the tensorflowlitec-2.17.0 release.
#
# Google's TensorFlowLiteC pod ships each library as a .framework whose binary
# is a static archive and which has no Info.plist. SwiftPM embeds a framework
# from a binary target in the app, and the app then fails validation
# ("did not contain an Info.plist"). Wrapping the same archives as
# static-library xcframeworks makes SwiftPM link them and embed nothing. The
# object code is copied with libtool, not rebuilt, and the headers are copied
# under Headers/<Name>/ so <TensorFlowLiteC/...> includes still resolve.
#
# Usage: scripts/repack-tflite-xcframeworks.sh <out-dir>
# Prints each zip's SwiftPM checksum.
set -euo pipefail
# Zero archive member dates so the same tarball gives the same checksums.
export ZERO_AR_DATE=1

OUT=$(mkdir -p "$1" && cd "$1" && pwd)
TARBALL_URL=https://dl.google.com/tflite-release/ios/prod/tensorflow/lite/release/ios/release/32/20240729-115310/TensorFlowLiteC/2.17.0/0c10b3543e01f547/TensorFlowLiteC-2.17.0.tar.gz
TARBALL_SHA256=9667b476015f136e5b332ce040e12822c4ac6d5c58947882ddc809cdff0fb99e

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
curl -fsSL -o "$WORK/tflc.tar.gz" "$TARBALL_URL"
echo "$TARBALL_SHA256  $WORK/tflc.tar.gz" | shasum -a 256 -c - >/dev/null
tar xzf "$WORK/tflc.tar.gz" -C "$WORK"
SRC="$WORK/TensorFlowLiteC-2.17.0/Frameworks"

for NAME in TensorFlowLiteC TensorFlowLiteCCoreML; do
  args=()
  for SLICE in ios-arm64 ios-arm64_x86_64-simulator; do
    FW="$SRC/$NAME.xcframework/$SLICE/$NAME.framework"
    W="$WORK/$NAME/$SLICE"
    mkdir -p "$W/Headers/$NAME"
    libtool -static -no_warning_for_no_symbols -o "$W/lib$NAME.a" "$FW/$NAME"
    cp "$FW"/Headers/*.h "$W/Headers/$NAME/"
    args+=(-library "$W/lib$NAME.a" -headers "$W/Headers")
  done
  rm -rf "$OUT/$NAME.xcframework" "$OUT/$NAME-2.17.0-static.xcframework.zip"
  xcodebuild -create-xcframework "${args[@]}" -output "$OUT/$NAME.xcframework" >/dev/null
  cp "$SRC/$NAME.xcframework/PrivacyInfo.xcprivacy" "$OUT/$NAME.xcframework/"
  # xcodebuild lists the slices in no fixed order; sort them so the zip is
  # byte-for-byte reproducible.
  python3 -I -c 'import plistlib,sys
p=sys.argv[1]; d=plistlib.load(open(p,"rb"))
d["AvailableLibraries"].sort(key=lambda l: l["LibraryIdentifier"])
plistlib.dump(d, open(p,"wb"), sort_keys=True)' "$OUT/$NAME.xcframework/Info.plist"
  find "$OUT/$NAME.xcframework" -exec touch -h -t 202407290000 {} +
  (cd "$OUT" && zip -qry -X "$NAME-2.17.0-static.xcframework.zip" "$NAME.xcframework")
  echo "$NAME-2.17.0-static.xcframework.zip $(swift package compute-checksum "$OUT/$NAME-2.17.0-static.xcframework.zip")"
done
