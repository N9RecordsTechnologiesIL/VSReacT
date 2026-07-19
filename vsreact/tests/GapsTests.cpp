// 0.0.26 "honest gaps" round: WebP decode, stack blur + backdrop, text
// selection, horizontal scroll.

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

    bool approx (juce::Colour a, juce::Colour b, int tolerance = 12)
    {
        return std::abs (a.getRed() - b.getRed()) <= tolerance
            && std::abs (a.getGreen() - b.getGreen()) <= tolerance
            && std::abs (a.getBlue() - b.getBlue()) <= tolerance;
    }
}

//==============================================================================
class WebpDecodeTests final : public juce::UnitTest
{
public:
    WebpDecodeTests() : juce::UnitTest ("vsreact WebP decoding") {}

    void runTest() override
    {
        beginTest ("lossy VP8 decodes with the right size and colour");
        {
            // 8x8 solid red, ffmpeg -c:v libwebp -lossless 0
            const auto image = vsreact::Painter::decodeDataUriImage (
                "data:image/webp;base64,UklGRjwAAABXRUJQVlA4IDAAAADQAQCdASoIAAgAAUAmJaACdLoB"
                "+AADsAD+82mX/mwK5rn3+//pcH6XB+lwf+lIAAA=");

            expect (image.isValid());
            expectEquals (image.getWidth(), 8);
            expectEquals (image.getHeight(), 8);
            expect (approx (image.getPixelAt (4, 4), juce::Colour (0xffff0000), 24)); // YUV roundtrip
        }

        beginTest ("lossless VP8L decodes exactly");
        {
            // 6x4 solid #00ff00, -lossless 1 -pix_fmt bgra (no YUV roundtrip)
            const auto image = vsreact::Painter::decodeDataUriImage (
                "data:image/webp;base64,UklGRhwAAABXRUJQVlA4TA8AAAAvBcAAAAfQ/4j+ByKi/wEA");

            expect (image.isValid());
            expectEquals (image.getWidth(), 6);
            expectEquals (image.getHeight(), 4);
            expect (image.getPixelAt (3, 2) == juce::Colour (0xff00ff00));
        }

        beginTest ("alpha survives (premultiplied ARGB)");
        {
            // 4x4 blue at 50% alpha, lossless
            const auto image = vsreact::Painter::decodeDataUriImage (
                "data:image/webp;base64,UklGRhwAAABXRUJQVlA4TA8AAAAvA8AAEAcQ0f/+BSKi/wEA");

            expect (image.isValid());
            const auto pixel = image.getPixelAt (2, 2);
            expect (pixel.getBlue() > 200);
            expect (pixel.getAlpha() > 110 && pixel.getAlpha() < 145);
        }

        beginTest ("sniffing rejects non-WebP bytes");
        {
            expect (! vsreact::looksLikeWebP ("PNG not riff", 12));
            expect (! vsreact::looksLikeWebP (nullptr, 100));
            expect (! vsreact::looksLikeWebP ("RIFF", 4));

            // A RIFF/WEBP header with garbage payload must fail cleanly.
            const char garbage[] = "RIFF\x20\x00\x00\x00WEBPnonsense-payload";
            expect (vsreact::looksLikeWebP (garbage, sizeof (garbage) - 1));
            expect (! vsreact::decodeWebPImage (garbage, sizeof (garbage) - 1).isValid());
        }
    }
};

static WebpDecodeTests webpDecodeTests;

//==============================================================================
class BlurTests final : public juce::UnitTest
{
public:
    BlurTests() : juce::UnitTest ("vsreact blur filters") {}

