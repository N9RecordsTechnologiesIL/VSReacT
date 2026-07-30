#include <vsreact/vsreact.h>

#include <iostream>

// Headless interaction test: for each example, hit-test a real control point and
// drive a drag through the same path RootView uses, then assert the parameter
// was actually written.
//
// This exists because a reference-art UI can look perfect and still be dead:
// the visible knob is a photograph, and the thing that takes the gesture is a
// transparent view that may be mis-positioned or covered by a later sibling.
// Painting proves nothing about that. Driving a real cursor proved even less —
// synthetic mouse input on a developer's desktop lands wherever the desktop
// happens to be, and an animating panel changes pixels on its own, so "the
// screenshot differs" is not evidence the control moved.
//
// Asserting on the native param: traffic also covers the begin/set/end gesture
// bracket, which hosts need for automation and which is easy to omit.
class ExampleInteractionTests final : public juce::UnitTest
{
public:
    ExampleInteractionTests() : juce::UnitTest ("vsreact::ExampleInteraction") {}

    struct Case
    {
        const char* example;
        int editorW, editorH;
        const char* control;
        float x, y;          // editor-space point on the control
        const char* param;   // the APVTS id the drag must write
        float dy;            // drag distance; negative = upward = increase
    };

    void runTest() override
    {
        const juce::File examples { juce::String (VSREACT_EXAMPLES_DIR) };

        // Points are the control centres in editor space (plate coords ÷ 2).
        const Case cases[] = {
            { "gain",    768, 512, "GAIN knob",  237.0f, 271.0f, "gain",  -80.0f },
            { "gain",    768, 512, "PAN knob",   527.0f, 271.0f, "pan",   -80.0f },
            { "drums",   836, 470, "LEVEL knob", 683.0f, 100.0f, "level", -70.0f },
            { "channel", 768, 512, "COMP knob",  535.0f, 220.0f, "comp",  -60.0f },
            { "delay",   793, 496, "TIME knob",  131.0f, 283.0f, "time",  -60.0f },
        };

        for (const auto& c : cases)
            runCase (examples, c);
    }

private:
    static constexpr double startValue = 0.5;

