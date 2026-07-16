#include <vsreact/vsreact.h>

class HitTestTests final : public juce::UnitTest
{
public:
    HitTestTests() : juce::UnitTest ("vsreact::hitTest") {}

    void runTest() override
    {
        beginTest ("topmost interactive node wins; plain views are transparent");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%"}}],
                ["appendChild", 0, 1],
                ["create", 2, "view"],
                ["setProps", 2, {"style": {"width": 100, "height": 100}, "listeners": ["click"]}],
                ["appendChild", 1, 2],
                ["create", 3, "view"],
                ["setProps", 3, {"style": {"position": "absolute", "left": 40, "top": 40, "width": 100, "height": 100}, "listeners": ["click"]}],
                ["appendChild", 1, 3]
            ])");
            tree.computeLayout (300.0f, 300.0f);

            // Overlap region: later sibling (3) paints on top and wins.
            auto* hit = vsreact::hitTest (*tree.root(), { 60.0f, 60.0f });
            expect (hit != nullptr && hit->id == 3);

            // Only node 2's area.
            hit = vsreact::hitTest (*tree.root(), { 10.0f, 10.0f });
            expect (hit != nullptr && hit->id == 2);

            // Node 1 has no listeners — background misses entirely.
            hit = vsreact::hitTest (*tree.root(), { 250.0f, 250.0f });
            expect (hit == nullptr);
        }

        beginTest ("children of interactive parents bubble to the parent");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": 100, "height": 40}, "listeners": ["click"]}],
                ["appendChild", 0, 1],
                ["create", 2, "text"],
                ["setProps", 2, {"style": {"fontSize": 12}}],
                ["appendChild", 1, 2]
            ])");
            tree.computeLayout (300.0f, 300.0f);

            // Hitting the (non-interactive) label inside a button hits the button.
            auto* hit = vsreact::hitTest (*tree.root(), { 50.0f, 20.0f });
            expect (hit != nullptr && hit->id == 1);
        }

        beginTest ("overflow hidden clips child hit areas");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": 100, "height": 100, "overflow": "hidden"}}],
                ["appendChild", 0, 1],
                ["create", 2, "view"],
                ["setProps", 2, {"style": {"position": "absolute", "left": 50, "top": 50, "width": 200, "height": 200}, "listeners": ["click"]}],
                ["appendChild", 1, 2]
            ])");
            tree.computeLayout (400.0f, 400.0f);

            // Inside both parent and child: hit.
            auto* hit = vsreact::hitTest (*tree.root(), { 80.0f, 80.0f });
            expect (hit != nullptr && hit->id == 2);

            // Child extends past the clipping parent: miss.
            hit = vsreact::hitTest (*tree.root(), { 150.0f, 150.0f });
            expect (hit == nullptr);
        }

        beginTest ("hover-styled nodes are interactive");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": 50, "height": 50}, "hoverStyle": {"backgroundColor": "#ff0000"}}],
                ["appendChild", 0, 1]
            ])");
            tree.computeLayout (100.0f, 100.0f);

            auto* hit = vsreact::hitTest (*tree.root(), { 25.0f, 25.0f });
            expect (hit != nullptr && hit->id == 1);
        }
    }
};

static HitTestTests hitTestTests;
