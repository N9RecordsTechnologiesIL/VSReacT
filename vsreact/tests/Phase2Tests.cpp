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
class ArcPaintingTests final : public juce::UnitTest
{
public:
    ArcPaintingTests() : juce::UnitTest ("vsreact::Painter arcs") {}

    void runTest() override
    {
        beginTest ("track arc paints the ring, not the centre or the gap");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": 100, "height": 100,
                    "arcTrackColor": "#ff0000", "arcThickness": 8,
                    "arcStart": -135, "arcEnd": 135}}],
                ["appendChild", 0, 1]
            ])");

            const auto image = renderTree (tree, 100, 100);

            // 12 o'clock on the ring (radius 46): painted.
            expect (approx (image.getPixelAt (50, 4), juce::Colour (0xffff0000)));
            // Centre: untouched.
            expect (approx (image.getPixelAt (50, 50), juce::Colours::black));
            // 6 o'clock is inside the -135..135 gap: untouched.
            expect (approx (image.getPixelAt (50, 96), juce::Colours::black));
        }

        beginTest ("value arc stops at arcValueEnd");
        {
            vsreact::ShadowTree tree;
            tree.applyOpsJson (R"([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": 100, "height": 100,
                    "arcColor": "#00ff00", "arcThickness": 8,
                    "arcStart": -135, "arcValueEnd": 0}}],
                ["appendChild", 0, 1]
            ])");

            const auto image = renderTree (tree, 100, 100);

            // Left side of the ring (angle ~ -90): inside -135..0, painted.
            expect (approx (image.getPixelAt (4, 50), juce::Colour (0xff00ff00)));
            // Right side (angle ~ +90): beyond the value end, untouched.
            expect (approx (image.getPixelAt (96, 50), juce::Colours::black));
        }
    }
};

static ArcPaintingTests arcPaintingTests;

//==============================================================================
class ScrollTests final : public juce::UnitTest
{
public:
    ScrollTests() : juce::UnitTest ("vsreact scroll containers") {}

    void runTest() override
    {
        vsreact::ShadowTree tree;
        tree.applyOpsJson (R"([
            ["create", 1, "view"],
            ["setProps", 1, {"style": {"width": "100%", "height": "100%", "overflow": "scroll"}}],
            ["appendChild", 0, 1],
            ["create", 2, "view"],
            ["setProps", 2, {"style": {"height": 60, "backgroundColor": "#ff0000"}, "listeners": ["click"]}],
            ["appendChild", 1, 2],
            ["create", 3, "view"],
            ["setProps", 3, {"style": {"height": 60, "backgroundColor": "#00ff00"}, "listeners": ["click"]}],
            ["appendChild", 1, 3],
            ["create", 4, "view"],
            ["setProps", 4, {"style": {"height": 60, "backgroundColor": "#0000ff"}, "listeners": ["click"]}],
            ["appendChild", 1, 4]
        ])");

        tree.computeLayout (100.0f, 100.0f);

        beginTest ("content extent and clamping");
        {
            auto* container = tree.find (1);
            expectEquals (container->contentHeight(), 180.0f);
            expectEquals (container->maxScroll(), 80.0f);
        }

        beginTest ("scrolled paint translates children and clips");
        {
            tree.find (1)->scrollY = 50.0f;
            const auto image = renderTree (tree, 100, 100);

            // Top row now shows child 2's tail (red would be at -50..10).
            expect (approx (image.getPixelAt (50, 5), juce::Colour (0xffff0000)));
            // y=90 shows child 4 (120..180 -> 70..130 on screen).
            expect (approx (image.getPixelAt (50, 90), juce::Colour (0xff0000ff)));
        }

        beginTest ("hit-testing accounts for scroll offset");
        {
            tree.find (1)->scrollY = 50.0f;
            tree.computeLayout (100.0f, 100.0f);

            auto* hit = vsreact::hitTest (*tree.root(), { 50.0f, 90.0f });
            expect (hit != nullptr);
            expectEquals (hit->id, 4);

            auto* scrollable = vsreact::hitTestScrollable (*tree.root(), { 50.0f, 90.0f });
            expect (scrollable != nullptr);
            expectEquals (scrollable->id, 1);
        }

        beginTest ("scrollTop prop applies");
        {
            tree.applyOpsJson (R"([["setProps", 1, {"style": {"width": "100%", "height": "100%", "overflow": "scroll"}, "scrollTop": 0}]])");
            expectEquals (tree.find (1)->scrollY, 0.0f);
        }

