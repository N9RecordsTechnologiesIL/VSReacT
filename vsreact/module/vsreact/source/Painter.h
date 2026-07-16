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

    /** Rounded-rect outline for a node's effective style — also used by
        hit-testing and focus rings. */
    static juce::Path roundedRectPath (juce::Rectangle<float> bounds,
                                       float topLeft, float topRight,
                                       float bottomRight, float bottomLeft);

private:
    static void paintNode (juce::Graphics& g, const Node& node);
    static void paintText (juce::Graphics& g, const Node& node, const Style& style);
    static void paintImage (juce::Graphics& g, const Node& node);
};

} // namespace vsreact
