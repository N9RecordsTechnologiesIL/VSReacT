#pragma once

#include "ShadowTree.h"

#include <vector>

namespace vsreact
{

/** Geometry for opt-in text selection (style userSelect:"text").

    Character boxes mirror Painter::paintText's TextLayout construction
    exactly (font, wrap width, line spacing, vertical centring, and
    textTransform applied first), so highlights land under the painted
    glyphs. Indices are caret positions into visibleText(). */
struct TextSelection
{
    /** The node's painted text — textContent() after textTransform. This is
        what selection indexes into and what copy puts on the clipboard. */
    static juce::String visibleText (const Node& node);
    static juce::String visibleText (const Node& node, const Style& style);

    /** One rectangle per character of visibleText(), in root space
        (unscrolled). Characters without their own glyph (ligature tails)
        get a thin box at the previous glyph's right edge. */
    static std::vector<juce::Rectangle<float>> characterBoxes (const Node& node);

    /** The caret position (0..length) nearest a root-space point: nearest
        line vertically, then nearest character boundary horizontally. */
    static int caretIndexAt (const Node& node, juce::Point<float> position);

    /** Per-line highlight rects for the caret range [start, end). */
    static std::vector<juce::Rectangle<float>> selectionRects (const Node& node,
                                                               int start, int end);

    /** The word around `index` ([start, end)); a lone non-word character
        selects just itself. */
    static juce::Range<int> wordRangeAt (const juce::String& text, int index);
};

} // namespace vsreact
