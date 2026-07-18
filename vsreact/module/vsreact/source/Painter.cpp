#include "Painter.h"
#include "HitTest.h"

#include <map>

namespace vsreact
{

namespace
{
    juce::Colour interpolateStops (const std::vector<std::pair<float, juce::Colour>>& stops, float t)
    {
        if (t <= stops.front().first)
            return stops.front().second;

        for (size_t i = 1; i < stops.size(); ++i)
        {
            if (t <= stops[i].first)
            {
                const auto span = stops[i].first - stops[i - 1].first;
                const auto local = span > 0.0f ? (t - stops[i - 1].first) / span : 1.0f;
                return stops[i - 1].second.interpolatedWith (stops[i].second, local);
            }
        }

        return stops.back().second;
    }

    /** CSS conic-gradient rendered to an image, cached by size + spec —
        knob sheens repaint every frame, the raster shouldn't. */
    const juce::Image& conicImage (int width, int height, float startDeg,
                                   const std::vector<std::pair<float, juce::Colour>>& stops)
    {
        juce::String key;
        key << width << "x" << height << "@" << juce::String (startDeg, 1);

        for (const auto& [offset, colour] : stops)
            key << ":" << juce::String (offset, 3) << colour.toString();

        static std::map<juce::String, juce::Image> cache;

        if (const auto found = cache.find (key); found != cache.end())
            return found->second;

        if (cache.size() > 24)
            cache.clear();

        juce::Image image (juce::Image::ARGB, juce::jmax (1, width), juce::jmax (1, height), true);
        juce::Image::BitmapData pixels (image, juce::Image::BitmapData::writeOnly);

        const auto cx = width * 0.5f;
        const auto cy = height * 0.5f;

        for (int y = 0; y < image.getHeight(); ++y)
        {
            for (int x = 0; x < image.getWidth(); ++x)
            {
                // CSS convention: 0deg points up, angles run clockwise.
                const auto degrees = juce::radiansToDegrees (
                    std::atan2 ((float) x + 0.5f - cx, cy - ((float) y + 0.5f)));
                const auto t = std::fmod (degrees - startDeg + 720.0f, 360.0f) / 360.0f;
                pixels.setPixelColour (x, y, interpolateStops (stops, t));
            }
        }

        return cache.emplace (key, std::move (image)).first->second;
    }

    void fillGradient (juce::Graphics& g, const juce::Path& path,
                       juce::Rectangle<float> frame, const Style::Gradient& gradient)
    {
        juce::Graphics::ScopedSaveState save (g);
        g.reduceClipRegion (path);

        if (gradient.type == Style::Gradient::Type::conic)
        {
            g.setImageResamplingQuality (juce::Graphics::highResamplingQuality);
            g.drawImage (conicImage (juce::roundToInt (frame.getWidth()),
                                     juce::roundToInt (frame.getHeight()),
                                     gradient.angle, gradient.stops),
                         frame, juce::RectanglePlacement::stretchToFit);
            return;
        }

        juce::ColourGradient fill;

        if (gradient.type == Style::Gradient::Type::radial)
        {
            // CSS default: ellipse to the farthest corner. JUCE gradients are
            // circular, so render a circle and squash it to the frame.
            const auto radius = frame.getWidth() * 0.5f * juce::MathConstants<float>::sqrt2;
            fill = juce::ColourGradient (gradient.stops.front().second, frame.getCentreX(), frame.getCentreY(),
                                         gradient.stops.back().second, frame.getCentreX() + radius, frame.getCentreY(),
                                         true);
            g.addTransform (juce::AffineTransform::scale (1.0f, frame.getHeight() / juce::jmax (1.0f, frame.getWidth()),
                                                          frame.getCentreX(), frame.getCentreY()));
        }
        else
        {
            // CSS linear: 0deg points up, clockwise; the line spans the
            // rect's projection so the first/last stops land on the edges.
            const auto radians = juce::degreesToRadians (gradient.angle);
            const auto dx = std::sin (radians);
            const auto dy = -std::cos (radians);
            const auto halfLength = 0.5f * (std::abs (frame.getWidth() * dx)
                                            + std::abs (frame.getHeight() * dy));
            const juce::Point<float> centre = frame.getCentre();
            fill = juce::ColourGradient (gradient.stops.front().second,
                                         centre.x - dx * halfLength, centre.y - dy * halfLength,
                                         gradient.stops.back().second,
                                         centre.x + dx * halfLength, centre.y + dy * halfLength,
                                         false);
        }

        for (size_t i = 1; i + 1 < gradient.stops.size(); ++i)
            fill.addColour (gradient.stops[i].first, gradient.stops[i].second);

        g.setGradientFill (fill);
        g.fillRect (gradient.type == Style::Gradient::Type::radial
                        ? frame.withSizeKeepingCentre (frame.getWidth() * 2.0f, frame.getWidth() * 2.0f)
                        : frame);
    }
}

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
    for (const auto* child : paintOrdered (root.children))
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

