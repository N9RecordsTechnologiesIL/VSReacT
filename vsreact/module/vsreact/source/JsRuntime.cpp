#include "JsRuntime.h"

#include <quickjs.h>

namespace vsreact
{

struct JsRuntime::Impl
{
    Callbacks cbs;
    JSRuntime* rt = nullptr;
    JSContext* ctx = nullptr;

    explicit Impl (Callbacks c) : cbs (std::move (c))
    {
        rt = JS_NewRuntime();
        ctx = JS_NewContext (rt);
        JS_SetContextOpaque (ctx, this);
        JS_SetHostPromiseRejectionTracker (rt, promiseRejectionTracker, this);
        registerGlobals();
    }

    ~Impl()
    {
        JS_FreeContext (ctx);
        JS_FreeRuntime (rt);
    }

    static Impl& self (JSContext* c)
    {
        return *static_cast<Impl*> (JS_GetContextOpaque (c));
    }

    static juce::String toString (JSContext* c, JSValue v)
    {
        const char* s = JS_ToCString (c, v);
        juce::String result { juce::CharPointer_UTF8 (s != nullptr ? s : "") };

        if (s != nullptr)
            JS_FreeCString (c, s);

        return result;
    }

    void reportError (const juce::String& message, const juce::String& stack)
    {
        if (cbs.onError != nullptr)
            cbs.onError (message, stack);
    }

    void reportPendingException()
    {
        JSValue exc = JS_GetException (ctx);
        const auto message = toString (ctx, exc);

        juce::String stack;
        JSValue stackVal = JS_GetPropertyStr (ctx, exc, "stack");

        if (! JS_IsUndefined (stackVal) && ! JS_IsException (stackVal))
            stack = toString (ctx, stackVal);

        JS_FreeValue (ctx, stackVal);
        JS_FreeValue (ctx, exc);

        reportError (message, stack);
    }

    static void promiseRejectionTracker (JSContext* c, JSValue,
                                         JSValue reason, bool isHandled, void*)
    {
        if (isHandled)
            return;

        auto& impl = self (c);

        juce::String stack;
        JSValue stackVal = JS_GetPropertyStr (c, reason, "stack");

        if (! JS_IsUndefined (stackVal) && ! JS_IsException (stackVal))
            stack = toString (c, stackVal);

        JS_FreeValue (c, stackVal);

        impl.reportError ("Unhandled promise rejection: " + toString (c, reason), stack);
    }

    //==============================================================================
    static JSValue jsFlush (JSContext* c, JSValue, int argc, JSValue* argv)
    {
        auto& impl = self (c);

        if (argc >= 1 && impl.cbs.onFlush != nullptr)
            impl.cbs.onFlush (toString (c, argv[0]));

        return JS_UNDEFINED;
    }

    static JSValue jsNativeCall (JSContext* c, JSValue, int argc, JSValue* argv)
    {
        auto& impl = self (c);
        juce::var result;

        if (argc >= 1 && impl.cbs.onNativeCall != nullptr)
        {
            const auto name = toString (c, argv[0]);
            const auto args = argc >= 2 ? juce::JSON::parse (toString (c, argv[1]))
                                        : juce::var();
            result = impl.cbs.onNativeCall (name, args);
        }

        const auto json = juce::JSON::toString (result, true);
        return JS_NewString (c, json.toRawUTF8());
    }

    static JSValue jsRegisterFont (JSContext* c, JSValue, int argc, JSValue* argv)
    {
        auto& impl = self (c);

        if (argc >= 3 && impl.cbs.onRegisterFont != nullptr)
        {
            int32_t weight = 400;
            JS_ToInt32 (c, &weight, argv[2]);
            impl.cbs.onRegisterFont (toString (c, argv[0]), toString (c, argv[1]), weight);
        }

        return JS_UNDEFINED;
    }

