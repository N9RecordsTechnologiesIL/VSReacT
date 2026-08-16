#pragma once

#include <juce_graphics/juce_graphics.h>

#include <map>

namespace vsreact
{

/** Decodes `src` (a base64 `data:` URI or a file path — PNG/JPEG/GIF/WebP)
    without any caching. Shared by the paint path and the image registry. */
juce::Image loadImageSource (const juce::String& src);

/** Owns images registered from JS (registerImage) so an <Image src> can be a
    short "img:N" handle instead of a multi-megabyte data URI riding every
    prop update across the bridge. One per instance; message thread only. */
class ImageRegistry
{
public:
    /** Decodes `src` and stores the image; returns its "img:N" handle, or an
        empty string if the source is undecodable. */
    juce::String registerImage (const juce::String& src);

    /** The image behind a handle, or an invalid image if unknown. */
    juce::Image find (const juce::String& handle) const;

    bool isEmpty() const noexcept { return images.empty(); }

private:
    std::map<juce::String, juce::Image> images;
    int nextId = 1;
};

} // namespace vsreact