    void runTest() override
    {
        beginTest ("stackBlur spreads energy and keeps the peak central");
        {
            juce::Image image (juce::Image::ARGB, 21, 21, true);
            image.setPixelAt (10, 10, juce::Colours::white);

            vsreact::stackBlur (image, 3);

            const auto centre = image.getPixelAt (10, 10);
            const auto near = image.getPixelAt (12, 10);
            const auto far = image.getPixelAt (1, 1);

            expect (centre.getAlpha() > 0);
            expect (near.getAlpha() > 0);
            expect (centre.getAlpha() >= near.getAlpha());
            expectEquals ((int) far.getAlpha(), 0);
        }

        beginTest ("stackBlur mixes across an opaque hard edge");
        {
            juce::Image halves (juce::Image::ARGB, 40, 40, true);

            {
                juce::Graphics g (halves);
                g.setColour (juce::Colours::red);
                g.fillRect (0, 0, 20, 40);
                g.setColour (juce::Colours::blue);
                g.fillRect (20, 0, 20, 40);
            }

            vsreact::stackBlur (halves, 12);

            const auto centre = halves.getPixelAt (20, 20);
            expect (centre.getRed() > 40 && centre.getBlue() > 40,
                    "centre=" + centre.toDisplayString (true));
        }

        beginTest ("radius < 1 is a no-op");
        {
            juce::Image image (juce::Image::ARGB, 5, 5, true);
            image.setPixelAt (2, 2, juce::Colours::red);
            vsreact::stackBlur (image, 0);
            expect (image.getPixelAt (2, 2) == juce::Colours::red);
            expectEquals ((int) image.getPixelAt (1, 2).getAlpha(), 0);
        }

        beginTest ("blurRadius softens a node beyond its frame");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"position": "absolute", "left": 40, "top": 40,
                    "width": 20, "height": 20, "backgroundColor": "#ff0000", "blurRadius": 6}}],
                ["appendChild", 0, 1]
            ])");

            const auto image = renderTree (tree, 100, 100);

            // Centre still clearly red, edges bleed past the 40..60 frame.
            expect (image.getPixelAt (50, 50).getRed() > 180);
            expect (image.getPixelAt (37, 50).getRed() > 8);
            expect (approx (image.getPixelAt (90, 90), juce::Colours::black));
        }

        beginTest ("backdropBlurRadius mixes the pixels beneath the node");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"position": "absolute", "left": 0, "top": 0,
                    "width": 50, "height": 100, "backgroundColor": "#ff0000"}}],
                ["appendChild", 0, 1],
                ["create", 2, "view"],
                ["setProps", 2, {"style": {"position": "absolute", "left": 50, "top": 0,
                    "width": 50, "height": 100, "backgroundColor": "#0000ff"}}],
                ["appendChild", 0, 2],
                ["create", 3, "view"],
                ["setProps", 3, {"style": {"position": "absolute", "left": 30, "top": 30,
                    "width": 40, "height": 40, "backdropBlurRadius": 12}}],
                ["appendChild", 0, 3]
            ])");

            tree.computeLayout (100.0f, 100.0f);

            // Software type, like RootView's buffer — the sampler reads the
            // canvas while its Graphics is still alive.
            juce::Image canvas (juce::Image::ARGB, 100, 100, true, juce::SoftwareImageType());

            {
                juce::Graphics g (canvas);
                g.fillAll (juce::Colours::black);
                vsreact::Painter::paint (g, *tree.root(), canvas);
            }

            // Inside the glass, on the red/blue boundary: both channels mixed.
            const auto mixed = canvas.getPixelAt (50, 50);
            expect (mixed.getRed() > 40 && mixed.getBlue() > 40,
                    "mixed@50,50=" + mixed.toDisplayString (true)
                        + " @48,50=" + canvas.getPixelAt (48, 50).toDisplayString (true)
                        + " @52,50=" + canvas.getPixelAt (52, 50).toDisplayString (true)
                        + " @58,50=" + canvas.getPixelAt (58, 50).toDisplayString (true));

            // Outside the glass the boundary stays hard.
            expect (canvas.getPixelAt (10, 10).getRed() > 220);
            expectEquals ((int) canvas.getPixelAt (10, 10).getBlue(), 0);
            expect (canvas.getPixelAt (90, 10).getBlue() > 220);
            expectEquals ((int) canvas.getPixelAt (90, 10).getRed(), 0);
        }

        beginTest ("treeHasBackdrop detects backdrop nodes anywhere");
        {
            vsreact::ShadowTree plain;
            plain.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": 10, "height": 10, "blurRadius": 3}}],
                ["appendChild", 0, 1]
            ])");
            expect (! vsreact::Painter::treeHasBackdrop (*plain.root()));

            vsreact::ShadowTree glass;
            glass.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": 10, "height": 10}}],
                ["appendChild", 0, 1],
                ["create", 2, "view"],
                ["setProps", 2, {"style": {"backdropBlurRadius": 8}}],
                ["appendChild", 1, 2]
            ])");
            expect (vsreact::Painter::treeHasBackdrop (*glass.root()));
        }
    }
};

static BlurTests blurTests;

//==============================================================================
class TextSelectionTests final : public juce::UnitTest
{
public:
    TextSelectionTests() : juce::UnitTest ("vsreact text selection") {}

