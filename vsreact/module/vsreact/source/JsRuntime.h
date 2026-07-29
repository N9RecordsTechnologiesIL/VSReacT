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
    /** A view onto C++-owned pixel memory handed to JS as an ArrayBuffer.
        The JSON bridge can't carry per-frame pixel data, so canvas nodes get
        this binary channel instead — JS writes straight into painter memory. */
    struct CanvasBuffer { juce::uint8* data = nullptr; size_t size = 0; };

    struct Callbacks
    {
        /** JS called __vsreact_flush(opsJson) — a mutation batch. */
        std::function<void (const juce::String& opsJson)> onFlush;

        /** JS called __vsreact_nativeCall(name, argsJson); the returned var is
            JSON-encoded back to JS synchronously. */
        std::function<juce::var (const juce::String& name, const juce::var& args)> onNativeCall;

        /** JS called __vsreact_registerFont(family, src, weight) — src is a
            file path or a base64 `data:` URI. */
        std::function<void (const juce::String& family, const juce::String& src, int weight)> onRegisterFont;

        /** JS called __vsreact_canvasBuffer(nodeId, w, h) — return the node's
            RGBA buffer for JS to alias as an ArrayBuffer (no copy). */
        std::function<CanvasBuffer (int nodeId, int width, int height)> onCanvasBuffer;

        /** JS called __vsreact_canvasCommit(nodeId) — pixels are ready. */
        std::function<void (int nodeId)> onCanvasCommit;

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
