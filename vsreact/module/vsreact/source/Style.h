#pragma once

#include <juce_graphics/juce_graphics.h>
#include <yoga/Yoga.h>

#include <optional>
#include <vector>

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

    /** CSS-order gradient background. Type from gradientType
        ("linear"|"radial"|"conic"); stops from a gradientStops array of
        { offset?, color } or the gradientFrom/gradientVia/gradientTo
        shorthands; gradientAngle in CSS degrees (0 = up, clockwise). */
    struct Gradient
    {
        enum class Type { linear, radial, conic };
        Type type = Type::linear;
        float angle = 180.0f;
        std::vector<std::pair<float, juce::Colour>> stops;
    };

    std::optional<Gradient> gradient() const;

    /** rotate (deg) / scale / translateX / translateY about the frame
        centre, CSS order translate → rotate → scale. Paint-time only:
        layout and hit rectangles are not transformed. */
    bool hasTransform() const;
    juce::AffineTransform transformFor (juce::Rectangle<float> frame) const;

    /** Per-side border widths; fall back to the uniform borderWidth. */
    float borderSideWidth (int side) const; // 0 top, 1 right, 2 bottom, 3 left
    bool hasPerSideBorder() const;

    /** Text font from fontSize / fontWeight / letterSpacing. */
    juce::Font font() const;
    juce::Justification textAlign() const;

    /** Applies every supported layout key to a yoga node, resetting the
        supported properties to defaults first so prop updates never leak
        stale values. */
    void applyLayout (YGNodeRef node) const;
};

} // namespace vsreact