        beginTest ("accumulated ancestor scroll");
        {
            tree.find (1)->scrollY = 30.0f;
            expectEquals (tree.find (3)->accumulatedAncestorScroll(), 30.0f);
        }
    }
};

static ScrollTests scrollTests;

//==============================================================================
class DragDispatchTests final : public juce::UnitTest
{
public:
    DragDispatchTests() : juce::UnitTest ("vsreact drag dispatch") {}

    void runTest() override
    {
        beginTest ("mouse down/drag/up dispatches dragstart, drag, dragend with deltas");

        juce::StringArray seen;

        vsreact::RootOptions options;
        options.bundleSource = R"js(
            __vsreact_flush(JSON.stringify([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%"},
                                  "listeners": ["dragstart", "drag", "dragend", "click"]}],
                ["appendChild", 0, 1]
            ]));
            globalThis.__vsreact_dispatch = function (json) {
                var msg = JSON.parse(json);
                if (msg.kind === "event")
                    __vsreact_nativeCall("seen", JSON.stringify({ type: msg.type, dy: msg.payload && msg.payload.dy }));
            };
        )js";

        options.onNativeCall = [&seen] (const juce::String& name, const juce::var& args) -> juce::var
        {
            if (name == "seen")
                seen.add (args["type"].toString() + ":" + args["dy"].toString());

            return {};
        };

        vsreact::RootView root (std::move (options), {});
        root.setSize (200, 200);

        auto& source = juce::Desktop::getInstance().getMainMouseSource();
        const auto now = juce::Time::getCurrentTime();
        const auto mods = juce::ModifierKeys (juce::ModifierKeys::leftButtonModifier);

        const auto makeEvent = [&] (juce::Point<float> position, juce::Point<float> downPosition)
        {
            return juce::MouseEvent (source, position, mods,
                                     juce::MouseInputSource::defaultPressure,
                                     juce::MouseInputSource::defaultOrientation,
                                     juce::MouseInputSource::defaultRotation,
                                     juce::MouseInputSource::defaultTiltX,
                                     juce::MouseInputSource::defaultTiltY,
                                     &root, &root, now, downPosition, now, 1, false);
        };

        root.mouseDown (makeEvent ({ 100.0f, 100.0f }, { 100.0f, 100.0f }));
        root.mouseDrag (makeEvent ({ 100.0f, 60.0f }, { 100.0f, 100.0f }));
        root.mouseDrag (makeEvent ({ 100.0f, 40.0f }, { 100.0f, 100.0f }));
        root.mouseUp (makeEvent ({ 100.0f, 40.0f }, { 100.0f, 100.0f }));

        expect (seen.contains ("dragstart:-40"));
        expect (seen.contains ("drag:-40"));
        expect (seen.contains ("drag:-60"));
        expect (seen.contains ("dragend:-60"));

        // A completed drag must not produce a click.
        expect (! seen.joinIntoString (",").contains ("click"));
    }
};

static DragDispatchTests dragDispatchTests;

//==============================================================================
class WheelAndDoubleClickTests final : public juce::UnitTest
{
public:
    WheelAndDoubleClickTests() : juce::UnitTest ("vsreact wheel + dblclick dispatch") {}

    void runTest() override
    {
        beginTest ("wheel and double-click events reach their listeners");

        juce::StringArray seen;

        vsreact::RootOptions options;
        options.bundleSource = R"js(
            __vsreact_flush(JSON.stringify([
                ["create", 1, "view"],
                ["setProps", 1, {"style": {"width": "100%", "height": "100%"},
                                  "listeners": ["wheel", "dblclick"]}],
                ["appendChild", 0, 1]
            ]));
            globalThis.__vsreact_dispatch = function (json) {
                var msg = JSON.parse(json);
                if (msg.kind === "event")
                    __vsreact_nativeCall("seen", JSON.stringify({ type: msg.type, dy: msg.payload && msg.payload.dy }));
            };
        )js";

        options.onNativeCall = [&seen] (const juce::String& name, const juce::var& args) -> juce::var
        {
            if (name == "seen")
                seen.add (args["type"].toString() + ":" + args["dy"].toString());

            return {};
        };

        vsreact::RootView root (std::move (options), {});
        root.setSize (200, 200);

