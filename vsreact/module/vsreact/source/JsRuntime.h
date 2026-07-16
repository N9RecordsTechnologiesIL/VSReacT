#pragma once

#include <juce_core/juce_core.h>

#include <functional>
#include <memory>

namespace vsreact
{

/** Owns a QuickJS runtime + context and the __vsreact_* native bindings.

    All methods must be called on the JUCE message thread. JS exceptions never
    propagate as C++ exceptions — they arrive through Callbacks::onError.
*/
class JsRuntime
{
public:
    struct Callbacks
    {
        /** JS called __vsreact_flush(opsJson) — a mutation batch. */
        std::function<void (const juce::String& opsJson)> onFlush;

        /** JS called __vsreact_nativeCall(name, argsJson); the returned var is
            JSON-encoded back to JS synchronously. */
        std::function<juce::var (const juce::String& name, const juce::var& args)> onNativeCall;

        std::function<void (const juce::String& level, const juce::String& message)> onLog;

        std::function<void (int id, int ms)> onSetTimer;
        std::function<void (int id)> onClearTimer;

        std::function<void (const juce::String& message, const juce::String& stack)> onError;
    };

    explicit JsRuntime (Callbacks callbacks);
    ~JsRuntime();

    /** Evaluates source as a classic script. Returns false if it threw. */
    bool evaluate (const juce::String& source, const juce::String& filename);

    /** JSON-encodes message and calls the bundle's __vsreact_dispatch. */
    void dispatch (const juce::var& message);

    /** Runs pending promise jobs. Called automatically after evaluate/dispatch. */
    void pumpJobs();

private:
    struct Impl;
    std::unique_ptr<Impl> impl;

    JUCE_DECLARE_NON_COPYABLE (JsRuntime)
};

} // namespace vsreact
