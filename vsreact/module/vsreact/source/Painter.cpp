#include "Painter.h"
#include "HitTest.h"
#include "TextSelection.h"
#include "Blur.h"
#include "WebpImage.h"
#include "CanvasSurface.h"

#include <juce_gui_basics/juce_gui_basics.h> // Drawable::parseSVGPath

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

namespace
{
    // Set while paint() targets an image buffer; backdrop nodes sample it.
    // Painting is message-thread-only, so a file-static is safe.
    const juce::Image* activeCanvas = nullptr;
}

void Painter::paint (juce::Graphics& g, const Node& root)
{
    for (const auto* child : paintOrdered (root.children))
        paintNode (g, *child);
}

void Painter::paint (juce::Graphics& g, const Node& root, const juce::Image& canvas)
{
    activeCanvas = &canvas;
    paint (g, root);
    activeCanvas = nullptr;
}

bool Painter::treeHasBackdrop (const Node& node)
{
    static const juce::Identifier key ("backdropBlurRadius");

    if (node.style.has (key) || node.hoverStyle.has (key)
        || node.activeStyle.has (key) || node.focusStyle.has (key))
        return true;

    for (const auto* child : node.children)
        if (treeHasBackdrop (*child))
            return true;

    return false;
}

void Painter::paintBlurred (juce::Graphics& g, const Node& node, int radius)
{
    // CSS filter: blur() — render the node and its subtree offscreen, blur,
    // composite. Padded so the blur has room to bleed past the frame.
    const auto bounds = node.frame.getSmallestIntegerContainer().expanded (radius * 2);

    if (bounds.isEmpty())
        return;

    juce::Image offscreen (juce::Image::ARGB, bounds.getWidth(), bounds.getHeight(), true);

    {
        juce::Graphics offscreenGraphics (offscreen);
        offscreenGraphics.setOrigin (-bounds.getPosition());
        paintNode (offscreenGraphics, node, true);
    }

    stackBlur (offscreen, radius);
    g.drawImageAt (offscreen, bounds.getX(), bounds.getY());
}