    void runTest() override
    {
        beginTest ("character boxes are per-character, monotonic, single line");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "text"],
                ["setProps", 1, {"style": {"width": 400, "height": 40, "fontSize": 20,
                    "userSelect": "text"}}],
                ["appendChild", 0, 1],
                ["create", 2, "rawtext"],
                ["appendChild", 1, 2],
                ["setText", 2, "Hello world"]
            ])");
            tree.computeLayout (400.0f, 100.0f);

            auto* node = tree.find (1);
            expect (node->isSelectableText());

            const auto boxes = vsreact::TextSelection::characterBoxes (*node);
            expectEquals ((int) boxes.size(), 11);

            for (size_t i = 1; i < boxes.size(); ++i)
            {
                expect (! boxes[i].isEmpty());
                expect (boxes[i].getX() >= boxes[i - 1].getX());
                expect (std::abs (boxes[i].getY() - boxes[0].getY()) < 0.6f);
            }
        }

        beginTest ("caret indices: left edge, right edge, word ranges");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "text"],
                ["setProps", 1, {"style": {"width": 400, "height": 40, "fontSize": 20,
                    "userSelect": "text"}}],
                ["appendChild", 0, 1],
                ["create", 2, "rawtext"],
                ["appendChild", 1, 2],
                ["setText", 2, "Hello world"]
            ])");
            tree.computeLayout (400.0f, 100.0f);

            auto* node = tree.find (1);
            expectEquals (vsreact::TextSelection::caretIndexAt (*node, { -50.0f, 20.0f }), 0);
            expectEquals (vsreact::TextSelection::caretIndexAt (*node, { 399.0f, 20.0f }), 11);

            const auto middle = vsreact::TextSelection::caretIndexAt (*node, { 40.0f, 20.0f });
            expect (middle > 0 && middle < 11);

            expect (vsreact::TextSelection::wordRangeAt ("Hello world", 1) == juce::Range<int> (0, 5));
            expect (vsreact::TextSelection::wordRangeAt ("Hello world", 8) == juce::Range<int> (6, 11));
            expect (vsreact::TextSelection::wordRangeAt ("Hello world", 5) == juce::Range<int> (5, 6));
            expect (vsreact::TextSelection::wordRangeAt ("", 0).isEmpty());
        }

        beginTest ("wrapped text yields one highlight rect per line");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "text"],
                ["setProps", 1, {"style": {"width": 70, "height": 80, "fontSize": 16,
                    "userSelect": "text"}}],
                ["appendChild", 0, 1],
                ["create", 2, "rawtext"],
                ["appendChild", 1, 2],
                ["setText", 2, "alpha beta gamma"]
            ])");
            tree.computeLayout (70.0f, 100.0f);

            auto* node = tree.find (1);
            const auto rects = vsreact::TextSelection::selectionRects (*node, 0, 16);
            expect (rects.size() >= 2);

            // Later lines sit lower.
            expect (rects.back().getY() > rects.front().getY());
        }

        beginTest ("visibleText applies textTransform (selection copies what you see)");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "text"],
                ["setProps", 1, {"style": {"width": 200, "height": 30, "fontSize": 14,
                    "userSelect": "text", "textTransform": "uppercase"}}],
                ["appendChild", 0, 1],
                ["create", 2, "rawtext"],
                ["appendChild", 1, 2],
                ["setText", 2, "loud"]
            ])");

            expectEquals (vsreact::TextSelection::visibleText (*tree.find (1)),
                          juce::String ("LOUD"));
        }

        beginTest ("numberOfLines text is not selectable; plain text is not selectable");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "text"],
                ["setProps", 1, {"style": {"userSelect": "text", "numberOfLines": 1}}],
                ["appendChild", 0, 1],
                ["create", 2, "text"],
                ["setProps", 2, {"style": {"fontSize": 14}}],
                ["appendChild", 0, 2]
            ])");

            expect (! tree.find (1)->isSelectableText());
            expect (! tree.find (2)->isSelectableText());
        }

        beginTest ("selection paints the highlight colour behind the glyphs");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "text"],
                ["setProps", 1, {"style": {"width": 200, "height": 40, "fontSize": 24,
                    "color": "#ffffff", "userSelect": "text", "selectionColor": "#ff0000"}}],
                ["appendChild", 0, 1],
                ["create", 2, "rawtext"],
                ["appendChild", 1, 2],
                ["setText", 2, "HELLO"]
            ])");
            tree.computeLayout (200.0f, 40.0f);

            auto* node = tree.find (1);
            node->selStart = 0;
            node->selEnd = 5;

            const auto image = renderTree (tree, 200, 40);

            // Somewhere in the text band a highlight pixel survives between
            // the white glyphs.
            bool sawHighlight = false;

            for (int y = 0; y < 40 && ! sawHighlight; ++y)
                for (int x = 0; x < 200 && ! sawHighlight; ++x)
                {
                    const auto pixel = image.getPixelAt (x, y);
                    sawHighlight = pixel.getRed() > 200 && pixel.getGreen() < 60
                                && pixel.getBlue() < 60;
                }

            expect (sawHighlight);
        }
    }
};

