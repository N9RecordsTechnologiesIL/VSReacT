#include "Painter.h"

namespace vsreact
{

juce::Path Painter::roundedRectPath (juce::Rectangle<float> r,
                                     float tl, float tr, float br, float bl)
{
    const auto maxRadius = juce::jmin (r.getWidth(), r.getHeight()) * 0.5f;
    tl = juce::jlimit (0.0f, maxRadius, tl);
    tr = juce::jlimit (0.0f, maxRadius, tr);
    br = juce::jlimit (0.0f, maxRadius, br);
    bl = juce::jlimit (0.0f, maxRadius, bl);

    juce::Path p;

    if (tl <= 0.0f && tr <= 0.0f && br <= 0.0f && bl <= 0.0f)
    {
        p.addRectangle (r);
        return p;
    }

    using Constants = juce::MathConstants<float>;

    p.startNewSubPath (r.getX() + tl, r.getY());
    p.lineTo (r.getRight() - tr, r.getY());

    if (tr > 0.0f)
        p.addArc (r.getRight() - 2.0f * tr, r.getY(), 2.0f * tr, 2.0f * tr,
                  0.0f, Constants::halfPi);

    p.lineTo (r.getRight(), r.getBottom() - br);

    if (br > 0.0f)
        p.addArc (r.getRight() - 2.0f * br, r.getBottom() - 2.0f * br, 2.0f * br, 2.0f * br,
                  Constants::halfPi, Constants::pi);

    p.lineTo (r.getX() + bl, r.getBottom());

    if (bl > 0.0f)
        p.addArc (r.getX(), r.getBottom() - 2.0f * bl, 2.0f * bl, 2.0f * bl,
                  Constants::pi, Constants::pi * 1.5f);

    p.lineTo (r.getX(), r.getY() + tl);

    if (tl > 0.0f)
        p.addArc (r.getX(), r.getY(), 2.0f * tl, 2.0f * tl,
                  Constants::pi * 1.5f, Constants::twoPi);

    p.closeSubPath();
    return p;
}

void Painter::paint (juce::Graphics& g, const Node& root)
{
    for (const auto* child : root.children)
        paintNode (g, *child);
}

void Painter::paintNode (juce::Graphics& g, const Node& node)
{
    if (node.type == "rawtext")
        return;   // painted by its text parent

    const auto style = node.effectiveStyle();
    const auto alpha = juce::jlimit (0.0f, 1.0f, style.opacity());

    if (alpha <= 0.0f || node.frame.isEmpty())
        return;

    juce::Graphics::ScopedSaveState save (g);

    const bool needsLayer = alpha < 1.0f;

    if (needsLayer)
        g.beginTransparencyLayer (alpha);

    const auto path = roundedRectPath (node.frame,
                                       style.cornerRadius (0), style.cornerRadius (1),
                                       style.cornerRadius (2), style.cornerRadius (3));

    if (const auto shadowColor = style.getColour ("shadowColor"))
    {
        const juce::DropShadow shadow (*shadowColor,
                                       juce::roundToInt (style.getFloat ("shadowRadius", 4.0f)),
                                       { 0, juce::roundToInt (style.getFloat ("shadowOffsetY", 0.0f)) });
        shadow.drawForPath (g, path);
    }

    if (const auto background = style.getColour ("backgroundColor"))
    {
        g.setColour (*background);
        g.fillPath (path);
    }

    const auto borderWidth = style.getFloat ("borderWidth", 0.0f);

    if (borderWidth > 0.0f)
    {
        if (const auto borderColor = style.getColour ("borderColor"))
        {
            const auto inset = borderWidth * 0.5f;
            const auto borderPath = roundedRectPath (node.frame.reduced (inset),
                                                     style.cornerRadius (0) - inset,
                                                     style.cornerRadius (1) - inset,
                                                     style.cornerRadius (2) - inset,
                                                     style.cornerRadius (3) - inset);
            g.setColour (*borderColor);
            g.strokePath (borderPath, juce::PathStrokeType (borderWidth));
        }
    }

    if (node.type == "text")
        paintText (g, node, style);
    else if (node.type == "image")
        paintImage (g, node);

    if (style.overflowHidden())
        g.reduceClipRegion (path);

    for (const auto* child : node.children)
        paintNode (g, *child);

    if (needsLayer)
        g.endTransparencyLayer();
}

void Painter::paintText (juce::Graphics& g, const Node& node, const Style& style)
{
    const auto text = node.textContent();

    if (text.isEmpty())
        return;

    juce::AttributedString attributed;
    attributed.setText (text);
    attributed.setFont (style.font());
    attributed.setColour (style.getColour ("color").value_or (juce::Colours::white));
    attributed.setJustification (style.textAlign());

    juce::TextLayout layout;
    layout.createLayout (attributed, node.frame.getWidth());

    const auto y = node.frame.getY()
                 + juce::jmax (0.0f, (node.frame.getHeight() - layout.getHeight()) * 0.5f);

    layout.draw (g, { node.frame.getX(), y, node.frame.getWidth(), layout.getHeight() });
}

void Painter::paintImage (juce::Graphics& g, const Node& node)
{
    const auto source = node.props["src"].toString();

    if (source.isEmpty())
        return;

    const auto image = juce::ImageCache::getFromFile (juce::File (source));

    if (image.isValid())
        g.drawImage (image, node.frame, juce::RectanglePlacement::centred);
}

} // namespace vsreact