void Painter::paintNode (juce::Graphics& g, const Node& node, bool skipOwnBlur)
{
    if (node.type == "rawtext" || node.type == "svgpath")
        return;   // painted by their text / svg parent

    const auto style = node.effectiveStyle();
    const auto alpha = juce::jlimit (0.0f, 1.0f, style.opacity());

    if (alpha <= 0.0f || node.frame.isEmpty())
        return;

    // CSS visibility: hidden — keeps layout, paints nothing (subtree too).
    if (style.getString ("visibility") == "hidden")
        return;

    if (! skipOwnBlur)
    {
        if (const auto blurRadius = juce::roundToInt (style.getFloat ("blurRadius", 0.0f));
            blurRadius > 0)
        {
            paintBlurred (g, node, blurRadius);
            return;
        }
    }

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

    // CSS clips an outer box-shadow to *outside* the border box: a node with a
    // transparent or partly transparent background never shows its own shadow
    // through itself. juce::DropShadow paints the full silhouette, so clip to
    // the region outside the node's shape first (same inverse-winding trick the
    // inset shadows use). Without this, a border-only node reads as a solid
    // block of shadow colour.
    const auto drawOuterShadow = [&g, &path, &node] (juce::Colour colour, float radius,
                                                     int offsetX, int offsetY)
    {
        juce::Path outside;
        outside.setUsingNonZeroWinding (false);
        outside.addRectangle (node.frame.expanded (radius * 3.0f + 16.0f
                                                   + (float) std::abs (offsetX)
                                                   + (float) std::abs (offsetY)));
        outside.addPath (path);

        juce::Graphics::ScopedSaveState shadowState (g);
        g.reduceClipRegion (outside);

        const juce::DropShadow shadow (colour, juce::roundToInt (radius), { offsetX, offsetY });
        shadow.drawForPath (g, path);
    };

    // CSS box-shadow inset: shadow of the inverse region (a ring around the
    // shape), clipped inside. Shared by the legacy insetShadow* keys and the
    // inset entries of the boxShadow array — both call it after the
    // background fill below.
    const auto drawInsetShadow = [&g, &path, &node] (juce::Colour colour, float radius,
                                                     int offsetX, int offsetY)
    {
        const auto margin = radius * 2.0f + 8.0f;

        juce::Path ring;
        ring.setUsingNonZeroWinding (false);
        ring.addRectangle (node.frame.expanded (margin));
        ring.addPath (path);

        juce::Graphics::ScopedSaveState insetState (g);
        g.reduceClipRegion (path);

        const juce::DropShadow shadow (colour, juce::roundToInt (radius), { offsetX, offsetY });
        shadow.drawForPath (g, ring);
    };

    if (const auto shadowColor = style.getColour ("shadowColor"))
    {
        drawOuterShadow (*shadowColor,
                         style.getFloat ("shadowRadius", 4.0f),
                         juce::roundToInt (style.getFloat ("shadowOffsetX", 0.0f)),
                         juce::roundToInt (style.getFloat ("shadowOffsetY", 0.0f)));
    }

    // boxShadow: [{ color, radius, offsetX, offsetY, inset? }, …] — CSS stacks
    // multiple shadows on one node. Outer entries paint behind the background
    // here; inset entries paint over it below. Last array entry is drawn first
    // (underneath), matching CSS paint order.
    if (const auto* box = style.values.getVarPointer ("boxShadow");
        box != nullptr && box->isArray())
    {
        const auto& entries = *box->getArray();

        for (int i = entries.size() - 1; i >= 0; --i)
        {
            const auto& e = entries.getReference (i);

            if (! e.isObject() || (bool) e.getProperty ("inset", false))
                continue;

            if (const auto col = parseCssColor (e.getProperty ("color", "#000000").toString()))
            {
                drawOuterShadow (*col,
                                 (float) (double) e.getProperty ("radius", 4.0),
                                 juce::roundToInt ((float) (double) e.getProperty ("offsetX", 0.0)),
                                 juce::roundToInt ((float) (double) e.getProperty ("offsetY", 0.0)));
            }
        }
    }

    // CSS backdrop-filter: blur() — sample what's already painted beneath
    // this node from the frame buffer, blur it, and lay it down clipped to
    // the node's shape; the (usually translucent) background then tints it.
    if (const auto backdropRadius = juce::roundToInt (style.getFloat ("backdropBlurRadius", 0.0f));
        backdropRadius > 0 && activeCanvas != nullptr)
    {
        // The canvas holds screen-space pixels: the frame minus any
        // ancestor scroll (transforms are not compensated — documented).
        const auto scroll = node.accumulatedAncestorScroll();
        const auto screenRect = node.frame.translated (-scroll.x, -scroll.y)
                                    .getSmallestIntegerContainer();
        const auto region = screenRect.getIntersection (activeCanvas->getBounds());

        if (! region.isEmpty())
        {
            // The canvas must be a SoftwareImageType image — native images
            // don't reliably expose in-flight writes while a Graphics is
            // attached (RootView::paint creates the right kind).
            auto sample = activeCanvas->getClippedImage (region).createCopy();
            stackBlur (sample, backdropRadius);

            juce::Graphics::ScopedSaveState backdropState (g);
            g.reduceClipRegion (path);
            g.drawImageAt (sample,
                           node.frame.getSmallestIntegerContainer().getX()
                               + (region.getX() - screenRect.getX()),
                           node.frame.getSmallestIntegerContainer().getY()
                               + (region.getY() - screenRect.getY()));
        }
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

    // backgroundLayers: [{ …gradient spec | backgroundColor }, …] — stacked
    // fills painted in array order (last entry on top), each reusing the same
    // gradient/colour parsing as the primary background. Lets one node carry
    // the multi-layer metallic caps the reference art uses.
    if (const auto* layers = style.values.getVarPointer ("backgroundLayers");
        layers != nullptr && layers->isArray())
    {
        for (const auto& layer : *layers->getArray())
        {
            const auto ls = Style::fromVar (layer);

            if (const auto lg = ls.gradient())
                fillGradient (g, path, node.frame, *lg);
            else if (const auto lc = ls.getColour ("backgroundColor"))
            {
                g.setColour (*lc);
                g.fillPath (path);
            }
        }
    }

    if (const auto insetColor = style.getColour ("insetShadowColor"))
    {
        drawInsetShadow (*insetColor,
                         style.getFloat ("insetShadowRadius", 4.0f),
                         juce::roundToInt (style.getFloat ("insetShadowOffsetX", 0.0f)),
                         juce::roundToInt (style.getFloat ("insetShadowOffsetY", 0.0f)));
    }

    // Inset entries of the boxShadow array (over the background, clipped in).
    if (const auto* box = style.values.getVarPointer ("boxShadow");
        box != nullptr && box->isArray())
    {
        const auto& entries = *box->getArray();

        for (int i = entries.size() - 1; i >= 0; --i)
        {
            const auto& e = entries.getReference (i);

            if (! e.isObject() || ! (bool) e.getProperty ("inset", false))
                continue;

            if (const auto col = parseCssColor (e.getProperty ("color", "#000000").toString()))
            {
                drawInsetShadow (*col,
                                 (float) (double) e.getProperty ("radius", 4.0),
                                 juce::roundToInt ((float) (double) e.getProperty ("offsetX", 0.0)),
                                 juce::roundToInt ((float) (double) e.getProperty ("offsetY", 0.0)));
            }
        }
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
            auto borderPath = roundedRectPath (node.frame.reduced (inset),
                                               style.cornerRadius (0) - inset,
                                               style.cornerRadius (1) - inset,
                                               style.cornerRadius (2) - inset,
                                               style.cornerRadius (3) - inset);

            // CSS border-style dashed / dotted (solid is the default).
            const auto borderStyle = style.getString ("borderStyle");

            if (borderStyle == "dashed" || borderStyle == "dotted")
            {
                const float dash = borderStyle == "dotted" ? borderWidth
                                                           : borderWidth * 2.5f;
                const float lengths[] = { dash, juce::jmax (1.0f, borderWidth * 1.5f) };

                juce::Path dashed;
                juce::PathStrokeType (borderWidth).createDashedStroke (dashed, borderPath,
                                                                       lengths, 2);
                g.setColour (*borderColor);
                g.fillPath (dashed);
            }
            else
            {
                g.setColour (*borderColor);
                g.strokePath (borderPath, juce::PathStrokeType (borderWidth));
            }
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
    else if (node.type == "svg")
        paintSvg (g, node);
    else if (node.type == "canvas")
        paintCanvas (g, node);

    const bool scrollable = node.isScrollable();

    if (style.overflowHidden() || scrollable)
        g.reduceClipRegion (path);

    const auto ordered = paintOrdered (node.children);

    if (scrollable && (node.scrollY != 0.0f || node.scrollX != 0.0f))
    {
        juce::Graphics::ScopedSaveState scrollState (g);
        g.addTransform (juce::AffineTransform::translation (-node.scrollX, -node.scrollY));

        for (const auto* child : ordered)
            paintNode (g, *child);
    }
    else
    {
        for (const auto* child : ordered)
            paintNode (g, *child);
    }

    // Scrollbar thumbs.
    if (scrollable)
    {
        if (const auto extent = node.maxScroll(); extent > 0.0f)
        {
            const auto frameH = node.frame.getHeight();
            const auto thumbH = juce::jmax (24.0f, frameH * frameH / node.contentHeight());
            const auto thumbY = node.frame.getY()
                              + (node.scrollY / extent) * (frameH - thumbH);

            g.setColour (juce::Colour (0x30ffffff));
            g.fillRoundedRectangle (node.frame.getRight() - 5.0f, thumbY, 3.0f, thumbH, 1.5f);
        }

        if (const auto extent = node.maxScrollX(); extent > 0.0f)
        {
            const auto frameW = node.frame.getWidth();
            const auto thumbW = juce::jmax (24.0f, frameW * frameW / node.contentWidth());
            const auto thumbX = node.frame.getX()
                              + (node.scrollX / extent) * (frameW - thumbW);

            g.setColour (juce::Colour (0x30ffffff));
            g.fillRoundedRectangle (thumbX, node.frame.getBottom() - 5.0f, thumbW, 3.0f, 1.5f);
        }
    }

    if (needsLayer)
        g.endTransparencyLayer();
}

void Painter::paintText (juce::Graphics& g, const Node& node, const Style& style)
{
    // CSS text-transform lives in TextSelection::visibleText so selection
    // geometry and painted glyphs always agree.
    const auto text = TextSelection::visibleText (node, style);

    if (text.isEmpty())
        return;

    const auto font = style.font();
    const auto colour = style.getColour ("color").value_or (juce::Colours::white);
    const bool strike = style.getString ("textDecoration") == "line-through";
    const auto maxLines = (int) style.getFloat ("numberOfLines", 0.0f);

    // textStroke (CSS paint-order: stroke — a dark outline under the fill) and
    // textLength (scale a single line horizontally to a fixed width, like SVG
    // textLength/lengthAdjust) both need a glyph path, so they share one
    // single-line branch. Readouts painted over reference art use these.
    const auto strokeColour = style.getColour ("textStrokeColor");
    const auto strokeWidth = style.getFloat ("textStrokeWidth", 0.0f);
    const auto textLength = style.getFloat ("textLength", 0.0f);
    const bool glyphBranch = maxLines <= 0
                          && (textLength > 0.0f || (strokeColour && strokeWidth > 0.0f));

    if (glyphBranch)
    {
        // Extracting glyph outlines is expensive — especially from a registered
        // OTF — and a readout-heavy panel does it for every Text node on every
        // repaint. Cache the untransformed path (baseline at y=0) per
        // typeface/text/size; only the cheap per-frame transform varies.
        struct Outline { juce::Path path; juce::Rectangle<float> box; };
        static std::map<juce::String, Outline> outlineCache;

        const auto key = juce::String ((juce::int64) (juce::pointer_sized_int) font.getTypefacePtr().get())
                       + "|" + juce::String (font.getHeight(), 2) + "|" + text;

        auto cached = outlineCache.find (key);

        if (cached == outlineCache.end())
        {
            juce::GlyphArrangement glyphs;
            glyphs.addLineOfText (font, text, 0.0f, 0.0f); // baseline at y=0

            Outline built;
            built.box = glyphs.getBoundingBox (0, -1, true);
            glyphs.createPath (built.path);

            // At capacity, evict one entry rather than the whole map: clearing
            // would re-extract every hot outline on the next frame.
            if (outlineCache.size() > 512)
                outlineCache.erase (outlineCache.begin());

            cached = outlineCache.emplace (key, std::move (built)).first;
        }

        const auto box = cached->second.box;
        const auto naturalW = box.getWidth();
        const auto scaleX = (textLength > 0.0f && naturalW > 0.0f) ? textLength / naturalW : 1.0f;
        const auto drawnW = naturalW * scaleX;

        // Horizontal anchor within the frame from textAlign; readouts centre.
        const auto flags = style.textAlign().getFlags();
        float leftX = node.frame.getX();
        if (flags & juce::Justification::horizontallyCentred)
            leftX = node.frame.getCentreX() - drawnW * 0.5f;
        else if (flags & juce::Justification::right)
            leftX = node.frame.getRight() - drawnW;

        // Scale about the glyph box's left edge, then place it: box left → leftX,
        // box vertical centre → frame centre.
        const auto transform =
            juce::AffineTransform::translation (-box.getX(), -box.getCentreY())
                .scaled (scaleX, 1.0f)
                .translated (leftX, node.frame.getCentreY());

        auto glyphPath = cached->second.path;   // copy the cached outline
        glyphPath.applyTransform (transform);

        if (const auto glowColor = style.getColour ("textShadowColor"))
        {
            const juce::DropShadow shadow (*glowColor,
                juce::roundToInt (style.getFloat ("textShadowRadius", 3.0f)),
                { juce::roundToInt (style.getFloat ("textShadowOffsetX", 0.0f)),
                  juce::roundToInt (style.getFloat ("textShadowOffsetY", 0.0f)) });
            shadow.drawForPath (g, glyphPath);
        }

        if (strokeColour && strokeWidth > 0.0f)
        {
            g.setColour (*strokeColour);
            g.strokePath (glyphPath, juce::PathStrokeType (strokeWidth));
        }

        g.setColour (colour);
        g.fillPath (glyphPath);
        return;
    }

    // numberOfLines clamps and truncates with an ellipsis (CSS truncate /
    // line-clamp) via fitted glyphs; the default path wraps freely.
    if (maxLines > 0)
    {
        const juce::Justification just (style.textAlign().getFlags()
                                        | juce::Justification::verticallyCentred);

        juce::GlyphArrangement glyphs;
        glyphs.addFittedText (font, text,
                              node.frame.getX(), node.frame.getY(),
                              node.frame.getWidth(), node.frame.getHeight(),
                              just, maxLines, 1.0f);

        if (const auto glowColor = style.getColour ("textShadowColor"))
        {
            juce::Path glyphPath;
            glyphs.createPath (glyphPath);

            const juce::DropShadow shadow (*glowColor,
                                           juce::roundToInt (style.getFloat ("textShadowRadius", 3.0f)),
                                           { juce::roundToInt (style.getFloat ("textShadowOffsetX", 0.0f)),
                                             juce::roundToInt (style.getFloat ("textShadowOffsetY", 0.0f)) });
            shadow.drawForPath (g, glyphPath);
        }

        g.setColour (colour);
        glyphs.draw (g);

        if (strike)
        {
            const auto box = glyphs.getBoundingBox (0, -1, true);
            g.fillRect (box.getX(), box.getCentreY() - font.getHeight() * 0.03f,
                        box.getWidth(), juce::jmax (1.0f, font.getHeight() * 0.06f));
        }

        return;
    }

    juce::AttributedString attributed;
    attributed.setText (text);
    attributed.setFont (font);
    attributed.setColour (colour);
    attributed.setJustification (style.textAlign());

    // CSS line-height (px): extra spacing beyond the font's natural height.
    const auto lineHeight = style.getFloat ("lineHeight", 0.0f);

    if (lineHeight > 0.0f)
        attributed.setLineSpacing (juce::jmax (0.0f, lineHeight - font.getHeight()));

    juce::TextLayout layout;
    layout.createLayout (attributed, node.frame.getWidth());

    const auto y = node.frame.getY()
                 + juce::jmax (0.0f, (node.frame.getHeight() - layout.getHeight()) * 0.5f);

    // Selection highlight under everything (userSelect:"text" nodes).
    if (node.selEnd > node.selStart)
    {
        g.setColour (style.getColour ("selectionColor").value_or (juce::Colour (0x593390ff)));

        for (const auto& rect : TextSelection::selectionRects (node, node.selStart, node.selEnd))
            g.fillRect (rect);
    }

    // Glyph-shaped glow (CSS text-shadow), drawn under the fill.
    if (const auto glowColor = style.getColour ("textShadowColor"))
    {
        juce::GlyphArrangement glyphs;
        glyphs.addFittedText (font, text,
                              node.frame.getX(), y, node.frame.getWidth(), layout.getHeight(),
                              style.textAlign(), juce::jmax (2, layout.getNumLines()));

        juce::Path glyphPath;
        glyphs.createPath (glyphPath);

        const juce::DropShadow shadow (*glowColor,
                                       juce::roundToInt (style.getFloat ("textShadowRadius", 3.0f)),
                                       { juce::roundToInt (style.getFloat ("textShadowOffsetX", 0.0f)),
                                         juce::roundToInt (style.getFloat ("textShadowOffsetY", 0.0f)) });
        shadow.drawForPath (g, glyphPath);
    }

    layout.draw (g, { node.frame.getX(), y, node.frame.getWidth(), layout.getHeight() });

    if (strike)
    {
        g.setColour (colour);

        for (int i = 0; i < layout.getNumLines(); ++i)
        {
            const auto& line = layout.getLine (i);
            float lineWidth = 0.0f;

            for (const auto* run : line.runs)
                for (const auto& glyph : run->glyphs)
                    lineWidth = juce::jmax (lineWidth, glyph.anchor.x + glyph.width);

            if (lineWidth <= 0.0f)
                continue;

            g.fillRect (node.frame.getX() + line.lineOrigin.x,
                        y + line.lineOrigin.y - line.ascent * 0.3f,
                        lineWidth, juce::jmax (1.0f, font.getHeight() * 0.06f));
        }
    }
}

void Painter::paintSvg (juce::Graphics& g, const Node& node)
{
    const auto tokens = juce::StringArray::fromTokens (node.props["viewBox"].toString(), " ,", {});

    if (tokens.size() != 4 || node.frame.isEmpty())
        return;

    const auto viewWidth = tokens[2].getFloatValue();
    const auto viewHeight = tokens[3].getFloatValue();

    if (viewWidth <= 0.0f || viewHeight <= 0.0f)
        return;

    const auto scaleX = node.frame.getWidth() / viewWidth;
    const auto scaleY = node.frame.getHeight() / viewHeight;
    const auto strokeScale = (scaleX + scaleY) * 0.5f;
    const auto transform = juce::AffineTransform::translation (-tokens[0].getFloatValue(),
                                                               -tokens[1].getFloatValue())
                               .scaled (scaleX, scaleY)
                               .translated (node.frame.getX(), node.frame.getY());

    // Path data parses once per unique `d`, like the conic raster cache.
    static std::map<juce::String, juce::Path> parsed;

    for (const auto* child : node.children)
    {
        if (child->type != "svgpath")
            continue;

        const auto d = child->props["d"].toString();

        if (d.isEmpty())
            continue;

        auto found = parsed.find (d);

        if (found == parsed.end())
        {
            if (parsed.size() > 256)
                parsed.clear();

            found = parsed.emplace (d, juce::Drawable::parseSVGPath (d)).first;
        }

        auto path = found->second;

        if (child->props["fillRule"].toString() == "evenodd")
            path.setUsingNonZeroWinding (false);

        path.applyTransform (transform);

        // SVG defaults: fill black unless told otherwise; "none" skips.
        const auto fillName = child->props["fill"].toString();

        if (fillName != "none")
        {
            g.setColour (parseCssColor (fillName).value_or (juce::Colours::black));
            g.fillPath (path);
        }

        if (const auto stroke = parseCssColor (child->props["stroke"].toString()))
        {
            const auto strokeWidth = child->props.hasProperty ("strokeWidth")
                                   ? (float) (double) child->props["strokeWidth"]
                                   : 1.0f;

            const auto capName = child->props["strokeCap"].toString();
            const auto joinName = child->props["strokeJoin"].toString();

            const juce::PathStrokeType strokeType (
                strokeWidth * strokeScale,
                joinName == "round" ? juce::PathStrokeType::curved
                : joinName == "bevel" ? juce::PathStrokeType::beveled
                                      : juce::PathStrokeType::mitered,
                capName == "round" ? juce::PathStrokeType::rounded
                : capName == "square" ? juce::PathStrokeType::square
                                      : juce::PathStrokeType::butt);

            g.setColour (*stroke);

            const auto dashTokens = juce::StringArray::fromTokens (
                child->props["strokeDash"].toString(), " ,", {});

            if (dashTokens.size() >= 2)
            {
                juce::Array<float> lengths;

                for (const auto& token : dashTokens)
                    lengths.add (juce::jmax (0.1f, token.getFloatValue() * strokeScale));

                juce::Path dashed;
                strokeType.createDashedStroke (dashed, path,
                                               lengths.getRawDataPointer(), lengths.size());
                g.fillPath (dashed);
            }
            else
            {
                g.strokePath (path, strokeType);
            }
        }
    }
}

juce::Image Painter::decodeDataUriImage (const juce::String& source)
{
    // data:image/png;base64,<payload> — PNG/JPEG/GIF via juce::ImageFileFormat,
    // WebP via the vendored decoder. Non-base64 payloads are not images.
    const auto comma = source.indexOfChar (',');

    if (comma <= 0 || ! source.substring (0, comma).endsWith (";base64"))
        return {};

    juce::MemoryOutputStream decoded;

    if (! juce::Base64::convertFromBase64 (decoded, source.substring (comma + 1)))
        return {};

    auto image = juce::ImageFileFormat::loadFrom (decoded.getData(), decoded.getDataSize());

    if (! image.isValid())
        image = decodeWebPImage (decoded.getData(), decoded.getDataSize());

    return image;
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
        // WebP files aren't in juce::ImageFileFormat's registry — decode
        // manually, cached under the path's hash so it happens once.
        const juce::File file (source);
        const auto webpHash = ("webp:" + file.getFullPathName()).hashCode64();
        image = juce::ImageCache::getFromHashCode (webpHash);

        if (! image.isValid())
            image = juce::ImageCache::getFromFile (file);

        if (! image.isValid())
        {
            juce::MemoryBlock bytes;

            if (file.loadFileAsData (bytes) && looksLikeWebP (bytes.getData(), bytes.getSize()))
            {
                image = decodeWebPImage (bytes.getData(), bytes.getSize());

                if (image.isValid())
                    juce::ImageCache::addImageToCache (image, webpHash);
            }
        }
    }

    if (! image.isValid())
        return;

    // objectFit: "contain" (legacy default), "cover", "fill".
    const auto style = node.effectiveStyle();
    const auto fit = style.getString ("objectFit");

    auto placement = juce::RectanglePlacement (juce::RectanglePlacement::centred);

    if (fit == "fill")
        placement = juce::RectanglePlacement (juce::RectanglePlacement::stretchToFit);
    else if (fit == "cover")
        placement = juce::RectanglePlacement (juce::RectanglePlacement::centred
                                              | juce::RectanglePlacement::fillDestination);

    juce::Graphics::ScopedSaveState save (g);

    if (fit == "cover")
        g.reduceClipRegion (node.frame.toNearestInt()); // cover overflows

    // tintColor: fill the image's alpha with a solid colour (icon tinting).
    if (const auto tint = style.getColour ("tintColor"))
    {
        const auto transform = placement.getTransformToFit (image.getBounds().toFloat(),
                                                            node.frame);
        g.reduceClipRegion (image, transform);
        g.setColour (*tint);
        g.fillRect (node.frame);
        return;
    }

    // Low-quality resampling turns bright single pixels into sparkle
    // when an asset is drawn below its native size.
    g.setImageResamplingQuality (juce::Graphics::highResamplingQuality);

    // A high-quality rescale is expensive, and reference-art UIs draw a
    // full-panel bitmap every frame — a ~1.6 Mpx plate downscaled per repaint
    // costs most of a core once anything animates. Cache the resampled bitmap
    // under (source, target size) and blit it 1:1 afterwards.
    //
    // Only for "fill": stretchToFit maps the whole image onto the whole frame,
    // so a frame-sized copy is an exact substitute. contain/cover letterbox or
    // crop, where a pre-scaled copy would change the geometry.
    if (fit == "fill")
    {
        const auto target = node.frame.getSmallestIntegerContainer();

        if (target.getWidth() > 0 && target.getHeight() > 0
            && (target.getWidth() != image.getWidth() || target.getHeight() != image.getHeight()))
        {
            // A private cache, not juce::ImageCache: that one evicts on a timer
            // and by total size, so a full-panel plate alongside dozens of other
            // image nodes gets dropped and re-rescaled every frame — measurably
            // worse than no cache at all.
            static std::map<juce::int64, juce::Image> scaledCache;

            // Key on the decoded image's pixel-data identity, not the src
            // string: `source` may be a multi-megabyte base64 data URI, and
            // hashing it per image node per frame costs far more than the
            // rescale this is meant to avoid. The decoded image is itself
            // cached, so the pointer is stable across frames.
            // Bound to a raw pointer rather than calling .get(): getPixelData()
            // returns ImagePixelData* on JUCE 8.0.4 and a ReferenceCountedObjectPtr
            // on 8.0.14, and this conversion compiles against both.
            const juce::ImagePixelData* pixels = image.getPixelData();
            const auto srcId = (juce::int64) (juce::pointer_sized_int) pixels;
            const auto scaledHash = (srcId * 31 + target.getWidth()) * 8191 + target.getHeight();

            auto found = scaledCache.find (scaledHash);

            if (found == scaledCache.end())
            {
                // At capacity, evict one entry rather than the whole map:
                // clearing would re-rescale every hot plate on the next frame.
                if (scaledCache.size() > 64)
                    scaledCache.erase (scaledCache.begin());

                found = scaledCache.emplace (scaledHash,
                                             image.rescaled (target.getWidth(), target.getHeight(),
                                                             juce::Graphics::highResamplingQuality))
                            .first;
            }

            const auto& scaled = found->second;

            g.drawImageAt (scaled, target.getX(), target.getY());
            return;
        }
    }

    g.drawImage (image, node.frame, placement);
}

//==============================================================================
void Painter::paintCanvas (juce::Graphics& g, const Node& node)
{
    // The surface exists only once JS has asked for a buffer and committed it;
    // an un-drawn canvas paints nothing rather than a black rect.
    if (node.canvas == nullptr || ! node.canvas->image.isValid())
        return;

    g.setImageResamplingQuality (juce::Graphics::highResamplingQuality);
    g.drawImage (node.canvas->image, node.frame, juce::RectanglePlacement::stretchToFit);
}

} // namespace vsreact