static TextSelectionTests textSelectionTests;

//==============================================================================
class HorizontalScrollTests final : public juce::UnitTest
{
public:
    HorizontalScrollTests() : juce::UnitTest ("vsreact horizontal scroll") {}

    void runTest() override
    {
        beginTest ("contentWidth and maxScrollX measure the overflow");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%", "overflow": "scroll"}}],
                ["appendChild", 0, 1],
                ["create", 2, "view"],
                ["setProps", 2, {"style": {"position": "absolute", "left": 0, "top": 0,
                    "width": 400, "height": 50}}],
                ["appendChild", 1, 2]
            ])");
            tree.computeLayout (200.0f, 100.0f);

            auto* scroller = tree.find (1);
            expectWithinAbsoluteError (scroller->contentWidth(), 400.0f, 0.5f);
            expectWithinAbsoluteError (scroller->maxScrollX(), 200.0f, 0.5f);
            expectWithinAbsoluteError (scroller->maxScroll(), 0.0f, 0.5f);
        }

        beginTest ("painting honours scrollX and hit-testing follows it");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%", "overflow": "scroll"}}],
                ["appendChild", 0, 1],
                ["create", 2, "view"],
                ["setProps", 2, {"style": {"position": "absolute", "left": 350, "top": 0,
                    "width": 50, "height": 100, "backgroundColor": "#0000ff"},
                    "listeners": ["click"]}],
                ["appendChild", 1, 2]
            ])");
            tree.computeLayout (200.0f, 100.0f);

            // Off-screen to the right initially.
            auto before = renderTree (tree, 200, 100);
            expect (approx (before.getPixelAt (175, 50), juce::Colours::black));
            expect (vsreact::hitTest (*tree.root(), { 175.0f, 50.0f }) == nullptr);

            tree.find (1)->scrollX = 200.0f;

            auto after = renderTree (tree, 200, 100);
            expect (approx (after.getPixelAt (175, 50), juce::Colour (0xff0000ff)));

            auto* hit = vsreact::hitTest (*tree.root(), { 175.0f, 50.0f });
            expect (hit != nullptr && hit->id == 2);
        }

        beginTest ("shift+wheel scrolls horizontally through the RootView");
        {
            vsreact::RootOptions options;
            options.bundleSource = R"js(
                __vsreact_flush(JSON.stringify([
                    ["create", 1, "view"],
                    ["setProps", 1, {"style": {"width": "100%", "height": "100%", "overflow": "scroll"}}],
                    ["appendChild", 0, 1],
                    ["create", 2, "view"],
                    ["setProps", 2, {"style": {"position": "absolute", "left": 350, "top": 0,
                        "width": 50, "height": 200, "backgroundColor": "#0000ff"}}],
                    ["appendChild", 1, 2]
                ]));
            )js";

            vsreact::RootView root (std::move (options), {});
            root.setSize (200, 200);

            auto source = juce::Desktop::getInstance().getMainMouseSource(); // by value: temporary handle
            const auto now = juce::Time::getCurrentTime();

            const auto makeEvent = [&] (juce::ModifierKeys mods)
            {
                return juce::MouseEvent (source, { 100.0f, 100.0f }, mods,
                                         juce::MouseInputSource::defaultPressure,
                                         juce::MouseInputSource::defaultOrientation,
                                         juce::MouseInputSource::defaultRotation,
                                         juce::MouseInputSource::defaultTiltX,
                                         juce::MouseInputSource::defaultTiltY,
                                         &root, &root, now, { 100.0f, 100.0f }, now, 1, false);
            };

            juce::MouseWheelDetails wheel;
            wheel.deltaX = 0.0f;
            wheel.deltaY = 0.25f;
            wheel.isReversed = wheel.isSmooth = wheel.isInertial = false;

            const auto paintRoot = [&root]
            {
                juce::Image image (juce::Image::ARGB, 200, 200, true);
                juce::Graphics g (image);
                g.fillAll (juce::Colours::black);
                root.paint (g);
                return image;
            };

            // Plain vertical wheel: no vertical overflow, nothing moves.
            root.mouseWheelMove (makeEvent ({}), wheel);
            expect (approx (paintRoot().getPixelAt (175, 100), juce::Colours::black));

            // Shift+wheel-down maps the vertical delta to X and scrolls
            // right (wheel-up would scroll left): 2 notches = 200 px.
            wheel.deltaY = -0.25f;
            root.mouseWheelMove (makeEvent (juce::ModifierKeys::shiftModifier), wheel);
            root.mouseWheelMove (makeEvent (juce::ModifierKeys::shiftModifier), wheel);

            expect (approx (paintRoot().getPixelAt (175, 100), juce::Colour (0xff0000ff)));
        }
    }
};