        auto& source = juce::Desktop::getInstance().getMainMouseSource();
        const auto now = juce::Time::getCurrentTime();

        const auto event = juce::MouseEvent (source, { 100.0f, 100.0f }, juce::ModifierKeys(),
                                             juce::MouseInputSource::defaultPressure,
                                             juce::MouseInputSource::defaultOrientation,
                                             juce::MouseInputSource::defaultRotation,
                                             juce::MouseInputSource::defaultTiltX,
                                             juce::MouseInputSource::defaultTiltY,
                                             &root, &root, now, { 100.0f, 100.0f }, now, 2, false);

        juce::MouseWheelDetails wheel;
        wheel.deltaX = 0.0f;
        wheel.deltaY = 0.25f;
        wheel.isReversed = wheel.isSmooth = wheel.isInertial = false;

        root.mouseWheelMove (event, wheel);
        expect (seen.contains ("wheel:0.25"));

        root.mouseDoubleClick (event);
        expect (seen.joinIntoString (",").contains ("dblclick"));
    }
};

static WheelAndDoubleClickTests wheelAndDoubleClickTests;

//==============================================================================
class PostHogBridgeTests final : public juce::UnitTest
{
public:
    PostHogBridgeTests() : juce::UnitTest ("vsreact::PostHogBridge") {}

    void runTest() override
    {
        const auto stateFile = juce::File::getSpecialLocation (juce::File::tempDirectory)
                                   .getChildFile ("vsreact-posthog-test-id.txt");
        stateFile.deleteFile();

        beginTest ("posthog:config returns a persistent distinct id + host");
        {
            vsreact::PostHogBridge::Options options;
            options.apiKey = "phc_test";
            options.host = "https://eu.i.posthog.com";
            options.stateFile = stateFile;

            juce::String firstId;

            {
                vsreact::PostHogBridge bridge (options);
                const auto config = bridge.handleNativeCall ("posthog:config", juce::var());
                expect (config.has_value());
                firstId = (*config)["distinctId"].toString();
                expect (firstId.isNotEmpty());
                expectEquals ((*config)["host"].toString(), juce::String ("https://eu.i.posthog.com"));
            }

            vsreact::PostHogBridge second (options);
            expectEquals (second.getDistinctId(), firstId); // persisted across instances
        }

        beginTest ("posthog:send batches events into one wrapped POST");
        {
            vsreact::PostHogBridge::Options options;
            options.apiKey = "phc_test";
            options.host = "https://eu.i.posthog.com";

            vsreact::PostHogBridge bridge (options);

            juce::StringArray urls;
            juce::var lastBody;

            bridge.setTransport ([&] (const juce::String& url, const juce::String& body) -> bool
            {
                urls.add (url);
                lastBody = juce::JSON::parse (body);
                return true;
            });

            const auto makeEvent = [] (const char* name)
            {
                auto* event = new juce::DynamicObject();
                event->setProperty ("event", name);
                return juce::var (event);
            };

            juce::Array<juce::var> batch;
            batch.add (makeEvent ("plugin_opened"));
            batch.add (makeEvent ("parameter_changed"));

            auto* args = new juce::DynamicObject();
            args->setProperty ("batch", batch);

            const auto result = bridge.handleNativeCall ("posthog:send", juce::var (args));
            expect (result.has_value());

            bridge.flushSynchronously();

            expectEquals (urls.size(), 1);
            expectEquals (urls[0], juce::String ("https://eu.i.posthog.com/batch/"));
            expectEquals (lastBody["api_key"].toString(), juce::String ("phc_test"));
            expectEquals (lastBody["batch"].getArray()->size(), 2);
            expectEquals ((*lastBody["batch"].getArray())[0]["event"].toString(),
                          juce::String ("plugin_opened"));

            // non-posthog calls pass through
            expect (! bridge.handleNativeCall ("param:get", juce::var()).has_value());
        }

        stateFile.deleteFile();
    }
};

static PostHogBridgeTests postHogBridgeTests;

//==============================================================================
namespace
{
    struct BridgeTestProcessor final : juce::AudioProcessor
    {
        BridgeTestProcessor()
            : AudioProcessor (BusesProperties().withOutput ("Out", juce::AudioChannelSet::stereo(), true)),
              state (*this, nullptr, "PARAMS",
                     { std::make_unique<juce::AudioParameterFloat> ("gain", "Gain", 0.0f, 1.0f, 0.5f),
                       std::make_unique<juce::AudioParameterFloat> ("pan", "Pan", -1.0f, 1.0f, 0.0f) })
        {}

