#include "Style.h"

namespace vsreact
{

std::optional<juce::Colour> parseCssColor (const juce::String& text)
{
    if (! text.startsWithChar ('#'))
        return std::nullopt;

    const auto hex = text.substring (1);

    const auto byteAt = [&hex] (int index) -> juce::uint8
    {
        return static_cast<juce::uint8> (hex.substring (index, index + 2).getHexValue32());
    };

    if (hex.length() == 6)
        return juce::Colour::fromRGB (byteAt (0), byteAt (2), byteAt (4));

    if (hex.length() == 8)
        return juce::Colour::fromRGBA (byteAt (0), byteAt (2), byteAt (4), byteAt (6));

    return std::nullopt;
}

//==============================================================================
Style Style::fromVar (const juce::var& v)
{
    Style style;

    if (auto* object = v.getDynamicObject())
        style.values = object->getProperties();

    return style;
}

Style Style::mergedWith (const Style& overlay) const
{
    Style merged { values };

    for (const auto& property : overlay.values)
        merged.values.set (property.name, property.value);

    return merged;
}

std::optional<juce::Colour> Style::getColour (const juce::Identifier& key) const
{
    if (const auto* value = values.getVarPointer (key))
        return parseCssColor (value->toString());

    return std::nullopt;
}

float Style::getFloat (const juce::Identifier& key, float fallback) const
{
    if (const auto* value = values.getVarPointer (key))
        if (value->isDouble() || value->isInt() || value->isInt64())
            return static_cast<float> (static_cast<double> (*value));

    return fallback;
}

juce::String Style::getString (const juce::Identifier& key, const juce::String& fallback) const
{
    if (const auto* value = values.getVarPointer (key))
        return value->toString();

    return fallback;
}

float Style::cornerRadius (int corner) const
{
    static const juce::Identifier cornerKeys[] = {
        "borderTopLeftRadius", "borderTopRightRadius",
        "borderBottomRightRadius", "borderBottomLeftRadius",
    };

    const auto base = getFloat ("borderRadius", 0.0f);
    return getFloat (cornerKeys[corner % 4], base);
}

bool Style::hasAnyRadius() const
{
    return has ("borderRadius")
        || has ("borderTopLeftRadius") || has ("borderTopRightRadius")
        || has ("borderBottomRightRadius") || has ("borderBottomLeftRadius");
}

juce::Font Style::font() const
{
    const auto size = getFloat ("fontSize", 14.0f);

    int weight = 400;

    if (const auto* value = values.getVarPointer ("fontWeight"))
        weight = value->isString() ? (value->toString() == "bold" ? 700 : 400)
                                   : static_cast<int> (*value);

    auto font = juce::Font (juce::FontOptions { size }
                                .withStyle (weight >= 600 ? "Bold" : "Regular"));

    const auto letterSpacing = getFloat ("letterSpacing", 0.0f);

    if (letterSpacing != 0.0f && size > 0.0f)
        font.setExtraKerningFactor (letterSpacing / size);

    return font;
}

juce::Justification Style::textAlign() const
{
    const auto align = getString ("textAlign", "left");

    if (align == "center")
        return juce::Justification::horizontallyCentred;

    if (align == "right")
        return juce::Justification::right;

    return juce::Justification::left;
}

//==============================================================================
namespace
{
    bool isNumber (const juce::var& v)
    {
        return v.isDouble() || v.isInt() || v.isInt64();
    }

    float toFloat (const juce::var& v)
    {
        return static_cast<float> (static_cast<double> (v));
    }

    /** number | "NN%" | "auto" applied through the matching yoga setter. */
    void applyDimension (YGNodeRef node, const juce::var& v,
                         void (*setPoints) (YGNodeRef, float),
                         void (*setPercent) (YGNodeRef, float),
                         void (*setAuto) (YGNodeRef) = nullptr)
    {
        if (v.isString())
        {
            const auto text = v.toString();

            if (text == "auto")
            {
                if (setAuto != nullptr)
                    setAuto (node);
            }
            else if (text.endsWithChar ('%'))
            {
                if (setPercent != nullptr)
                    setPercent (node, text.dropLastCharacters (1).getFloatValue());
            }

            return;
        }

        if (isNumber (v))
            setPoints (node, toFloat (v));
    }

