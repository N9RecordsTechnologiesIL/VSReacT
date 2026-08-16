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

        beginTest ("clearContainer removes all root children");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (opsFor ({
                R"(["create", 1, "view"])",
                R"(["appendChild", 0, 1])",
                R"(["create", 2, "view"])",
                R"(["appendChild", 0, 2])",
                R"(["clearContainer"])",
            }));

            expectEquals (tree.nodeCount(), 0);
            expect (tree.root()->children.empty());
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

//==============================================================================
// patchProps: the key-granular update the reconciler sends for re-renders —
// only changed top-level keys cross the bridge, `null` removes a key, and
// everything untouched (a multi-megabyte image src, native scroll state)
// stays exactly as it was.
class PatchPropsTests final : public juce::UnitTest
{
public:
    PatchPropsTests() : juce::UnitTest ("vsreact::ShadowTree patchProps") {}

    void runTest() override
    {
        beginTest ("a patch merges into existing props and leaves the rest alone");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "image"],
                ["setProps", 1, {"src": "keep-me.webp", "cursor": "pointer",
                                 "style": {"width": 10, "opacity": 0.5}}],
                ["appendChild", 0, 1]
            ])");

            tree.applyOpsJson (R"([["patchProps", 1, {"style": {"width": 20, "opacity": 1}}]])");

            auto* node = tree.find (1);
            expect (node != nullptr);
            expectEquals (node->props["src"].toString(), juce::String ("keep-me.webp"),
                          "an untouched key survives the patch");
            expectEquals (node->props["cursor"].toString(), juce::String ("pointer"));
            expectWithinAbsoluteError (node->style.getFloat ("width"), 20.0f, 1.0e-6f,
                                       "the patched style re-derives");
            expectWithinAbsoluteError (node->style.opacity(), 1.0f, 1.0e-6f);
        }

        beginTest ("null removes a key; listeners re-derive from the merged props");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"cursor": "pointer", "listeners": ["click", "wheel"],
                                 "style": {}}],
                ["appendChild", 0, 1]
            ])");

            tree.applyOpsJson (R"([["patchProps", 1, {"cursor": null, "listeners": ["click"]}]])");

            auto* node = tree.find (1);
            expect (! node->props.hasProperty ("cursor"), "null deletes the key");
            expectEquals (node->listeners.size(), 1);
            expect (node->listeners.contains ("click"));
            expect (! node->listeners.contains ("wheel"));
        }

        beginTest ("a patch that doesn't carry scroll keys never stomps native scrolling");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"scrollTop": 5, "style": {"overflow": "scroll"}}],
                ["appendChild", 0, 1]
            ])");

            auto* node = tree.find (1);
            expectWithinAbsoluteError (node->scrollY, 5.0f, 1.0e-6f);

            // The user wheels natively...
            node->scrollY = 42.0f;

            // ...and an unrelated patch (style only) must not reset it, even
            // though scrollTop is still 5 in the merged props.
            tree.applyOpsJson (R"([["patchProps", 1, {"style": {"overflow": "scroll", "opacity": 0.9}}]])");
            expectWithinAbsoluteError (node->scrollY, 42.0f, 1.0e-6f,
                                       "merged-but-not-sent scrollTop stays inert");

            // Sending it explicitly still works.
            tree.applyOpsJson (R"([["patchProps", 1, {"scrollTop": 7}]])");
            expectWithinAbsoluteError (node->scrollY, 7.0f, 1.0e-6f);
        }

        beginTest ("a patch before any setProps degenerates to a plain set");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["patchProps", 1, {"style": {"width": 12}}],
                ["appendChild", 0, 1]
            ])");

            expectWithinAbsoluteError (tree.find (1)->style.getFloat ("width"), 12.0f, 1.0e-6f);
        }

        beginTest ("patching marks layout dirty");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": 10, "height": 10}}],
                ["appendChild", 0, 1]
            ])");
            tree.computeLayout (100.0f, 100.0f);
            expect (! tree.layoutDirty);

            tree.applyOpsJson (R"([["patchProps", 1, {"style": {"width": 30, "height": 10}}]])");
            expect (tree.layoutDirty);

            tree.computeLayout (100.0f, 100.0f);
            expectWithinAbsoluteError (tree.find (1)->frame.getWidth(), 30.0f, 1.0e-3f);
        }
    }
};

static PatchPropsTests patchPropsTests;
