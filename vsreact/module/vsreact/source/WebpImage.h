#pragma once

#include <juce_graphics/juce_graphics.h>

namespace vsreact
{

/** True if the bytes start with a RIFF/WEBP container header. */
bool looksLikeWebP (const void* data, size_t size);

/** Decodes a static WebP (lossy VP8, lossless VP8L, either with alpha) into
    a premultiplied ARGB juce::Image via the vendored libwebp decoder.
    Returns an invalid image on failure. Animated WebP is out of scope
    (no demuxer) — only a file's primary image decodes. */
juce::Image decodeWebPImage (const void* data, size_t size);

} // namespace vsreact
