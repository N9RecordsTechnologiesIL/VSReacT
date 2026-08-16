#include <vsreact/vsreact.h>

#include "TestHelpers.h"

#include <iostream>
#include <cstdlib>

// Paint-time benchmark for the two costs a glowing, gradient-heavy panel pays
// per frame: DropShadow blurs (one per lit meter segment) and gradient
// parsing (per layer per node). Modelled on the channel example's meter wall
// and knob caps. The assertion is a deliberately generous ceiling so CI gates
// regressions, not noise; the printed ms/paint is the number that matters.
//
// Local bisection knobs (env vars): BENCH_NO_SEGMENTS, BENCH_NO_CAPS,
// BENCH_NO_GLOW — these isolated the shadow hit-path cost that motivated the
// cheap shape key.

namespace
{
    juce::var parse (const juce::String& json)
    {
        return juce::JSON::parse (json);
    }
}

class PaintBench final : public juce::UnitTest
{
public:
    PaintBench() : juce::UnitTest ("vsreact::PaintBench") {}

    void runTest() override
    {
        beginTest ("meter wall + gradient caps paint budget");

        vsreact::ShadowTree tree;
        juce::Array<juce::var> ops;

        const auto op = [&ops] (std::initializer_list<juce::var> parts)
        {
            juce::Array<juce::var> one;
            for (const auto& part : parts)
                one.add (part);
            ops.add (juce::var (one));
        };

        int id = 1;

        // 96 lit meter segments with a glow — the channel example's wall.
        for (int i = 0; i < (std::getenv ("BENCH_NO_SEGMENTS") ? 0 : 96); ++i)
        {
            const int nodeId = id++;
            const int x = 8 + (i / 32) * 40;
            const int y = 8 + (i % 32) * 14;

            op ({ "create", nodeId, "view" });
            op ({ "setProps", nodeId, parse (juce::String (
                R"({"style": {"position": "absolute", "left": LEFT, "top": TOP,
                    "width": 18, "height": 9, "borderRadius": 1,
                    "backgroundColor": "#45eaa8",
                    "shadowColor": "SHADOWCOLOR", "shadowRadius": 3}})")
                .replace ("SHADOWCOLOR", std::getenv ("BENCH_NO_GLOW") ? "" : "#40eeb480")
                .replace ("LEFT", juce::String (x))
                .replace ("TOP", juce::String (y))) });
            op ({ "appendChild", 0, nodeId });
        }

        // 8 metallic knob caps: three stacked background layers each
        // (conic sweep, radial texture, radial specular), as in CleanStrip.
        for (int i = 0; i < (std::getenv ("BENCH_NO_CAPS") ? 0 : 8); ++i)
        {
            const int nodeId = id++;

            op ({ "create", nodeId, "view" });
            op ({ "setProps", nodeId, parse (juce::String (
                R"({"style": {"position": "absolute", "left": LEFT, "top": 460,
                    "width": 56, "height": 56, "borderRadius": 28,
                    "backgroundLayers": [
                      {"gradientType": "conic", "gradientAngle": 205, "gradientStops": [
                        {"offset": 0, "color": "#817869"}, {"offset": 0.31, "color": "#b7ac9b"},
                        {"offset": 0.67, "color": "#918777"}, {"offset": 1, "color": "#71695d"}]},
                      {"gradientType": "radial", "gradientStops": [
                        {"offset": 0, "color": "#2e2822"}, {"offset": 0.7, "color": "#00000000"}]},
                      {"gradientType": "radial", "gradientStops": [
                        {"offset": 0, "color": "#ffffffa1"}, {"offset": 0.5, "color": "#ffffff00"}]}
                    ]}})")
                .replace ("LEFT", juce::String (8 + i * 64))) });
            op ({ "appendChild", 0, nodeId });
        }

        tree.applyOps (juce::var (ops));
        tree.computeLayout (600.0f, 540.0f);

        juce::Image target (juce::Image::ARGB, 600, 540, true, juce::SoftwareImageType());

        // Warm-up paint (fills caches, faults pages) — not measured.
        {
            juce::Graphics g (target);
            vsreact::Painter::paint (g, *tree.root());
        }

        constexpr int frames = 40;
        const auto start = juce::Time::getMillisecondCounterHiRes();

        for (int frame = 0; frame < frames; ++frame)
        {
            juce::Graphics g (target);
            vsreact::Painter::paint (g, *tree.root());
        }

        const auto perFrameMs = (juce::Time::getMillisecondCounterHiRes() - start) / frames;
        std::cout << "PAINT_BENCH: " << juce::String (perFrameMs, 3)
                  << " ms/frame (96 glowing segments + 8 triple-layer gradient caps)\n";

        expect (inkCount (target) > 0, "the bench scene actually painted");

        // Post shadow/gradient caching this measures ~8ms Release on a dev
        // machine (from 153ms before). The ceiling leaves CI headroom while
        // still catching a regression back to per-frame blurs. Debug runs the
        // same scene about ten times slower — unoptimised JUCE graphics, no
        // inlining — so it gets its own ceiling rather than failing the suite
        // for everyone who builds the tests without -DCMAKE_BUILD_TYPE=Release.
       #if JUCE_DEBUG
        const auto ceilingMs = 400.0;
       #else
        const auto ceilingMs = 60.0;
       #endif

        expect (perFrameMs < ceilingMs, "paint regressed toward per-frame blur costs");
    }
};

static PaintBench paintBench;