    void applyEdge (YGNodeRef node, YGEdge edge, const juce::var& v,
                    void (*setPoints) (YGNodeRef, YGEdge, float),
                    void (*setPercent) (YGNodeRef, YGEdge, float))
    {
        if (v.isString() && v.toString().endsWithChar ('%'))
        {
            if (setPercent != nullptr)
                setPercent (node, edge, v.toString().dropLastCharacters (1).getFloatValue());
        }
        else if (isNumber (v))
        {
            setPoints (node, edge, toFloat (v));
        }
    }

    YGFlexDirection toFlexDirection (const juce::String& s)
    {
        if (s == "row")            return YGFlexDirectionRow;
        if (s == "row-reverse")    return YGFlexDirectionRowReverse;
        if (s == "column-reverse") return YGFlexDirectionColumnReverse;
        return YGFlexDirectionColumn;
    }

    YGJustify toJustify (const juce::String& s)
    {
        if (s == "center")        return YGJustifyCenter;
        if (s == "flex-end")      return YGJustifyFlexEnd;
        if (s == "space-between") return YGJustifySpaceBetween;
        if (s == "space-around")  return YGJustifySpaceAround;
        if (s == "space-evenly")  return YGJustifySpaceEvenly;
        return YGJustifyFlexStart;
    }

    YGAlign toAlign (const juce::String& s, YGAlign fallback)
    {
        if (s == "flex-start") return YGAlignFlexStart;
        if (s == "center")     return YGAlignCenter;
        if (s == "flex-end")   return YGAlignFlexEnd;
        if (s == "stretch")    return YGAlignStretch;
        if (s == "baseline")   return YGAlignBaseline;
        if (s == "auto")       return YGAlignAuto;
        return fallback;
    }