    static JSValue jsLog (JSContext* c, JSValue, int argc, JSValue* argv)
    {
        auto& impl = self (c);

        if (argc >= 2 && impl.cbs.onLog != nullptr)
            impl.cbs.onLog (toString (c, argv[0]), toString (c, argv[1]));

        return JS_UNDEFINED;
    }

    static JSValue jsSetTimer (JSContext* c, JSValue, int argc, JSValue* argv)
    {
        auto& impl = self (c);

        if (argc >= 2 && impl.cbs.onSetTimer != nullptr)
        {
            int32_t id = 0, ms = 0;
            JS_ToInt32 (c, &id, argv[0]);
            JS_ToInt32 (c, &ms, argv[1]);
            impl.cbs.onSetTimer (id, ms);
        }

        return JS_UNDEFINED;
    }

    static JSValue jsClearTimer (JSContext* c, JSValue, int argc, JSValue* argv)
    {
        auto& impl = self (c);

        if (argc >= 1 && impl.cbs.onClearTimer != nullptr)
        {
            int32_t id = 0;
            JS_ToInt32 (c, &id, argv[0]);
            impl.cbs.onClearTimer (id);
        }

        return JS_UNDEFINED;
    }

    void registerGlobals()
    {
        JSValue global = JS_GetGlobalObject (ctx);

        const auto reg = [&] (const char* name, JSCFunction* fn, int numArgs)
        {
            JS_SetPropertyStr (ctx, global, name, JS_NewCFunction (ctx, fn, name, numArgs));
        };

        reg ("__vsreact_flush", jsFlush, 1);
        reg ("__vsreact_nativeCall", jsNativeCall, 2);
        reg ("__vsreact_registerFont", jsRegisterFont, 3);
        reg ("__vsreact_log", jsLog, 2);
        reg ("__vsreact_setTimer", jsSetTimer, 2);
        reg ("__vsreact_clearTimer", jsClearTimer, 1);

        JS_FreeValue (ctx, global);
    }
};

//==============================================================================
JsRuntime::JsRuntime (Callbacks callbacks)
    : impl (std::make_unique<Impl> (std::move (callbacks)))
{
    JUCE_ASSERT_MESSAGE_THREAD
}

JsRuntime::~JsRuntime() = default;

bool JsRuntime::evaluate (const juce::String& source, const juce::String& filename)
{
    JUCE_ASSERT_MESSAGE_THREAD

    auto* ctx = impl->ctx;
    JSValue result = JS_Eval (ctx,
                              source.toRawUTF8(),
                              source.getNumBytesAsUTF8(),
                              filename.toRawUTF8(),
                              JS_EVAL_TYPE_GLOBAL);

    const bool ok = ! JS_IsException (result);

    if (! ok)
        impl->reportPendingException();

    JS_FreeValue (ctx, result);
    pumpJobs();
    return ok;
}

void JsRuntime::dispatch (const juce::var& message)
{
    JUCE_ASSERT_MESSAGE_THREAD

    auto* ctx = impl->ctx;
    const auto json = juce::JSON::toString (message, true);

    JSValue global = JS_GetGlobalObject (ctx);
    JSValue fn = JS_GetPropertyStr (ctx, global, "__vsreact_dispatch");

    if (JS_IsFunction (ctx, fn))
    {
        JSValue arg = JS_NewString (ctx, json.toRawUTF8());
        JSValue result = JS_Call (ctx, fn, JS_UNDEFINED, 1, &arg);

        if (JS_IsException (result))
            impl->reportPendingException();

        JS_FreeValue (ctx, result);
        JS_FreeValue (ctx, arg);
    }

    JS_FreeValue (ctx, fn);
    JS_FreeValue (ctx, global);
    pumpJobs();
}

void JsRuntime::pumpJobs()
{
    for (;;)
    {
        JSContext* jobCtx = nullptr;
        const int r = JS_ExecutePendingJob (impl->rt, &jobCtx);

        if (r == 0)
            break;

        if (r < 0)
        {
            impl->reportPendingException();
            break;
        }
    }
}

} // namespace vsreact
