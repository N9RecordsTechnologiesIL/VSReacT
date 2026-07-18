#include <vsreact/vsreact.h>

namespace
{
    juce::Image renderTree (vsreact::ShadowTree& tree, int width, int height)
    {
        tree.computeLayout (static_cast<float> (width), static_cast<float> (height));

        juce::Image image (juce::Image::ARGB, width, height, true);
        juce::Graphics g (image);
        g.fillAll (juce::Colours::black);
        vsreact::Painter::paint (g, *tree.root());
        return image;
    }

    bool approx (juce::Colour a, juce::Colour b, int tolerance = 8)
    {
        return std::abs (a.getRed() - b.getRed()) <= tolerance
            && std::abs (a.getGreen() - b.getGreen()) <= tolerance
            && std::abs (a.getBlue() - b.getBlue()) <= tolerance;
    }
}

class PainterTests final : public juce::UnitTest
{
public:
    PainterTests() : juce::UnitTest ("vsreact::Painter") {}

    void runTest() override
    {
        beginTest ("fills background color");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%", "backgroundColor": "#ff0000"}}],
                ["appendChild", 0, 1]
            ])");

            const auto image = renderTree (tree, 100, 100);
            expect (approx (image.getPixelAt (50, 50), juce::Colour (0xffff0000)));
        }

        beginTest ("rounded corners leave the corner unpainted");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%", "backgroundColor": "#0000ff", "borderRadius": 40}}],
                ["appendChild", 0, 1]
            ])");

            const auto image = renderTree (tree, 100, 100);
            expect (approx (image.getPixelAt (2, 2), juce::Colours::black));
            expect (approx (image.getPixelAt (50, 50), juce::Colour (0xff0000ff)));
        }

        beginTest ("overflow hidden clips children to the rounded parent");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%", "backgroundColor": "#0000ff", "borderRadius": 40, "overflow": "hidden"}}],
                ["appendChild", 0, 1],
                ["create", 2, "view"],
                ["setProps", 2, {"style": {"position": "absolute", "left": 0, "top": 0, "right": 0, "bottom": 0, "backgroundColor": "#00ff00"}}],
                ["appendChild", 1, 2]
            ])");

            const auto image = renderTree (tree, 100, 100);
            expect (approx (image.getPixelAt (2, 2), juce::Colours::black));
            expect (approx (image.getPixelAt (50, 50), juce::Colour (0xff00ff00)));
        }

        beginTest ("border strokes the edge");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%", "borderWidth": 4, "borderColor": "#00ff00"}}],
                ["appendChild", 0, 1]
            ])");

            const auto image = renderTree (tree, 100, 100);
            expect (approx (image.getPixelAt (50, 2), juce::Colour (0xff00ff00)));
            expect (approx (image.getPixelAt (50, 50), juce::Colours::black));
        }

        beginTest ("hovered nodes paint hoverStyle");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%", "backgroundColor": "#ff0000"},
                                  "hoverStyle": {"backgroundColor": "#0000ff"}}],
                ["appendChild", 0, 1]
            ])");

            tree.find (1)->hovered = true;
            const auto image = renderTree (tree, 60, 60);
            expect (approx (image.getPixelAt (30, 30), juce::Colour (0xff0000ff)));
        }

        beginTest ("opacity blends with the backdrop");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%", "backgroundColor": "#ffffff", "opacity": 0.5}}],
                ["appendChild", 0, 1]
            ])");

            const auto image = renderTree (tree, 60, 60);
            expect (approx (image.getPixelAt (30, 30), juce::Colour (0xff7f7f7f), 16));
        }

        beginTest ("data: URI images decode and paint");
        {
            // Build the URI with JUCE's own encoder — no magic base64.
            juce::Image source (juce::Image::ARGB, 2, 2, true);
            source.clear (source.getBounds(), juce::Colour (0xffff0000));

            juce::MemoryOutputStream png;
            juce::PNGImageFormat().writeImageToStream (source, png);
            const auto uri = "data:image/png;base64,"
                           + juce::Base64::toBase64 (png.getData(), png.getDataSize());

            const auto decoded = vsreact::Painter::decodeDataUriImage (uri);
            expect (decoded.isValid());
            expectEquals (decoded.getWidth(), 2);
            expect (approx (decoded.getPixelAt (0, 0), juce::Colour (0xffff0000)));

            expect (! vsreact::Painter::decodeDataUriImage ("data:image/png;base64,????").isValid());
            expect (! vsreact::Painter::decodeDataUriImage ("data:image/png,notbase64").isValid());

            vsreact::ShadowTree tree;
            tree.applyOpsJson (juce::String (R"([
                ["create", 1, "image"],
                ["setProps", 1, {"src": ")") + uri + R"(", "style": {"width": "100%", "height": "100%"}}],
                ["appendChild", 0, 1]
            ])");

            const auto image = renderTree (tree, 40, 40);
            expect (approx (image.getPixelAt (20, 20), juce::Colour (0xffff0000)));
        }

        beginTest ("arcCap butt drops the rounded overhang");
        {
            const auto arcPixel = [this] (const juce::String& capStyle)
            {
                vsreact::ShadowTree tree;
                tree.applyOpsJson (juce::String (R"([
                    ["create", 1, "view"],
                    ["setProps", 1, {"style": {"width": "100%", "height": "100%",
                        "arcColor": "#ff0000", "arcValueStart": 0, "arcValueEnd": 30,
                        "arcStart": 0, "arcThickness": 10)") + capStyle + R"(}}],
                    ["appendChild", 0, 1]
                ])");

                // Just before the arc start along the circle: a rounded cap
                // paints here, a butt cap leaves the backdrop.
                return renderTree (tree, 100, 100).getPixelAt (46, 6);
            };

            expect (! approx (arcPixel (""), juce::Colours::black, 40));
            expect (approx (arcPixel (R"(, "arcCap": "butt")"), juce::Colours::black, 40));
        }

        beginTest ("linear gradient runs top to bottom");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%",
                    "gradientType": "linear", "gradientAngle": 180,
                    "gradientFrom": "#ff0000", "gradientTo": "#0000ff"}}],
                ["appendChild", 0, 1]
            ])");

            const auto image = renderTree (tree, 100, 100);
            expect (approx (image.getPixelAt (50, 3), juce::Colour (0xffff0000), 24));
            expect (approx (image.getPixelAt (50, 96), juce::Colour (0xff0000ff), 24));
        }

        beginTest ("radial gradient is centre-out");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%",
                    "gradientType": "radial",
                    "gradientFrom": "#ff0000", "gradientTo": "#0000ff"}}],
                ["appendChild", 0, 1]
            ])");

            const auto image = renderTree (tree, 100, 100);
            expect (approx (image.getPixelAt (50, 50), juce::Colour (0xffff0000), 24));
            expect (image.getPixelAt (2, 2).getBlue() > image.getPixelAt (2, 2).getRed());
        }

        beginTest ("conic gradient sweeps clockwise from up");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%",
                    "gradientType": "conic",
                    "gradientFrom": "#ff0000", "gradientTo": "#0000ff"}}],
                ["appendChild", 0, 1]
            ])");

            const auto image = renderTree (tree, 100, 100);
            // Just clockwise of 12 o'clock ≈ the first stop; just counter-
            // clockwise ≈ the last.
            expect (image.getPixelAt (55, 6).getRed() > 200);
            expect (image.getPixelAt (45, 6).getBlue() > 200);
        }

        beginTest ("per-side border paints only its edge");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%",
                    "borderTopWidth": 6, "borderColor": "#00ff00"}}],
                ["appendChild", 0, 1]
            ])");

            const auto image = renderTree (tree, 100, 100);
            expect (approx (image.getPixelAt (50, 2), juce::Colour (0xff00ff00)));
            expect (approx (image.getPixelAt (2, 50), juce::Colours::black));
            expect (approx (image.getPixelAt (50, 97), juce::Colours::black));
        }

        beginTest ("rotate transforms the node and its children");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%", "rotate": 90}}],
                ["appendChild", 0, 1],
                ["create", 2, "view"],
                ["setProps", 2, {"style": {"position": "absolute", "left": 0, "top": 40,
                                            "width": 20, "height": 20, "backgroundColor": "#ff0000"}}],
                ["appendChild", 1, 2]
            ])");

            const auto image = renderTree (tree, 100, 100);
            expect (approx (image.getPixelAt (50, 10), juce::Colour (0xffff0000), 24));
            expect (approx (image.getPixelAt (10, 50), juce::Colours::black, 24));
        }

        beginTest ("inset shadow darkens the rim, not the middle");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%",
                    "backgroundColor": "#ffffff",
                    "insetShadowColor": "#000000ff", "insetShadowRadius": 10}}],
                ["appendChild", 0, 1]
            ])");

            const auto image = renderTree (tree, 100, 100);
            expect (image.getPixelAt (50, 1).getBrightness() + 0.15f
                    < image.getPixelAt (50, 50).getBrightness());
        }

        beginTest ("textShadow glows around the glyphs");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%"}}],
                ["appendChild", 0, 1],
                ["create", 2, "text"],
                ["setProps", 2, {"style": {"fontSize": 40, "color": "#ffffff",
                                            "textShadowColor": "#ff0000", "textShadowRadius": 7}}],
                ["create", 3, "rawtext"],
                ["setText", 3, "XXXX"],
                ["appendChild", 2, 3],
                ["appendChild", 1, 2]
            ])");

            const auto image = renderTree (tree, 200, 100);

            int reddish = 0;

            for (int y = 0; y < 100; ++y)
                for (int x = 0; x < 200; ++x)
                {
                    const auto pixel = image.getPixelAt (x, y);
                    if (pixel.getRed() > 90 && pixel.getGreen() < 60 && pixel.getBlue() < 60)
                        ++reddish;
                }

            expect (reddish > 40);
        }

        beginTest ("zIndex reorders painting");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%"}}],
                ["appendChild", 0, 1],
                ["create", 2, "view"],
                ["setProps", 2, {"style": {"position": "absolute", "left": 0, "top": 0, "width": "100%", "height": "100%", "backgroundColor": "#ff0000", "zIndex": 5}}],
                ["appendChild", 1, 2],
                ["create", 3, "view"],
                ["setProps", 3, {"style": {"position": "absolute", "left": 0, "top": 0, "width": "100%", "height": "100%", "backgroundColor": "#0000ff"}}],
                ["appendChild", 1, 3]
            ])");

            // Later sibling would normally cover; zIndex 5 keeps red on top.
            const auto image = renderTree (tree, 60, 60);
            expect (approx (image.getPixelAt (30, 30), juce::Colour (0xffff0000)));
        }

        beginTest ("clipPolygon shapes the background");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%", "backgroundColor": "#00ff00",
                                            "clipPolygon": [50, 0, 100, 100, 0, 100]}}],
                ["appendChild", 0, 1]
            ])");

            // Triangle: apex top-centre — corners stay unpainted, centre fills.
            const auto image = renderTree (tree, 100, 100);
            expect (approx (image.getPixelAt (50, 60), juce::Colour (0xff00ff00)));
            expect (approx (image.getPixelAt (3, 3), juce::Colours::black));
            expect (approx (image.getPixelAt (97, 3), juce::Colours::black));
        }

        beginTest ("gradientRepeat tiles the stops");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%",
                    "gradientType": "linear", "gradientAngle": 180,
                    "gradientFrom": "#ff0000", "gradientTo": "#0000ff",
                    "gradientRepeat": 2}}],
                ["appendChild", 0, 1]
            ])");

            // Two tiles: red at the very top AND again just past halfway.
            const auto image = renderTree (tree, 100, 100);
            expect (approx (image.getPixelAt (50, 2), juce::Colour (0xffff0000), 30));
            expect (approx (image.getPixelAt (50, 52), juce::Colour (0xffff0000), 40));
            expect (approx (image.getPixelAt (50, 48), juce::Colour (0xff0000ff), 40));
        }

        beginTest ("textTransform uppercase paints identically to uppercase text");
        {
            const auto renderText = [] (const juce::String& value, const juce::String& extraStyle)
            {
                vsreact::ShadowTree tree;
                tree.applyOpsJson (juce::String (R"([
                    ["create", 1, "view"],
                    ["setProps", 1, {"style": {"width": "100%", "height": "100%"}}],
                    ["appendChild", 0, 1],
                    ["create", 2, "text"],
                    ["setProps", 2, {"style": {"fontSize": 30, "color": "#ffffff")") + extraStyle + R"(}}],
                    ["create", 3, "rawtext"],
                    ["setText", 3, ")" + value + R"("],
                    ["appendChild", 2, 3],
                    ["appendChild", 1, 2]
                ])");
                return renderTree (tree, 200, 60);
            };

            const auto transformed = renderText ("abc", R"(, "textTransform": "uppercase")");
            const auto plain = renderText ("ABC", "");

            bool identical = true;

            for (int py = 0; py < 60 && identical; ++py)
                for (int px = 0; px < 200 && identical; ++px)
                    identical = transformed.getPixelAt (px, py) == plain.getPixelAt (px, py);

            expect (identical);
        }

        const auto renderStyled = [] (const juce::String& extraStyle)
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (juce::String (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%"}}],
                ["appendChild", 0, 1],
                ["create", 2, "text"],
                ["setProps", 2, {"style": {"fontSize": 20, "color": "#ffffff")") + extraStyle + R"(}}],
                ["create", 3, "rawtext"],
                ["setText", 3, "AAAA AAAA AAAA AAAA AAAA AAAA"],
                ["appendChild", 2, 3],
                ["appendChild", 1, 2]
            ])");
            return renderTree (tree, 120, 200);
        };

        const auto rowsWithInk = [] (const juce::Image& image)
        {
            int rows = 0;

            for (int py = 0; py < image.getHeight(); ++py)
                for (int px = 0; px < image.getWidth(); ++px)
                    if (image.getPixelAt (px, py).getBrightness() > 0.4f)
                    {
                        ++rows;
                        break;
                    }

            return rows;
        };

        const auto inkSpan = [] (const juce::Image& image)
        {
            int first = -1, last = -1;

            for (int py = 0; py < image.getHeight(); ++py)
                for (int px = 0; px < image.getWidth(); ++px)
                    if (image.getPixelAt (px, py).getBrightness() > 0.4f)
                    {
                        if (first < 0) first = py;
                        last = py;
                        break;
                    }

            return last - first;
        };

        beginTest ("underline adds pixels");
        {
            const auto inkCount = [] (const juce::Image& image)
            {
                int count = 0;

                for (int py = 0; py < image.getHeight(); ++py)
                    for (int px = 0; px < image.getWidth(); ++px)
                        if (image.getPixelAt (px, py).getBrightness() > 0.4f)
                            ++count;

                return count;
            };

            expect (inkCount (renderStyled (R"(, "textDecoration": "underline")"))
                    > inkCount (renderStyled ("")));
        }

        beginTest ("numberOfLines clamps wrapping");
        {
            expect (rowsWithInk (renderStyled (R"(, "numberOfLines": 1)"))
                    < rowsWithInk (renderStyled ("")) / 2);
        }

        beginTest ("lineHeight spreads the block vertically");
        {
            // Spacing adds empty rows BETWEEN lines — the ink-row count stays
            // the same, so measure first-to-last span instead.
            expect (inkSpan (renderStyled (R"(, "lineHeight": 44)"))
                    > inkSpan (renderStyled ("")) + 20);
        }

        beginTest ("dashed borders leave gaps");
        {
            const auto edgeInk = [this] (const juce::String& extraStyle)
            {
                vsreact::ShadowTree tree;
                tree.applyOpsJson (juce::String (R"([
                    ["create", 1, "view"],
                    ["setProps", 1, {"style": {"width": "100%", "height": "100%",
                        "borderWidth": 4, "borderColor": "#00ff00")") + extraStyle + R"(}}],
                    ["appendChild", 0, 1]
                ])");

                const auto image = renderTree (tree, 120, 60);
                int ink = 0;

                for (int px = 0; px < 120; ++px)
                    if (approx (image.getPixelAt (px, 2), juce::Colour (0xff00ff00)))
                        ++ink;

                return ink;
            };

            const auto solid = edgeInk ("");
            const auto dashed = edgeInk (R"(, "borderStyle": "dashed")");
            expect (solid > 110);
            expect (dashed > 10 && dashed < solid - 20);
        }

        beginTest ("objectFit fill stretches, contain letterboxes, tint recolors");
        {
            // A 2x1 all-red PNG drawn into a 40x40 image node.
            juce::Image source (juce::Image::ARGB, 2, 1, true);
            source.clear (source.getBounds(), juce::Colour (0xffff0000));

            juce::MemoryOutputStream png;
            juce::PNGImageFormat().writeImageToStream (source, png);
            const auto uri = "data:image/png;base64,"
                           + juce::Base64::toBase64 (png.getData(), png.getDataSize());

            const auto renderFit = [&] (const juce::String& extraStyle)
            {
                vsreact::ShadowTree tree;
                tree.applyOpsJson (juce::String (R"([
                    ["create", 1, "image"],
                    ["setProps", 1, {"src": ")") + uri + R"(",
                        "style": {"width": "100%", "height": "100%")" + extraStyle + R"(}}],
                    ["appendChild", 0, 1]
                ])");
                return renderTree (tree, 40, 40);
            };

            // contain (default): 2:1 image letterboxes — top rows stay black.
            expect (approx (renderFit ("").getPixelAt (20, 3), juce::Colours::black));
            // fill: stretches to the full frame.
            expect (approx (renderFit (R"(, "objectFit": "fill")").getPixelAt (20, 3),
                            juce::Colour (0xffff0000)));
            // tint: the red source paints in the tint colour.
            expect (approx (renderFit (R"(, "objectFit": "fill", "tintColor": "#00ff00")")
                                .getPixelAt (20, 20),
                            juce::Colour (0xff00ff00)));
        }

        beginTest ("svg paths fill and stroke in viewBox space");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "svg"],
                ["setProps", 1, {"viewBox": "0 0 10 10", "style": {"width": "100%", "height": "100%"}}],
                ["appendChild", 0, 1],
                ["create", 2, "svgpath"],
                ["setProps", 2, {"d": "M5 0 L10 10 L0 10 Z", "fill": "#ff0000"}],
                ["appendChild", 1, 2],
                ["create", 3, "svgpath"],
                ["setProps", 3, {"d": "M1 1 L9 1", "fill": "none", "stroke": "#00ff00", "strokeWidth": 1}],
                ["appendChild", 1, 3]
            ])");

            const auto image = renderTree (tree, 100, 100);

            // Triangle apex at top-centre: centre-bottom red, top corners not.
            expect (approx (image.getPixelAt (50, 70), juce::Colour (0xffff0000)));
            expect (! approx (image.getPixelAt (3, 3), juce::Colour (0xffff0000)));

            // The stroked line: 1 viewBox unit ≈ 10px thick at y≈10.
            expect (approx (image.getPixelAt (50, 10), juce::Colour (0xff00ff00)));
            expect (approx (image.getPixelAt (50, 30), juce::Colour (0xffff0000), 40)
                    || approx (image.getPixelAt (50, 30), juce::Colours::black, 40));
        }

        beginTest ("svg stroke dashes leave gaps");
        {
            const auto lineInk = [this] (const juce::String& extraProps)
            {
                vsreact::ShadowTree tree;
                tree.applyOpsJson (juce::String (R"([
                    ["create", 1, "svg"],
                    ["setProps", 1, {"viewBox": "0 0 100 10", "style": {"width": "100%", "height": "100%"}}],
                    ["appendChild", 0, 1],
                    ["create", 2, "svgpath"],
                    ["setProps", 2, {"d": "M0 5 L100 5", "fill": "none", "stroke": "#00ff00", "strokeWidth": 4)") + extraProps + R"(}],
                    ["appendChild", 1, 2]
                ])");

                const auto image = renderTree (tree, 100, 10);
                int ink = 0;

                for (int px = 0; px < 100; ++px)
                    if (approx (image.getPixelAt (px, 5), juce::Colour (0xff00ff00)))
                        ++ink;

                return ink;
            };

            const auto solid = lineInk ("");
            const auto dashed = lineInk (R"(, "strokeDash": "6 4")");
            expect (solid > 95);
            expect (dashed > 20 && dashed < solid - 15);
        }

        beginTest ("display none removes from layout; visibility hidden keeps it");
        {
            const auto renderStack = [] (const juce::String& firstExtra)
            {
                vsreact::ShadowTree tree;
                tree.applyOpsJson (juce::String (R"([
                    ["create", 1, "view"],
                    ["setProps", 1, {"style": {"width": "100%", "height": "100%"}}],
                    ["appendChild", 0, 1],
                    ["create", 2, "view"],
                    ["setProps", 2, {"style": {"height": 50, "backgroundColor": "#ff0000")") + firstExtra + R"(}}],
                    ["appendChild", 1, 2],
                    ["create", 3, "view"],
                    ["setProps", 3, {"style": {"height": 50, "backgroundColor": "#0000ff"}}],
                    ["appendChild", 1, 3]
                ])");
                return renderTree (tree, 100, 100);
            };

            // display none: the blue sibling reflows to the top.
            const auto gone = renderStack (R"(, "display": "none")");
            expect (approx (gone.getPixelAt (50, 25), juce::Colour (0xff0000ff)));

            // visibility hidden: the red slot stays reserved but unpainted.
            const auto ghost = renderStack (R"(, "visibility": "hidden")");
            expect (approx (ghost.getPixelAt (50, 25), juce::Colours::black));
            expect (approx (ghost.getPixelAt (50, 75), juce::Colour (0xff0000ff)));
        }

        beginTest ("percent translate is relative to the node's own size");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%"}}],
                ["appendChild", 0, 1],
                ["create", 2, "view"],
                ["setProps", 2, {"style": {"position": "absolute", "left": 0, "top": 0,
                    "width": 50, "height": 50, "backgroundColor": "#ff0000", "translateX": "50%"}}],
                ["appendChild", 1, 2]
            ])");

            // 50% of its own 50px width = shifted 25px right.
            const auto image = renderTree (tree, 100, 100);
            expect (approx (image.getPixelAt (10, 25), juce::Colours::black));
            expect (approx (image.getPixelAt (60, 25), juce::Colour (0xffff0000)));
        }

        beginTest ("transformOrigin moves the scaling centre");
        {
            const auto renderScaled = [] (const juce::String& extra)
            {
                vsreact::ShadowTree tree;
                tree.applyOpsJson (juce::String (R"([
                    ["create", 1, "view"],
                    ["setProps", 1, {"style": {"width": "100%", "height": "100%"}}],
                    ["appendChild", 0, 1],
                    ["create", 2, "view"],
                    ["setProps", 2, {"style": {"position": "absolute", "left": 0, "top": 0,
                        "width": 40, "height": 40, "backgroundColor": "#ff0000", "scale": 2)") + extra + R"(}}],
                    ["appendChild", 1, 2]
                ])");
                return renderTree (tree, 100, 100);
            };

            // Top-left origin doubles to 0..80; centre origin covers -20..60.
            expect (approx (renderScaled (R"(, "transformOriginX": 0, "transformOriginY": 0)")
                                .getPixelAt (70, 10),
                            juce::Colour (0xffff0000)));
            expect (approx (renderScaled ("").getPixelAt (70, 10), juce::Colours::black));
        }

        beginTest ("text renders in its color");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%"}}],
                ["appendChild", 0, 1],
                ["create", 2, "text"],
                ["setProps", 2, {"style": {"fontSize": 40, "color": "#ff00ff"}}],
                ["create", 3, "rawtext"],
                ["setText", 3, "XXXX"],
                ["appendChild", 2, 3],
                ["appendChild", 1, 2]
            ])");

            const auto image = renderTree (tree, 200, 100);

            int magentaHits = 0;

            for (int y = 0; y < 100; ++y)
                for (int x = 0; x < 200; ++x)
                    if (approx (image.getPixelAt (x, y), juce::Colour (0xffff00ff), 60))
                        ++magentaHits;

            expect (magentaHits > 20);
        }
    }
};

static PainterTests painterTests;