    void resetLayout (YGNodeRef n)
    {
        YGNodeStyleSetFlexDirection (n, YGFlexDirectionColumn);
        YGNodeStyleSetJustifyContent (n, YGJustifyFlexStart);
        YGNodeStyleSetAlignItems (n, YGAlignStretch);
        YGNodeStyleSetAlignSelf (n, YGAlignAuto);
        YGNodeStyleSetPositionType (n, YGPositionTypeRelative);
        YGNodeStyleSetFlexWrap (n, YGWrapNoWrap);
        YGNodeStyleSetOverflow (n, YGOverflowVisible);
        YGNodeStyleSetFlex (n, YGUndefined);
        YGNodeStyleSetFlexGrow (n, YGUndefined);
        YGNodeStyleSetFlexShrink (n, YGUndefined);
        YGNodeStyleSetFlexBasisAuto (n);
        YGNodeStyleSetWidthAuto (n);
        YGNodeStyleSetHeightAuto (n);
        YGNodeStyleSetMinWidth (n, YGUndefined);
        YGNodeStyleSetMinHeight (n, YGUndefined);
        YGNodeStyleSetMaxWidth (n, YGUndefined);
        YGNodeStyleSetMaxHeight (n, YGUndefined);
        YGNodeStyleSetAspectRatio (n, YGUndefined);
        YGNodeStyleSetGap (n, YGGutterAll, YGUndefined);
        YGNodeStyleSetGap (n, YGGutterRow, YGUndefined);
        YGNodeStyleSetGap (n, YGGutterColumn, YGUndefined);

        for (const auto edge : { YGEdgeLeft, YGEdgeTop, YGEdgeRight, YGEdgeBottom, YGEdgeAll })
        {
            YGNodeStyleSetMargin (n, edge, YGUndefined);
            YGNodeStyleSetPadding (n, edge, YGUndefined);
            YGNodeStyleSetPosition (n, edge, YGUndefined);
        }
    }
}

void Style::applyLayout (YGNodeRef node) const
{
    resetLayout (node);

    struct EdgeKey { const char* name; YGEdge edge; };

    static constexpr EdgeKey paddingKeys[] = {
        { "padding", YGEdgeAll },
        { "paddingLeft", YGEdgeLeft }, { "paddingTop", YGEdgeTop },
        { "paddingRight", YGEdgeRight }, { "paddingBottom", YGEdgeBottom },
    };

    static constexpr EdgeKey marginKeys[] = {
        { "margin", YGEdgeAll },
        { "marginLeft", YGEdgeLeft }, { "marginTop", YGEdgeTop },
        { "marginRight", YGEdgeRight }, { "marginBottom", YGEdgeBottom },
    };

    static constexpr EdgeKey positionKeys[] = {
        { "left", YGEdgeLeft }, { "top", YGEdgeTop },
        { "right", YGEdgeRight }, { "bottom", YGEdgeBottom },
    };

    for (const auto& property : values)
    {
        const auto name = property.name.toString();
        const auto& v = property.value;

        if (name == "width")
            applyDimension (node, v, YGNodeStyleSetWidth, YGNodeStyleSetWidthPercent, YGNodeStyleSetWidthAuto);
        else if (name == "height")
            applyDimension (node, v, YGNodeStyleSetHeight, YGNodeStyleSetHeightPercent, YGNodeStyleSetHeightAuto);
        else if (name == "minWidth")
            applyDimension (node, v, YGNodeStyleSetMinWidth, YGNodeStyleSetMinWidthPercent);
        else if (name == "minHeight")
            applyDimension (node, v, YGNodeStyleSetMinHeight, YGNodeStyleSetMinHeightPercent);
        else if (name == "maxWidth")
            applyDimension (node, v, YGNodeStyleSetMaxWidth, YGNodeStyleSetMaxWidthPercent);
        else if (name == "maxHeight")
            applyDimension (node, v, YGNodeStyleSetMaxHeight, YGNodeStyleSetMaxHeightPercent);
        else if (name == "flexBasis")
            applyDimension (node, v, YGNodeStyleSetFlexBasis, YGNodeStyleSetFlexBasisPercent, YGNodeStyleSetFlexBasisAuto);
        else if (name == "flex" && isNumber (v))
            YGNodeStyleSetFlex (node, toFloat (v));
        else if (name == "flexGrow" && isNumber (v))
            YGNodeStyleSetFlexGrow (node, toFloat (v));
        else if (name == "flexShrink" && isNumber (v))
            YGNodeStyleSetFlexShrink (node, toFloat (v));
        else if (name == "flexDirection")
            YGNodeStyleSetFlexDirection (node, toFlexDirection (v.toString()));
        else if (name == "flexWrap")
            YGNodeStyleSetFlexWrap (node, v.toString() == "wrap" ? YGWrapWrap : YGWrapNoWrap);
        else if (name == "justifyContent")
            YGNodeStyleSetJustifyContent (node, toJustify (v.toString()));
        else if (name == "alignItems")
            YGNodeStyleSetAlignItems (node, toAlign (v.toString(), YGAlignStretch));
        else if (name == "alignSelf")
            YGNodeStyleSetAlignSelf (node, toAlign (v.toString(), YGAlignAuto));
        else if (name == "position")
            YGNodeStyleSetPositionType (node, v.toString() == "absolute" ? YGPositionTypeAbsolute
                                                                         : YGPositionTypeRelative);
        else if (name == "overflow")
            YGNodeStyleSetOverflow (node, v.toString() == "hidden" ? YGOverflowHidden
                                                                   : YGOverflowVisible);
        else if (name == "gap" && isNumber (v))
            YGNodeStyleSetGap (node, YGGutterAll, toFloat (v));
        else if (name == "rowGap" && isNumber (v))
            YGNodeStyleSetGap (node, YGGutterRow, toFloat (v));
        else if (name == "columnGap" && isNumber (v))
            YGNodeStyleSetGap (node, YGGutterColumn, toFloat (v));
        else if (name == "aspectRatio" && isNumber (v))
            YGNodeStyleSetAspectRatio (node, toFloat (v));
        else
        {
            for (const auto& key : paddingKeys)
                if (name == key.name)
                    applyEdge (node, key.edge, v, YGNodeStyleSetPadding, YGNodeStyleSetPaddingPercent);

            for (const auto& key : marginKeys)
                if (name == key.name)
                    applyEdge (node, key.edge, v, YGNodeStyleSetMargin, YGNodeStyleSetMarginPercent);

            for (const auto& key : positionKeys)
                if (name == key.name)
                    applyEdge (node, key.edge, v, YGNodeStyleSetPosition, YGNodeStyleSetPositionPercent);
        }
    }
}

} // namespace vsreact
