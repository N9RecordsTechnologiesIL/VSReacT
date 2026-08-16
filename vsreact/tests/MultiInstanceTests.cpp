#include <vsreact/vsreact.h>

#include "TestHelpers.h"

// Two editors in one process — a DAW loading two instances of a plugin — is
// the normal case, not the edge case. Everything an instance registers from
// JS (fonts, images) and every paint cache must live in that instance's
// ShadowTree, never in a process global.

namespace
{
    juce::var makeOp (std::initializer_list<juce::var> parts)
    {
        juce::Array<juce::var> op;
        for (const auto& part : parts)
            op.add (part);
        return juce::var (op);
    }

    juce::var makeOps (std::initializer_list<juce::var> ops)
    {
        juce::Array<juce::var> array;
        for (const auto& op : ops)
            array.add (op);
        return juce::var (array);
    }

    juce::var propsFromJson (const juce::String& json)
    {
        return juce::JSON::parse (json);
    }

    /** A 2x2 solid-colour PNG as a data URI — built with JUCE's own encoder. */
    juce::String tinyPngUri (juce::Colour colour)
    {
        juce::Image source (juce::Image::ARGB, 2, 2, true);
        source.clear (source.getBounds(), colour);

        juce::MemoryOutputStream png;
        juce::PNGImageFormat().writeImageToStream (source, png);
        return "data:image/png;base64," + juce::Base64::toBase64 (png.getData(), png.getDataSize());
    }
}

class MultiInstanceTests final : public juce::UnitTest
{
public:
    MultiInstanceTests() : juce::UnitTest ("vsreact::MultiInstance") {}

    void runTest() override
    {
        beginTest ("ImageRegistry registers, resolves, and rejects");
        {
            vsreact::ImageRegistry registry;
            expect (registry.isEmpty());

            const auto handle = registry.registerImage (tinyPngUri (juce::Colours::red));
            expect (handle.startsWith ("img:"));
            expect (registry.find (handle).isValid());
            expectEquals (registry.find (handle).getWidth(), 2);

            expect (registry.registerImage ("data:image/png;base64,????").isEmpty());
            expect (registry.registerImage ("/no/such/file.webp").isEmpty());
            expect (! registry.find ("img:999").isValid());
        }

        beginTest ("registered images are per instance — no cross-tree bleed");
        {
            vsreact::ShadowTree treeA, treeB;

            const auto handle = treeA.resources().images.registerImage (tinyPngUri (juce::Colours::white));
            expect (handle.isNotEmpty());

            // The same node structure in both trees, both pointing at treeA's
            // handle. Only treeA may paint it.
            for (auto* tree : { &treeA, &treeB })
            {
                auto props = propsFromJson (R"({"style": {"width": 40, "height": 40}})");
                props.getDynamicObject()->setProperty ("src", handle);

                tree->applyOps (makeOps ({
                    makeOp ({ "create", 1, "image" }),
                    makeOp ({ "setProps", 1, props }),
                    makeOp ({ "appendChild", 0, 1 }),
                }));
            }

            expect (inkCount (renderTree (treeA, 40, 40)) > 0,
                    "the owning instance paints its registered image");
            expectEquals (inkCount (renderTree (treeB, 40, 40)), 0,
                          "a foreign handle paints nothing in another instance");
        }

        beginTest ("fonts are per instance — one registry never serves another editor");
        {
            const juce::File otf (juce::String (VSREACT_TEST_FONT_PATH));

            if (! otf.existsAsFile())
            {
                logMessage ("skipped: " + otf.getFullPathName() + " missing");
            }
            else
            {
                vsreact::ShadowTree treeA, treeB;

                expect (treeA.resources().fonts.registerFont ("Brand", otf.getFullPathName(), 400));
                expect (treeA.resources().fonts.find ("Brand", 400) != nullptr);
                expect (treeB.resources().fonts.find ("Brand", 400) == nullptr,
                        "instance B must not see instance A's typeface");

                // And resolution through Style follows the registry it's handed.
                const auto style = vsreact::Style::fromVar (
                    propsFromJson (R"({"fontFamily": "Brand", "fontSize": 24})"));

                const auto viaA = style.font (&treeA.resources().fonts);
                const auto viaB = style.font (&treeB.resources().fonts);
                expect (viaA.getTypefacePtr() != viaB.getTypefacePtr(),
                        "the same style resolves differently per instance registry");
            }
        }

        beginTest ("paint caches live per instance and fill independently");
        {
            vsreact::ShadowTree treeA, treeB;

            // A textLength readout forces the glyph-outline path (the cached
            // one); paint only treeA and its cache alone must fill.
            const auto ops = makeOps ({
                makeOp ({ "create", 1, "text" }),
                makeOp ({ "setProps", 1, propsFromJson (
                    R"({"style": {"fontSize": 24, "textLength": 60, "color": "#ffffff"}})") }),
                makeOp ({ "create", 2, "rawtext" }),
                makeOp ({ "setText", 2, "128" }),
                makeOp ({ "appendChild", 1, 2 }),
                makeOp ({ "appendChild", 0, 1 }),
            });

            treeA.applyOps (ops);
            treeB.applyOps (ops);

            expect (inkCount (renderTree (treeA, 120, 60)) > 0);
            expect (! treeA.resources().glyphOutlines.empty(),
                    "painting fills the instance's own outline cache");
            expect (treeB.resources().glyphOutlines.empty(),
                    "an unpainted instance's cache stays untouched");
        }
    }
};

static MultiInstanceTests multiInstanceTests;
