#include <vsreact/vsreact.h>

namespace
{
    struct Capture
    {
        juce::StringArray logs;
        juce::StringArray flushes;
        juce::StringArray errors;
        std::vector<std::pair<int, int>> timersSet;
        std::vector<int> timersCleared;

        vsreact::JsRuntime::Callbacks callbacks()
        {
            vsreact::JsRuntime::Callbacks cbs;

            cbs.onLog = [this] (const juce::String& level, const juce::String& msg)
            { logs.add (level + ":" + msg); };

            cbs.onFlush = [this] (const juce::String& json) { flushes.add (json); };

            cbs.onNativeCall = [] (const juce::String& name, const juce::var& args) -> juce::var
            {
                if (name == "add")
                {
                    auto* obj = new juce::DynamicObject();
                    obj->setProperty ("sum", static_cast<int> (args["a"]) + static_cast<int> (args["b"]));
                    return juce::var (obj);
                }

                return {};
            };

            cbs.onSetTimer = [this] (int id, int ms) { timersSet.push_back ({ id, ms }); };
            cbs.onClearTimer = [this] (int id) { timersCleared.push_back (id); };

            cbs.onError = [this] (const juce::String& message, const juce::String& stack)
            { errors.add (message + "\n" + stack); };

            return cbs;
        }
    };
}

class JsRuntimeTests final : public juce::UnitTest
{
public:
    JsRuntimeTests() : juce::UnitTest ("vsreact::JsRuntime") {}

    void runTest() override
    {
        beginTest ("evaluates scripts");
        {
            Capture capture;
            vsreact::JsRuntime js { capture.callbacks() };
            expect (js.evaluate ("const x = 1 + 1;", "test.js"));
            expect (capture.errors.isEmpty());
        }

        beginTest ("__vsreact_log reaches onLog");
        {
            Capture capture;
            vsreact::JsRuntime js { capture.callbacks() };
            expect (js.evaluate ("__vsreact_log('warn', 'hello');", "test.js"));
            expectEquals (capture.logs.joinIntoString (";"), juce::String ("warn:hello"));
        }

        beginTest ("__vsreact_protocol is published before any script runs");
        {
            // A bundle newer than this module degrades by reading this global.
            // Drop it and the mismatch goes back to being an invisible freeze.
            Capture capture;
            vsreact::JsRuntime js { capture.callbacks() };
            expect (js.evaluate ("__vsreact_flush(String(__vsreact_protocol));", "test.js"));
            expectEquals (capture.flushes.joinIntoString (";"), juce::String (vsreact::protocolVersion));
        }

        beginTest ("__vsreact_flush reaches onFlush");
        {
            Capture capture;
            vsreact::JsRuntime js { capture.callbacks() };
            expect (js.evaluate ("__vsreact_flush('[1,2,3]');", "test.js"));
            expectEquals (capture.flushes.joinIntoString (";"), juce::String ("[1,2,3]"));
        }

        beginTest ("__vsreact_nativeCall round-trips JSON");
        {
            Capture capture;
            vsreact::JsRuntime js { capture.callbacks() };
            expect (js.evaluate ("__vsreact_flush(__vsreact_nativeCall('add', '{\"a\":2,\"b\":3}'));",
                                 "test.js"));
            expect (capture.flushes.size() == 1);
            const auto result = juce::JSON::parse (capture.flushes[0]);
            expectEquals (static_cast<int> (result["sum"]), 5);
        }

        beginTest ("thrown errors reach onError with a stack");
        {
            Capture capture;
            vsreact::JsRuntime js { capture.callbacks() };
            expect (! js.evaluate ("function boom() { throw new Error('kaboom'); } boom();",
                                   "test.js"));
            expect (capture.errors.size() == 1);
            expect (capture.errors[0].contains ("kaboom"));
            expect (capture.errors[0].contains ("boom"));
        }

        beginTest ("microtasks run before evaluate returns");
        {
            Capture capture;
            vsreact::JsRuntime js { capture.callbacks() };
            expect (js.evaluate ("Promise.resolve().then(() => __vsreact_log('log', 'micro'));",
                                 "test.js"));
            expectEquals (capture.logs.joinIntoString (";"), juce::String ("log:micro"));
        }

        beginTest ("unhandled promise rejections reach onError");
        {
            Capture capture;
            vsreact::JsRuntime js { capture.callbacks() };
            js.evaluate ("Promise.reject(new Error('lost'));", "test.js");
            expect (capture.errors.size() == 1);
            expect (capture.errors[0].contains ("lost"));
        }

        beginTest ("timer natives reach the scheduler callbacks");
        {
            Capture capture;
            vsreact::JsRuntime js { capture.callbacks() };
            expect (js.evaluate ("__vsreact_setTimer(7, 250); __vsreact_clearTimer(7);", "test.js"));
            expect (capture.timersSet == std::vector<std::pair<int, int>> { { 7, 250 } });
            expect (capture.timersCleared == std::vector<int> { 7 });
        }

        beginTest ("dispatch calls __vsreact_dispatch with JSON");
        {
            Capture capture;
            vsreact::JsRuntime js { capture.callbacks() };
            expect (js.evaluate ("globalThis.__vsreact_dispatch = (json) => __vsreact_log('log', 'got:' + json);",
                                 "test.js"));

            auto* obj = new juce::DynamicObject();
            obj->setProperty ("kind", "timer");
            obj->setProperty ("id", 3);
            js.dispatch (juce::var (obj));

            expect (capture.logs.size() == 1);
            expect (capture.logs[0].startsWith ("log:got:"));

            const auto payload = juce::JSON::parse (capture.logs[0].fromFirstOccurrenceOf ("log:got:", false, false));
            expectEquals (payload["kind"].toString(), juce::String ("timer"));
            expectEquals (static_cast<int> (payload["id"]), 3);
        }

        beginTest ("dispatch errors are reported, not fatal");
        {
            Capture capture;
            vsreact::JsRuntime js { capture.callbacks() };
            js.evaluate ("globalThis.__vsreact_dispatch = () => { throw new Error('handler'); };",
                         "test.js");
            js.dispatch (juce::var (1));
            expect (capture.errors.size() == 1);
            expect (capture.errors[0].contains ("handler"));
        }
    }
};

