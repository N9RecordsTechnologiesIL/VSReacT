#pragma once

#include "ShadowTree.h"

namespace vsreact
{

/** Paints a laid-out shadow tree with juce::Graphics: backgrounds, per-corner
    rounded rects, borders, drop shadows, opacity layers, overflow clipping,
    text and images. */
class Painter
{
public:
    static void paint (juce::Graphics& g, const Node& root);

    /** Paint targeting an image the caller will blit — enables
        backdropBlurRadius nodes to sample what's already painted beneath
        them. `g` must draw into `canvas` (RootView sets this up when the
        tree contains any backdrop node). */
    static void paint (juce::Graphics& g, const Node& root, const juce::Image& canvas);

    /** Whether any node in the tree declares backdropBlurRadius (in any
        state variant) — the trigger for buffered painting. */
    static bool treeHasBackdrop (const Node& node);

    /** Rounded-rect outline for a node's effective style — also used by
        hit-testing and focus rings. */
    static juce::Path roundedRectPath (juce::Rectangle<float> bounds,
                                       float topLeft, float topRight,
                                       float bottomRight, float bottomLeft);

    /** Decodes a base64 `data:` URI into an image (PNG/JPEG/GIF/WebP);
        returns an invalid image for anything else. Exposed for tests. */
    static juce::Image decodeDataUriImage (const juce::String& source);

private:
    static void paintNode (juce::Graphics& g, const Node& node, bool skipOwnBlur = false);
    static void paintBlurred (juce::Graphics& g, const Node& node, int radius);
    static void paintText (juce::Graphics& g, const Node& node, const Style& style);
    static void paintImage (juce::Graphics& g, const Node& node);
    static void paintSvg (juce::Graphics& g, const Node& node);
    static void paintCanvas (juce::Graphics& g, const Node& node);
};

} // namespace vsreact
