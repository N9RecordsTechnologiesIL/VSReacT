#include <vsreact/vsreact.h>

namespace
{
    juce::String opsFor (std::initializer_list<const char*> ops)
    {
        juce::StringArray lines;

        for (auto* op : ops)
            lines.add (op);

        return "[" + lines.joinIntoString (",") + "]";
    }
}

class StyleTests final : public juce::UnitTest
{
public:
    StyleTests() : juce::UnitTest ("vsreact::Style") {}

    void runTest() override
    {
        beginTest ("parseCssColor handles #rrggbb and #rrggbbaa");
        {
            const auto opaque = vsreact::parseCssColor ("#c6f135");
            expect (opaque.has_value());
            expectEquals (static_cast<int> (opaque->getRed()), 0xc6);
            expectEquals (static_cast<int> (opaque->getGreen()), 0xf1);
            expectEquals (static_cast<int> (opaque->getBlue()), 0x35);
            expectEquals (static_cast<int> (opaque->getAlpha()), 0xff);

            const auto translucent = vsreact::parseCssColor ("#a3e63533");
            expect (translucent.has_value());
            expectEquals (static_cast<int> (translucent->getAlpha()), 0x33);

            expect (! vsreact::parseCssColor ("red").has_value());
        }

        beginTest ("mergedWith overlays keys");
        {
            const auto base = vsreact::Style::fromVar (
                juce::JSON::parse (R"({"backgroundColor": "#111111", "opacity": 0.5})"));
            const auto overlay = vsreact::Style::fromVar (
                juce::JSON::parse (R"({"backgroundColor": "#222222"})"));

            const auto merged = base.mergedWith (overlay);
            expectEquals (merged.getString ("backgroundColor"), juce::String ("#222222"));
            expectEquals (merged.getFloat ("opacity", 1.0f), 0.5f);
        }

        beginTest ("font weight and size");
        {
            const auto style = vsreact::Style::fromVar (
                juce::JSON::parse (R"({"fontSize": 24, "fontWeight": 700})"));
            const auto font = style.font();
            expectEquals (font.getHeight(), 24.0f);
            expect (font.isBold());

            const auto plain = vsreact::Style::fromVar (juce::JSON::parse ("{}"));
            expect (! plain.font().isBold());
            expectEquals (plain.font().getHeight(), 14.0f);
        }
    }
};

static StyleTests styleTests;

//==============================================================================
class ShadowTreeTests final : public juce::UnitTest
{
public:
    ShadowTreeTests() : juce::UnitTest ("vsreact::ShadowTree") {}

    void runTest() override
    {
        beginTest ("row layout with padding, gap, flex and fixed widths");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (opsFor ({
                R"(["create", 1, "view"])",
                R"(["setProps", 1, {"style": {"flexDirection": "row", "padding": 14, "gap": 12, "width": "100%", "height": "100%"}}])",
                R"(["appendChild", 0, 1])",
                R"(["create", 2, "view"])",
                R"(["setProps", 2, {"style": {"flex": 1}}])",
                R"(["create", 3, "view"])",
                R"(["setProps", 3, {"style": {"width": 124}}])",
                R"(["appendChild", 1, 2])",
                R"(["appendChild", 1, 3])",
            }));

            tree.computeLayout (720.0f, 430.0f);

            expect (tree.find (1)->frame == juce::Rectangle<float> (0, 0, 720, 430));
            expect (tree.find (2)->frame == juce::Rectangle<float> (14, 14, 556, 402));
            expect (tree.find (3)->frame == juce::Rectangle<float> (582, 14, 124, 402));
        }

        beginTest ("percent width");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (opsFor ({
                R"(["create", 1, "view"])",
                R"(["setProps", 1, {"style": {"width": "100%", "height": "100%", "flexDirection": "row"}}])",
                R"(["appendChild", 0, 1])",
                R"(["create", 2, "view"])",
                R"(["setProps", 2, {"style": {"width": "50%"}}])",
                R"(["appendChild", 1, 2])",
            }));

            tree.computeLayout (400.0f, 100.0f);
            expectEquals (tree.find (2)->frame.getWidth(), 200.0f);
        }

        beginTest ("absolute positioning");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (opsFor ({
                R"(["create", 1, "view"])",
                R"(["setProps", 1, {"style": {"width": "100%", "height": "100%"}}])",
                R"(["appendChild", 0, 1])",
                R"(["create", 2, "view"])",
                R"(["setProps", 2, {"style": {"position": "absolute", "left": 10, "top": 20, "width": 30, "height": 40}}])",
                R"(["appendChild", 1, 2])",
            }));

            tree.computeLayout (300.0f, 300.0f);
            expect (tree.find (2)->frame == juce::Rectangle<float> (10, 20, 30, 40));
        }

        beginTest ("text measurement drives layout");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (opsFor ({
                R"(["create", 1, "view"])",
                R"(["setProps", 1, {"style": {"flexDirection": "row", "width": "100%", "height": "100%"}}])",
                R"(["appendChild", 0, 1])",
                R"(["create", 2, "text"])",
                R"(["setProps", 2, {"style": {"fontSize": 14}}])",
                R"(["create", 3, "rawtext"])",
                R"(["setText", 3, "Hello measurement"])",
                R"(["appendChild", 2, 3])",
                R"(["appendChild", 1, 2])",
                R"(["create", 4, "view"])",
                R"(["setProps", 4, {"style": {"width": 10, "height": 10}}])",
                R"(["appendChild", 1, 4])",
            }));

            tree.computeLayout (500.0f, 100.0f);

            const auto textFrame = tree.find (2)->frame;
            expect (textFrame.getWidth() > 40.0f);
            expect (textFrame.getHeight() >= 14.0f);
            expectEquals (tree.find (4)->frame.getX(), textFrame.getRight());

            // Longer text must measure wider.
            const auto firstWidth = textFrame.getWidth();
            tree.applyOpsJson (opsFor ({ R"(["setText", 3, "Hello measurement grows much longer"])" }));
            tree.computeLayout (500.0f, 100.0f);
            expect (tree.find (2)->frame.getWidth() > firstWidth);
        }

        beginTest ("removeChild frees the subtree");
        {
            vsreact::ShadowTree tree;
            juce::Array<int> removed;
            tree.onNodeRemoved = [&] (vsreact::Node& node) { removed.add (node.id); };

            tree.applyOpsJson (opsFor ({
                R"(["create", 1, "view"])",
                R"(["appendChild", 0, 1])",
                R"(["create", 2, "view"])",
                R"(["appendChild", 1, 2])",
                R"(["create", 3, "view"])",
                R"(["appendChild", 2, 3])",
            }));
            expectEquals (tree.nodeCount(), 3);

            tree.applyOpsJson (opsFor ({ R"(["removeChild", 1, 2])" }));
            expectEquals (tree.nodeCount(), 1);
            expect (removed.contains (2) && removed.contains (3));
            expect (tree.find (2) == nullptr && tree.find (3) == nullptr);
            expect (tree.find (1) != nullptr);
        }

        beginTest ("insertBefore orders children");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (opsFor ({
                R"(["create", 1, "view"])",
                R"(["setProps", 1, {"style": {"flexDirection": "row", "width": "100%", "height": "100%"}}])",
                R"(["appendChild", 0, 1])",
                R"(["create", 2, "view"])",
                R"(["setProps", 2, {"style": {"width": 50, "height": 10}}])",
                R"(["appendChild", 1, 2])",
                R"(["create", 3, "view"])",
                R"(["setProps", 3, {"style": {"width": 70, "height": 10}}])",
                R"(["insertBefore", 1, 3, 2])",
            }));

            tree.computeLayout (300.0f, 100.0f);
            expectEquals (tree.find (3)->frame.getX(), 0.0f);
            expectEquals (tree.find (2)->frame.getX(), 70.0f);
        }

        beginTest ("listeners and props are captured");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (opsFor ({
                R"(["create", 1, "view"])",
                R"(["setProps", 1, {"style": {}, "listeners": ["click", "mouseenter"], "cursor": "pointer"}])",
                R"(["appendChild", 0, 1])",
            }));

            auto* node = tree.find (1);
            expect (node->listeners.contains ("click"));
            expect (node->listeners.contains ("mouseenter"));
            expectEquals (node->props["cursor"].toString(), juce::String ("pointer"));
        }
    }
};

static ShadowTreeTests shadowTreeTests;
