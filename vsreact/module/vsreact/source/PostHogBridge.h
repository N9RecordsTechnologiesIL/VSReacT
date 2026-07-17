#pragma once

#include <juce_core/juce_core.h>

#include <functional>
#include <optional>

namespace vsreact
{

/** The native half of @vsreact/posthog: receives event batches from the
    JS client and posts them to PostHog over HTTPS on a background thread
    (QuickJS has no network — C++ owns delivery).

    Plugin wiring (chain like ParameterBridge):

      vsreact::PostHogBridge::Options analytics;
      analytics.apiKey = "phc_...";
      analytics.host = "https://eu.i.posthog.com";           // or us
      analytics.stateFile = appData.getChildFile ("ph.txt"); // persistent id
      posthog = std::make_unique<vsreact::PostHogBridge> (analytics);

      options.onNativeCall = [this] (const juce::String& name, const juce::var& args) -> juce::var
      {
          if (auto handled = posthog->handleNativeCall (name, args)) return *handled;
          if (auto handled = bridge.handleNativeCall (name, args))   return *handled;
          return {};
      };

    JS protocol:
      call posthog:config {}       -> {distinctId, host}
      call posthog:send  {batch:[…]} -> queued; posted as {api_key, batch}
                                        to host + "/batch/" off-thread
*/
class PostHogBridge : private juce::Thread
{
public:
    struct Options
    {
        juce::String apiKey;
        juce::String host { "https://us.i.posthog.com" };

        /** Where the anonymous distinct id persists across sessions.
            Empty = a fresh id per plugin instance. */
        juce::File stateFile;
    };

    explicit PostHogBridge (Options options);
    ~PostHogBridge() override;

    /** Returns nullopt when the call isn't a posthog:* call. */
    std::optional<juce::var> handleNativeCall (const juce::String& name, const juce::var& args);

    const juce::String& getDistinctId() const noexcept { return distinctId; }

    /** Test hook: replaces the HTTPS POST. Receives (url, jsonBody). */
    void setTransport (std::function<bool (const juce::String&, const juce::String&)> transport);

    /** Test hook: drains the queue on the calling thread. */
    void flushSynchronously();

private:
    void run() override;
    bool postBatches();
    juce::String loadOrCreateDistinctId() const;

    Options options;
    juce::String distinctId;
    std::function<bool (const juce::String&, const juce::String&)> send;

    juce::CriticalSection queueLock;
    juce::Array<juce::var> queuedEvents;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (PostHogBridge)
};

} // namespace vsreact
