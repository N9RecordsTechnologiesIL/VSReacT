#include "PostHogBridge.h"

namespace vsreact
{

PostHogBridge::PostHogBridge (Options optionsIn)
    : juce::Thread ("vsreact posthog"),
      options (std::move (optionsIn))
{
    distinctId = loadOrCreateDistinctId();

    send = [] (const juce::String& url, const juce::String& body) -> bool
    {
        const auto stream = juce::URL (url)
                                .withPOSTData (body)
                                .createInputStream (
                                    juce::URL::InputStreamOptions (juce::URL::ParameterHandling::inPostData)
                                        .withExtraHeaders ("Content-Type: application/json")
                                        .withConnectionTimeoutMs (10000));

        if (stream == nullptr)
            return false;

        stream->readEntireStreamAsString(); // drain the response
        return true;
    };

    startThread();
}

PostHogBridge::~PostHogBridge()
{
    signalThreadShouldExit();
    notify();
    stopThread (4000);
}

juce::String PostHogBridge::loadOrCreateDistinctId() const
{
    if (options.stateFile != juce::File())
    {
        const auto existing = options.stateFile.loadFileAsString().trim();

        if (existing.isNotEmpty())
            return existing;

        const auto fresh = juce::Uuid().toString();
        options.stateFile.getParentDirectory().createDirectory();
        options.stateFile.replaceWithText (fresh);
        return fresh;
    }

    return juce::Uuid().toString();
}

std::optional<juce::var> PostHogBridge::handleNativeCall (const juce::String& name,
                                                          const juce::var& args)
{
    if (! name.startsWith ("posthog:"))
        return std::nullopt;

    if (name == "posthog:config")
    {
        auto* result = new juce::DynamicObject();
        result->setProperty ("distinctId", distinctId);
        result->setProperty ("host", options.host);
        return juce::var (result);
    }

    if (name == "posthog:send")
    {
        if (auto* batch = args["batch"].getArray())
        {
            {
                const juce::ScopedLock lock (queueLock);

                for (const auto& event : *batch)
                    queuedEvents.add (event);
            }

            notify();
        }

        return juce::var (true);
    }

    return std::nullopt;
}

void PostHogBridge::setTransport (std::function<bool (const juce::String&, const juce::String&)> transport)
{
    send = std::move (transport);
}

void PostHogBridge::flushSynchronously()
{
    postBatches();
}

bool PostHogBridge::postBatches()
{
    juce::Array<juce::var> batch;

    {
        const juce::ScopedLock lock (queueLock);
        batch.swapWith (queuedEvents);
    }

    if (batch.isEmpty() || options.apiKey.isEmpty())
        return true;

    auto* payload = new juce::DynamicObject();
    payload->setProperty ("api_key", options.apiKey);
    payload->setProperty ("batch", batch);

    const auto ok = send (options.host + "/batch/",
                          juce::JSON::toString (juce::var (payload), true));

    if (! ok)
        juce::Logger::writeToLog ("[vsreact] posthog batch failed (" + juce::String (batch.size())
                                  + " events dropped)");

    return ok;
}

void PostHogBridge::run()
{
    while (! threadShouldExit())
    {
        wait (-1);

        if (threadShouldExit())
            break;

        postBatches();
    }

    postBatches(); // final drain on shutdown
}

} // namespace vsreact
