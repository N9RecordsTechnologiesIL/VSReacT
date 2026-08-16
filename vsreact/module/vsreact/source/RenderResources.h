#pragma once

#include "FontRegistry.h"
#include "ImageRegistry.h"
#include "Style.h"

#include <map>
#include <optional>
#include <vector>

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

    /** Box shadows: the rendered (Gaussian-blurred) bitmap keyed by kind,
        colour, radius, offset and origin-relative path geometry. A lit meter
        wall re-ran a full DropShadow per segment per frame; identical
        geometry now blurs once and blits after. */
    std::map<juce::String, juce::Image> shadows;

    /** Parsed gradients keyed on the stops array's identity (plus type and
        angle) — prop patches keep untouched vars alive, so the pointer only
        changes when the gradient actually did. */
    std::map<juce::String, Style::Gradient> gradients;

    /** backgroundLayers: each layer parsed (gradient or flat colour) once,
        keyed on the layers array's identity. */
    struct BackgroundLayer
    {
        std::optional<Style::Gradient> gradient;
        std::optional<juce::Colour> colour;
    };

    std::map<const void*, std::vector<BackgroundLayer>> backgroundLayers;
};

} // namespace vsreact