    // Paint-time transform about the frame centre; children inherit. Layout
    // and hit rectangles stay untransformed (documented).
    if (style.hasTransform())
        g.addTransform (style.transformFor (node.frame));

    // clipPolygon ([x,y,x,y,… in % of the frame], CSS clip-path: polygon())
    // replaces the rounded rect as the node's shape.
    juce::Path path;

    if (const auto* polygon = style.values.getVarPointer ("clipPolygon");
        polygon != nullptr && polygon->isArray() && polygon->getArray()->size() >= 6)
    {
        const auto& points = *polygon->getArray();

        for (int i = 0; i + 1 < points.size(); i += 2)
        {
            const auto x = node.frame.getX() + node.frame.getWidth() * (float) (double) points[i] / 100.0f;
            const auto y = node.frame.getY() + node.frame.getHeight() * (float) (double) points[i + 1] / 100.0f;

            if (i == 0)
                path.startNewSubPath (x, y);
            else
                path.lineTo (x, y);
        }

        path.closeSubPath();
    }
    else
    {
        path = roundedRectPath (node.frame,
                                style.cornerRadius (0), style.cornerRadius (1),
                                style.cornerRadius (2), style.cornerRadius (3));
    }

    if (const auto shadowColor = style.getColour ("shadowColor"))
    {
        const juce::DropShadow shadow (*shadowColor,
                                       juce::roundToInt (style.getFloat ("shadowRadius", 4.0f)),
                                       { juce::roundToInt (style.getFloat ("shadowOffsetX", 0.0f)),
                                         juce::roundToInt (style.getFloat ("shadowOffsetY", 0.0f)) });
        shadow.drawForPath (g, path);
    }

    if (const auto gradient = style.gradient())
    {
        fillGradient (g, path, node.frame, *gradient);
    }
    else if (const auto background = style.getColour ("backgroundColor"))
    {
        g.setColour (*background);
        g.fillPath (path);
    }

    // CSS box-shadow inset: shadow of the inverse region, clipped inside.
    if (const auto insetColor = style.getColour ("insetShadowColor"))
    {
        const auto radius = style.getFloat ("insetShadowRadius", 4.0f);
        const auto margin = radius * 2.0f + 8.0f;

        juce::Path ring;
        ring.setUsingNonZeroWinding (false);
        ring.addRectangle (node.frame.expanded (margin));
        ring.addPath (path);

        juce::Graphics::ScopedSaveState insetState (g);
        g.reduceClipRegion (path);

        const juce::DropShadow shadow (*insetColor,
                                       juce::roundToInt (radius),
                                       { juce::roundToInt (style.getFloat ("insetShadowOffsetX", 0.0f)),
                                         juce::roundToInt (style.getFloat ("insetShadowOffsetY", 0.0f)) });
        shadow.drawForPath (g, ring);
    }

    if (style.hasPerSideBorder())
    {
        // Per-side widths paint as square strips (corner radii ignored).
        if (const auto borderColor = style.getColour ("borderColor"))
        {
            const auto f = node.frame;
            const auto top = style.borderSideWidth (0);
            const auto right = style.borderSideWidth (1);
            const auto bottom = style.borderSideWidth (2);
            const auto left = style.borderSideWidth (3);

            g.setColour (*borderColor);

            if (top > 0.0f)    g.fillRect (f.withHeight (top));
            if (bottom > 0.0f) g.fillRect (f.withTop (f.getBottom() - bottom));
            if (left > 0.0f)   g.fillRect (f.withWidth (left));
            if (right > 0.0f)  g.fillRect (f.withLeft (f.getRight() - right));
        }
    }
    else if (const auto borderWidth = style.getFloat ("borderWidth", 0.0f); borderWidth > 0.0f)
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

    const auto ordered = paintOrdered (node.children);

    if (scrollable && node.scrollY != 0.0f)
    {
        juce::Graphics::ScopedSaveState scrollState (g);
        g.addTransform (juce::AffineTransform::translation (0.0f, -node.scrollY));

        for (const auto* child : ordered)
            paintNode (g, *child);
    }
    else
    {
        for (const auto* child : ordered)
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

    // Glyph-shaped glow (CSS text-shadow), drawn under the fill.
    if (const auto glowColor = style.getColour ("textShadowColor"))
    {
        juce::GlyphArrangement glyphs;
        glyphs.addFittedText (style.font(), text,
                              node.frame.getX(), y, node.frame.getWidth(), layout.getHeight(),
                              style.textAlign(), 2);

        juce::Path glyphPath;
        glyphs.createPath (glyphPath);

        const juce::DropShadow shadow (*glowColor,
                                       juce::roundToInt (style.getFloat ("textShadowRadius", 3.0f)),
                                       { juce::roundToInt (style.getFloat ("textShadowOffsetX", 0.0f)),
                                         juce::roundToInt (style.getFloat ("textShadowOffsetY", 0.0f)) });
        shadow.drawForPath (g, glyphPath);
    }

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
