#include <vsreact/vsreact.h>

#include "TestHelpers.h"

// Coverage for the 0.0.27 painter keys added for the improved-UI port:
// boxShadow arrays, backgroundLayers, textStroke, textLength.

class PainterKeysTests final : public juce::UnitTest
{
public:
    PainterKeysTests() : juce::UnitTest ("vsreact::PainterKeys") {}

    void runTest() override
    {
        beginTest ("backgroundLayers paints a stacked gradient over the base");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%",
                    "backgroundColor": "#101010",
                    "backgroundLayers": [
                        {"gradientType": "linear", "gradientAngle": 90,
                         "gradientStops": [{"offset":0,"color":"#ff0000"},{"offset":1,"color":"#ff0000"}]}
                    ]}}],
                ["appendChild", 0, 1]
            ])");

            const auto image = renderTree (tree, 40, 40);
            // The red layer must win over the #101010 base.
            const auto c = image.getPixelAt (20, 20);
            expect (c.getRed() > 200 && c.getGreen() < 40, "red layer should cover the base");
        }

        beginTest ("boxShadow array casts an outer shadow beyond the node");
        {
            vsreact::ShadowTree withShadow;
            withShadow.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": 20, "height": 20, "top": 20, "left": 20,
                    "position": "absolute", "backgroundColor": "#ffffff",
                    "boxShadow": [{"color":"#ffffffff","radius":10,"offsetX":0,"offsetY":0}]}}],
                ["appendChild", 0, 1]
            ])");

            vsreact::ShadowTree noShadow;
            noShadow.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": 20, "height": 20, "top": 20, "left": 20,
                    "position": "absolute", "backgroundColor": "#ffffff"}}],
                ["appendChild", 0, 1]
            ])");

            expect (inkCount (renderTree (withShadow, 60, 60)) > inkCount (renderTree (noShadow, 60, 60)),
                    "a glowing box shadow should light more pixels than none");
        }

        beginTest ("an outer shadow does not bleed inside the node (CSS clips it)");
        {
            // A border-only node with a glow must stay see-through in the middle:
            // CSS paints an outer box-shadow only outside the border box. Before
            // this was clipped, juce::DropShadow filled the whole silhouette and
            // a hollow highlight box read as a solid block of colour.
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%", "backgroundColor": "#000000"}}],
                ["create", 2, "view"],
                ["setProps", 2, {"style": {"position": "absolute", "left": 20, "top": 20,
                    "width": 60, "height": 60, "borderWidth": 2, "borderColor": "#55eaf1",
                    "shadowColor": "#55eaf1", "shadowRadius": 8}}],
                ["appendChild", 1, 2],
                ["appendChild", 0, 1]
            ])");

            const auto image = renderTree (tree, 100, 100);

            // Centre of the hollow box must stay black; the border itself lit.
            const auto centre = image.getPixelAt (50, 50);
            expect (centre.getBrightness() < 0.05f,
                    "the inside of a border-only node must not be filled by its own shadow");
            expect (image.getPixelAt (50, 21).getBrightness() > 0.2f, "the border should paint");
        }

        beginTest ("textStroke adds ink around the glyphs");
        {
            const auto ink = [this] (const juce::String& extra)
            {
                vsreact::ShadowTree tree;
                tree.applyOpsJson (juce::String (R"([
                    ["create", 1, "text"],
                    ["setProps", 1, {"style": {"width": "100%", "height": "100%",
                        "fontSize": 40, "color": "#ffffff")") + extra + R"(}}],
                    ["create", 2, "rawtext"],
                    ["setText", 2, "8"],
                    ["appendChild", 1, 2],
                    ["appendChild", 0, 1]
                ])");
                return inkCount (renderTree (tree, 60, 60));
            };

            expect (ink (R"(, "textStrokeColor": "#ff0000", "textStrokeWidth": 3)") > ink (""),
                    "stroked text should have more ink than plain");
        }

        beginTest ("textLength stretches a single line wider");
        {
            const auto width = [this] (const juce::String& extra)
            {
                vsreact::ShadowTree tree;
                tree.applyOpsJson (juce::String (R"([
                    ["create", 1, "text"],
                    ["setProps", 1, {"style": {"width": "100%", "height": "100%",
                        "fontSize": 20, "color": "#ffffff", "textAlign": "center")") + extra + R"(}}],
                    ["create", 2, "rawtext"],
                    ["setText", 2, "12"],
                    ["appendChild", 1, 2],
                    ["appendChild", 0, 1]
                ])");
                const auto image = renderTree (tree, 200, 40);
                int minX = image.getWidth(), maxX = -1;
                for (int y = 0; y < image.getHeight(); ++y)
                    for (int x = 0; x < image.getWidth(); ++x)
                        if (image.getPixelAt (x, y).getBrightness() > 0.2f)
                        {
                            minX = juce::jmin (minX, x);
                            maxX = juce::jmax (maxX, x);
                        }
                return maxX - minX;
            };

            const auto plain = width ("");
            const auto stretched = width (R"(, "textLength": 160)");
            expect (stretched > plain + 20, "textLength=160 should be visibly wider than natural");
        }
    }
};

static PainterKeysTests painterKeysTests;