    void runCase (const juce::File& examples, const Case& c)
    {
        beginTest (juce::String (c.example) + ": drag " + c.control + " writes " + c.param);

        const auto bundle = examples.getChildFile (c.example).getChildFile ("ui/build/main.js");

        if (! bundle.existsAsFile())
        {
            logMessage ("skipped (not built): " + bundle.getFullPathName());
            return;
        }

        vsreact::ShadowTree tree;
        juce::String error;

        // Every native call, in order — the assertions read this back.
        juce::StringArray callLog;

        vsreact::JsRuntime::Callbacks cbs;
        cbs.onError = [&] (const juce::String& m, const juce::String&) { error = m; };
        cbs.onFlush = [&] (const juce::String& ops) { tree.applyOpsJson (ops); };
        cbs.onLog = [] (const juce::String&, const juce::String&) {};
        cbs.onSetTimer = [] (int, int) {};
        cbs.onClearTimer = [] (int) {};
        cbs.onRegisterFont = [] (const juce::String&, const juce::String&, int) {};

        cbs.onNativeCall = [&] (const juce::String& call, const juce::var& args) -> juce::var
        {
            const auto id = args.getProperty ("id", "").toString();

            if (call.startsWith ("param:"))
                callLog.add (call + " " + id
                             + (call == "param:set"
                                    ? (" " + juce::String ((double) args.getProperty ("value", 0.0), 4))
                                    : juce::String()));

            // Answer param:get with a mid-range value so the drag has a defined
            // starting point; without it useParameter starts at 0 and an
            // upward drag can't be distinguished from a clamp.
            if (call == "param:get")
            {
                auto* state = new juce::DynamicObject();
                state->setProperty ("value", startValue);
                state->setProperty ("text", "");
                state->setProperty ("name", id);
                state->setProperty ("label", "");
                state->setProperty ("defaultValue", startValue);
                return juce::var (state);
            }

            if (call == "param:list")
                return juce::var (juce::Array<juce::var>());

            return juce::var();
        };

        vsreact::JsRuntime js { cbs };

        if (! js.evaluate (bundle.loadFileAsString(), bundle.getFileName()))
        {
            expect (false, juce::String (c.example) + ": bundle failed to evaluate");
            return;
        }

        tree.computeLayout ((float) c.editorW, (float) c.editorH);

        // ── hit test, exactly as RootView::mouseDown does ──
        const juce::Point<float> press { c.x, c.y };
        auto* hit = vsreact::hitTest (*tree.root(), press);

        if (hit == nullptr)
        {
            expect (false, juce::String (c.example) + ": nothing hit at ("
                               + juce::String (c.x) + "," + juce::String (c.y)
                               + ") — the " + c.control + " hit zone is missing or misplaced");
            return;
        }

        int dragNodeId = 0;

        for (auto* node = hit; node != nullptr; node = node->parent)
            if (node->listeners.contains ("drag") || node->listeners.contains ("dragstart")
                || node->listeners.contains ("dragend"))
            {
                dragNodeId = node->id;
                break;
            }

        if (dragNodeId == 0)
        {
            expect (false, juce::String (c.example) + ": the node under " + c.control
                               + " has no drag listener — something is covering it");
            return;
        }

        // ── drive the gesture: dragstart at the press, then drag by dy ──
        dispatchDrag (js, dragNodeId, "dragstart", 0.0f, 0.0f, press);
        dispatchDrag (js, dragNodeId, "drag", 0.0f, c.dy, press);
        dispatchDrag (js, dragNodeId, "dragend", 0.0f, c.dy, press);

        // ── assertions ──
        const auto setPrefix = "param:set " + juce::String (c.param) + " ";
        int setIndex = -1;
        double wrote = startValue;

        for (int i = 0; i < callLog.size(); ++i)
            if (callLog[i].startsWith (setPrefix))
            {
                setIndex = i;
                wrote = callLog[i].substring (setPrefix.length()).getDoubleValue();
            }

        const auto beginIndex = callLog.indexOf ("param:begin " + juce::String (c.param));
        const auto endIndex = callLog.indexOf ("param:end " + juce::String (c.param));

        std::cout << "INTERACT " << c.example << " " << c.control
                  << ": node=" << dragNodeId
                  << ", " << startValue << " -> " << juce::String (wrote, 4)
                  << ", gesture begin=" << beginIndex << " set=" << setIndex
                  << " end=" << endIndex
                  << (error.isNotEmpty() ? (", ERROR: " + error) : juce::String())
                  << std::endl;

        expect (error.isEmpty(), juce::String (c.example) + ": JS error: " + error);
        expect (setIndex >= 0, juce::String (c.example) + ": dragging " + c.control
                                   + " never wrote " + c.param + " (calls: " + callLog.joinIntoString (", ") + ")");

        // Upward drag must raise the value, and by a usable amount rather than
        // a rounding wobble.
        expect (wrote > startValue + 0.05,
                juce::String (c.example) + ": " + c.param + " moved from " + juce::String (startValue)
                    + " to only " + juce::String (wrote, 4) + " over " + juce::String (-c.dy) + "px up");

        // begin/end must bracket the write, or the host records no automation
        // gesture and some DAWs drop the change.
        expect (beginIndex >= 0 && beginIndex < setIndex,
                juce::String (c.example) + ": " + c.param + " was set without a preceding param:begin");
        expect (endIndex > setIndex,
                juce::String (c.example) + ": " + c.param + " gesture never ended (param:end missing)");
    }

    static void dispatchDrag (vsreact::JsRuntime& js, int nodeId, const juce::String& type,
                              float dx, float dy, juce::Point<float> start)
    {
        auto* payload = new juce::DynamicObject();
        payload->setProperty ("dx", dx);
        payload->setProperty ("dy", dy);
        payload->setProperty ("x", start.x + dx);
        payload->setProperty ("y", start.y + dy);

        auto* message = new juce::DynamicObject();
        message->setProperty ("kind", "event");
        message->setProperty ("nodeId", nodeId);
        message->setProperty ("type", type);
        message->setProperty ("payload", juce::var (payload));

        js.dispatch (juce::var (message));
    }
};

static ExampleInteractionTests exampleInteractionTests;
