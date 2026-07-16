#pragma once

#include <juce_graphics/juce_graphics.h>
#include <yoga/Yoga.h>

#include <optional>

namespace vsreact
{

/** "#rrggbb" / "#rrggbbaa" (CSS byte order) → juce::Colour. */
std::optional<juce::Colour> parseCssColor (const juce::String& text);

/** A resolved style — the flat objects produced by the JS tailwind resolver.
    Stores raw values and exposes typed accessors plus the Yoga application. */
struct Style
{
    juce::NamedValueSet values;

    static Style fromVar (const juce::var& v);

    Style mergedWith (const Style& overlay) const;
    bool isEmpty() const noexcept { return values.isEmpty(); }
    bool has (const juce::Identifier& key) const noexcept { return values.contains (key); }

    std::optional<juce::Colour> getColour (const juce::Identifier& key) const;
    float getFloat (const juce::Identifier& key, float fallback = 0.0f) const;
    juce::String getString (const juce::Identifier& key, const juce::String& fallback = {}) const;

    /** Corner radii resolved from borderRadius + per-corner overrides.
        corner: 0 topLeft, 1 topRight, 2 bottomRight, 3 bottomLeft. */
    float cornerRadius (int corner) const;
    bool hasAnyRadius() const;

    float opacity() const { return getFloat ("opacity", 1.0f); }
    bool overflowHidden() const { return getString ("overflow") == "hidden"; }

    /** Text font from fontSize / fontWeight / letterSpacing. */
    juce::Font font() const;
    juce::Justification textAlign() const;

    /** Applies every supported layout key to a yoga node, resetting the
        supported properties to defaults first so prop updates never leak
        stale values. */
    void applyLayout (YGNodeRef node) const;
};

} // namespace vsreact
