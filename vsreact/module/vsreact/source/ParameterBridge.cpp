#include "ParameterBridge.h"

namespace vsreact
{

ParameterBridge::ParameterBridge (juce::AudioProcessorValueTreeState& state)
    : apvts (state)
{
    for (auto* parameter : apvts.processor.getParameters())
        if (auto* ranged = dynamic_cast<juce::RangedAudioParameter*> (parameter))
            if (ranged->getParameterID().isNotEmpty())
                parameterIds.add (ranged->getParameterID());

    for (const auto& id : parameterIds)
        apvts.addParameterListener (id, this);
}

ParameterBridge::~ParameterBridge()
{
    cancelPendingUpdate();

    for (const auto& id : parameterIds)
        apvts.removeParameterListener (id, this);
}

void ParameterBridge::attach (RootView& root)
{
    sendEvent = [&root] (const juce::String& name, const juce::var& payload)
    {
        root.sendNativeEvent (name, payload);
    };
}

void ParameterBridge::setEventSink (std::function<void (const juce::String&, const juce::var&)> sink)
{
    sendEvent = std::move (sink);
}

std::optional<juce::var> ParameterBridge::handleNativeCall (const juce::String& name,
                                                            const juce::var& args)
{
    if (! name.startsWith ("param:"))
        return std::nullopt;

    if (name == "param:list")
    {
        juce::Array<juce::var> list;

        for (const auto& id : parameterIds)
            if (auto* parameter = apvts.getParameter (id))
            {
                auto* entry = new juce::DynamicObject();
                entry->setProperty ("id", id);
                entry->setProperty ("name", parameter->getName (64));
                entry->setProperty ("label", parameter->getLabel());
                entry->setProperty ("value", parameter->getValue());
                entry->setProperty ("text", parameter->getCurrentValueAsText());
                list.add (juce::var (entry));
            }

        return juce::var (list);
    }

    auto* parameter = apvts.getParameter (args["id"].toString());

    if (parameter == nullptr)
        return juce::var();

    if (name == "param:get")
    {
        auto* result = new juce::DynamicObject();
        result->setProperty ("value", parameter->getValue());
        result->setProperty ("text", parameter->getCurrentValueAsText());
        result->setProperty ("name", parameter->getName (64));
        result->setProperty ("label", parameter->getLabel());
        return juce::var (result);
    }

    if (name == "param:set")
    {
        const auto value = juce::jlimit (0.0f, 1.0f,
                                         static_cast<float> (static_cast<double> (args["value"])));
        parameter->setValueNotifyingHost (value);
        return juce::var();
    }

    if (name == "param:begin")
    {
        parameter->beginChangeGesture();
        return juce::var();
    }

    if (name == "param:end")
    {
        parameter->endChangeGesture();
        return juce::var();
    }

    return std::nullopt;
}

void ParameterBridge::parameterChanged (const juce::String& parameterID, float)
{
    {
        const juce::ScopedLock lock (dirtyLock);
        dirtyIds.addIfNotAlreadyThere (parameterID);
    }

    triggerAsyncUpdate();
}

void ParameterBridge::handleAsyncUpdate()
{
    juce::StringArray changed;

    {
        const juce::ScopedLock lock (dirtyLock);
        changed.swapWith (dirtyIds);
    }

    if (sendEvent == nullptr)
        return;

    for (const auto& id : changed)
    {
        if (auto* parameter = apvts.getParameter (id))
        {
            auto* payload = new juce::DynamicObject();
            payload->setProperty ("id", id);
            payload->setProperty ("value", parameter->getValue());
            payload->setProperty ("text", parameter->getCurrentValueAsText());
            sendEvent ("param", juce::var (payload));
        }
    }
}

} // namespace vsreact