static HorizontalScrollTests horizontalScrollTests;

//==============================================================================
class SelectionInteractionTests final : public juce::UnitTest
{
public:
    SelectionInteractionTests() : juce::UnitTest ("vsreact selection interaction") {}

    void runTest() override
    {
        beginTest ("drag-select highlights and Ctrl/Cmd+C is handled; empty click clears");

        vsreact::RootOptions options;
        options.bundleSource = R"js(
            __vsreact_flush(JSON.stringify([
                ["create", 1, "text"],
                ["setProps", 1, {"style": {"position": "absolute", "left": 0, "top": 0,
                    "width": 240, "height": 40, "fontSize": 28, "color": "#ffffff",
                    "userSelect": "text", "selectionColor": "#ff0000"}}],
                ["appendChild", 0, 1],
                ["create", 2, "rawtext"],
                ["appendChild", 1, 2],
                ["setText", 2, "HELLO WORLD"]
            ]));
        )js";

        vsreact::RootView root (std::move (options), {});
        root.setSize (240, 120);

        auto source = juce::Desktop::getInstance().getMainMouseSource(); // by value: temporary handle
        const auto now = juce::Time::getCurrentTime();
        const auto mods = juce::ModifierKeys (juce::ModifierKeys::leftButtonModifier);

        const auto makeEvent = [&] (juce::Point<float> position)
        {
            return juce::MouseEvent (source, position, mods,
                                     juce::MouseInputSource::defaultPressure,
                                     juce::MouseInputSource::defaultOrientation,
                                     juce::MouseInputSource::defaultRotation,
                                     juce::MouseInputSource::defaultTiltX,
                                     juce::MouseInputSource::defaultTiltY,
                                     &root, &root, now, position, now, 1, false);
        };

        const auto paintRoot = [&root]
        {
            juce::Image image (juce::Image::ARGB, 240, 120, true);
            juce::Graphics g (image);
            g.fillAll (juce::Colours::black);
            root.paint (g);
            return image;
        };

        const auto hasHighlight = [] (const juce::Image& image)
        {
            for (int y = 0; y < 50; ++y)
                for (int x = 0; x < 240; ++x)
                {
                    const auto pixel = image.getPixelAt (x, y);

                    if (pixel.getRed() > 200 && pixel.getGreen() < 60 && pixel.getBlue() < 60)
                        return true;
                }

            return false;
        };

        // Drag across most of the text.
        root.mouseDown (makeEvent ({ 4.0f, 20.0f }));
        root.mouseDrag (makeEvent ({ 220.0f, 20.0f }));
        root.mouseUp (makeEvent ({ 220.0f, 20.0f }));

        expect (hasHighlight (paintRoot()));

        // Copy shortcut is claimed while a selection exists.
        const juce::KeyPress copyKey ('c', juce::ModifierKeys::commandModifier, 0);
        expect (root.keyPressed (copyKey));

#if JUCE_WINDOWS
        expect (juce::SystemClipboard::getTextFromClipboard().contains ("HELLO"));
#endif

        // Clicking empty space clears the selection and releases the shortcut.
        root.mouseDown (makeEvent ({ 120.0f, 100.0f }));
        root.mouseUp (makeEvent ({ 120.0f, 100.0f }));

        expect (! hasHighlight (paintRoot()));
        expect (! root.keyPressed (copyKey));
    }
};

static SelectionInteractionTests selectionInteractionTests;
