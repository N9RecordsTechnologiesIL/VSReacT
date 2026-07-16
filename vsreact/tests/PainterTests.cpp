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