        const juce::String getName() const override { return "BridgeTest"; }
        void prepareToPlay (double, int) override {}
        void releaseResources() override {}
        void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override {}
        double getTailLengthSeconds() const override { return 0.0; }
        bool acceptsMidi() const override { return false; }
        bool producesMidi() const override { return false; }
        juce::AudioProcessorEditor* createEditor() override { return nullptr; }
        bool hasEditor() const override { return false; }
        int getNumPrograms() override { return 1; }
        int getCurrentProgram() override { return 0; }
        void setCurrentProgram (int) override {}
        const juce::String getProgramName (int) override { return {}; }
        void changeProgramName (int, const juce::String&) override {}
        void getStateInformation (juce::MemoryBlock&) override {}
        void setStateInformation (const void*, int) override {}

        juce::AudioProcessorValueTreeState state;
    };

    juce::var makeArgs (std::initializer_list<std::pair<const char*, juce::var>> pairs)
    {
        auto* object = new juce::DynamicObject();

        for (const auto& [key, value] : pairs)
            object->setProperty (key, value);

        return juce::var (object);
    }
}

class ParameterBridgeTests final : public juce::UnitTest
{
public:
    ParameterBridgeTests() : juce::UnitTest ("vsreact::ParameterBridge") {}

    void runTest() override
    {
        BridgeTestProcessor processor;
        vsreact::ParameterBridge bridge (processor.state);

        beginTest ("param:get returns normalized value + metadata");
        {
            const auto result = bridge.handleNativeCall ("param:get", makeArgs ({ { "id", "gain" } }));
            expect (result.has_value());
            expectEquals (static_cast<float> (static_cast<double> ((*result)["value"])), 0.5f);
            expectEquals ((*result)["name"].toString(), juce::String ("Gain"));
            expectEquals (static_cast<float> (static_cast<double> ((*result)["defaultValue"])), 0.5f);
        }

        beginTest ("param:set moves the parameter and pushes an event");
        {
            juce::StringArray events;
            juce::var lastPayload;

            bridge.setEventSink ([&] (const juce::String& name, const juce::var& payload)
            {
                events.add (name);
                lastPayload = payload;
            });

            bridge.handleNativeCall ("param:set", makeArgs ({ { "id", "gain" }, { "value", 0.8 } }));
            bridge.flushPendingEvents();

            expectWithinAbsoluteError (processor.state.getParameter ("gain")->getValue(), 0.8f, 1.0e-5f);
            expect (events.contains ("param"));
            expectEquals (lastPayload["id"].toString(), juce::String ("gain"));
            expectWithinAbsoluteError (static_cast<float> (static_cast<double> (lastPayload["value"])), 0.8f, 1.0e-5f);
        }

        beginTest ("param:list enumerates every parameter in order");
        {
            const auto result = bridge.handleNativeCall ("param:list", juce::var());
            expect (result.has_value());

            auto* list = result->getArray();
            expect (list != nullptr);
            expectEquals (list->size(), 2);

            expectEquals ((*list)[0]["id"].toString(), juce::String ("gain"));
            expectEquals ((*list)[0]["name"].toString(), juce::String ("Gain"));
            expectEquals ((*list)[1]["id"].toString(), juce::String ("pan"));
            expect ((*list)[0].hasProperty ("value"));
            expect ((*list)[0].hasProperty ("text"));
            expect ((*list)[0].hasProperty ("label"));
            expect ((*list)[0].hasProperty ("defaultValue"));
        }

        beginTest ("gestures and unknown calls");
        {
            expect (bridge.handleNativeCall ("param:begin", makeArgs ({ { "id", "pan" } })).has_value());
            expect (bridge.handleNativeCall ("param:end", makeArgs ({ { "id", "pan" } })).has_value());
            expect (! bridge.handleNativeCall ("startDownload", juce::var()).has_value());

            // Unknown id is handled (returns void var) rather than crashing.
            expect (bridge.handleNativeCall ("param:set", makeArgs ({ { "id", "nope" }, { "value", 1.0 } })).has_value());
        }
    }
};

static ParameterBridgeTests parameterBridgeTests;