static JsRuntimeTests jsRuntimeTests;

//==============================================================================
class SchedulerTests final : public juce::UnitTest
{
public:
    SchedulerTests() : juce::UnitTest ("vsreact::Scheduler") {}

    void runTest() override
    {
        beginTest ("due timers fire once and clear");
        {
            vsreact::Scheduler scheduler;
            std::vector<int> fired;
            scheduler.onFire = [&] (int id) { fired.push_back (id); };

            scheduler.setTimer (1, 0);
            scheduler.setTimer (2, 60'000);
            scheduler.checkNow();

            expect (fired == std::vector<int> { 1 });
            expectEquals (scheduler.numPending(), 1);

            scheduler.checkNow();
            expect (fired == std::vector<int> { 1 });
        }

        beginTest ("cleared timers never fire");
        {
            vsreact::Scheduler scheduler;
            std::vector<int> fired;
            scheduler.onFire = [&] (int id) { fired.push_back (id); };

            scheduler.setTimer (1, 0);
            scheduler.clearTimer (1);
            scheduler.checkNow();

            expect (fired.empty());
            expectEquals (scheduler.numPending(), 0);
        }

        beginTest ("onFire may re-arm timers");
        {
            vsreact::Scheduler scheduler;
            int count = 0;
            scheduler.onFire = [&] (int id)
            {
                if (++count < 3)
                    scheduler.setTimer (id, 0);
            };

            scheduler.setTimer (9, 0);
            scheduler.checkNow();
            scheduler.checkNow();
            scheduler.checkNow();

            expectEquals (count, 3);
            expectEquals (scheduler.numPending(), 0);
        }
    }
};

static SchedulerTests schedulerTests;
