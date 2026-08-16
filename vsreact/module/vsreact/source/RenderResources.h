#pragma once

#include "FontRegistry.h"
#include "ImageRegistry.h"

#include <map>

namespace vsreact
{

/** Per-instance rendering state: the registries fed from JS (registerFont /
    registerImage) and the paint-time caches. Owned by the ShadowTree, so
    every RootView — i.e. every plugin editor — gets its own. Two instances
    of a plugin in one process must never resolve through each other's
    registries or thrash each other's cache eviction, and a DAW loading two
    instances is the normal case, not the edge case. Message thread only. */
struct RenderResources
{
    FontRegistry fonts;
    ImageRegistry images;

    /** paintText: untransformed glyph outlines (baseline at y=0) keyed by
        typeface/size/text — extraction from an OTF is the expensive part. */
    struct Outline
    {
        juce::Path path;
        juce::Rectangle<float> box;
    };

    std::map<juce::String, Outline> glyphOutlines;

    /** paintImage (objectFit:"fill"): resampled bitmaps keyed on
        (pixel-data identity, target size). */
    std::map<juce::int64, juce::Image> scaledImages;
};

} // namespace vsreact
