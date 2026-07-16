#pragma once

#include <juce_gui_basics/juce_gui_basics.h>

#include <functional>
#include <map>
#include <memory>

namespace vsreact
{

/** Factories for the <NativeView nativeId="..."/> escape hatch. The plugin
    registers real juce::Components here; the React layout positions them. */
class NativeRegistry
{
public:
    using Factory = std::function<std::unique_ptr<juce::Component>()>;

    void registerFactory (const juce::String& id, Factory factory)
    {
        factories[id] = std::move (factory);
    }

    std::unique_ptr<juce::Component> create (const juce::String& id) const
    {
        const auto it = factories.find (id);
        return it != factories.end() ? it->second() : nullptr;
    }

private:
    std::map<juce::String, Factory> factories;
};

} // namespace vsreact
