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

    // Arc ring (knob track + value) centred in the node.
    if (style.has ("arcTrackColor") || style.has ("arcColor"))
    {
        const auto thickness = style.getFloat ("arcThickness", 4.0f);
        const auto radius = juce::jmin (node.frame.getWidth(), node.frame.getHeight()) * 0.5f
                          - thickness * 0.5f;

        // Rounded caps read as capsule blobs on short slices; arcCap "butt"
        // makes radial ticks and dashes possible.
        const auto cap = style.getString ("arcCap") == "butt"
                       ? juce::PathStrokeType::butt
                       : juce::PathStrokeType::rounded;

        const auto drawArc = [&] (juce::Colour colour, float fromDeg, float toDeg)
        {
            if (toDeg <= fromDeg + 0.01f || radius <= 0.0f)
                return;

            juce::Path arc;
            arc.addCentredArc (node.frame.getCentreX(), node.frame.getCentreY(),
                               radius, radius, 0.0f,
                               juce::degreesToRadians (fromDeg),
                               juce::degreesToRadians (toDeg),
                               true);
            g.setColour (colour);
            g.strokePath (arc, juce::PathStrokeType (thickness,
                                                     juce::PathStrokeType::curved,
                                                     cap));
        };

        const auto arcStart = style.getFloat ("arcStart", -135.0f);

        if (const auto track = style.getColour ("arcTrackColor"))
            drawArc (*track, arcStart, style.getFloat ("arcEnd", 135.0f));

        if (const auto value = style.getColour ("arcColor"))
            drawArc (*value,
                     style.getFloat ("arcValueStart", arcStart), // bipolar knobs sweep from centre
                     style.getFloat ("arcValueEnd", arcStart));
    }

    if (node.type == "text")
        paintText (g, node, style);
    else if (node.type == "image")
        paintImage (g, node);

    const bool scrollable = node.isScrollable();

    if (style.overflowHidden() || scrollable)
        g.reduceClipRegion (path);

    if (scrollable && node.scrollY != 0.0f)
    {
        juce::Graphics::ScopedSaveState scrollState (g);
        g.addTransform (juce::AffineTransform::translation (0.0f, -node.scrollY));

        for (const auto* child : node.children)
            paintNode (g, *child);
    }
    else
    {
        for (const auto* child : node.children)
            paintNode (g, *child);
    }

    // Scrollbar thumb.
    if (scrollable)
    {
        const auto extent = node.maxScroll();

        if (extent > 0.0f)
        {
            const auto frameH = node.frame.getHeight();
            const auto thumbH = juce::jmax (24.0f, frameH * frameH / node.contentHeight());
            const auto thumbY = node.frame.getY()
                              + (node.scrollY / extent) * (frameH - thumbH);

            g.setColour (juce::Colour (0x30ffffff));
            g.fillRoundedRectangle (node.frame.getRight() - 5.0f, thumbY, 3.0f, thumbH, 1.5f);
        }
    }

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

juce::Image Painter::decodeDataUriImage (const juce::String& source)
{
    // data:image/png;base64,<payload> — PNG/JPEG/GIF (whatever
    // juce::ImageFileFormat knows). Non-base64 payloads are not images.
    const auto comma = source.indexOfChar (',');

    if (comma <= 0 || ! source.substring (0, comma).endsWith (";base64"))
        return {};

    juce::MemoryOutputStream decoded;

    if (! juce::Base64::convertFromBase64 (decoded, source.substring (comma + 1)))
        return {};

    return juce::ImageFileFormat::loadFrom (decoded.getData(), decoded.getDataSize());
}

void Painter::paintImage (juce::Graphics& g, const Node& node)
{
    const auto source = node.props["src"].toString();

    if (source.isEmpty())
        return;

    juce::Image image;

    if (source.startsWith ("data:"))
    {
        // Decoded once, cached under the source string's hash.
        const auto hash = source.hashCode64();
        image = juce::ImageCache::getFromHashCode (hash);

        if (! image.isValid())
        {
            image = decodeDataUriImage (source);

            if (image.isValid())
                juce::ImageCache::addImageToCache (image, hash);
        }
    }
    else
    {
        image = juce::ImageCache::getFromFile (juce::File (source));
    }

    if (image.isValid())
    {
        // Low-quality resampling turns bright single pixels into sparkle
        // when an asset is drawn below its native size.
        g.setImageResamplingQuality (juce::Graphics::highResamplingQuality);
        g.drawImage (image, node.frame, juce::RectanglePlacement::centred);
    }
}

} // namespace vsreact
