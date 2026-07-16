#pragma once

#include "RootView.h"

#include <juce_audio_processors/juce_audio_processors.h>

#include <optional>

namespace vsreact
{

/** Two-way binding between an AudioProcessorValueTreeState and the JS app.

    Plugin wiring:
      - chain handleNativeCall() first inside RootOptions::onNativeCall
      - attach() the RootView so host/DAW parameter changes push "param"
        events to JS listeners (the useParameter hook).

    JS protocol (all values normalized 0..1):
      call  param:get {id}          -> {value, text, name, label}
      call  param:set {id, value}      (wrap in param:begin/param:end for
      call  param:begin {id}            automation-safe gestures)
      call  param:end {id}
      event param {id, value, text}
*/
class ParameterBridge : private juce::AudioProcessorValueTreeState::Listener,
                        private juce::AsyncUpdater
{
public:
    explicit ParameterBridge (juce::AudioProcessorValueTreeState& state);
    ~ParameterBridge() override;

    void attach (RootView& root);

    /** Returns nullopt when the call isn't a param:* call. */
    std::optional<juce::var> handleNativeCall (const juce::String& name, const juce::var& args);

    /** Test hook: replaces the event destination. */
    void setEventSink (std::function<void (const juce::String&, const juce::var&)> sink);

    /** Test hook: delivers pending change events synchronously. */
    void flushPendingEvents() { handleUpdateNowIfNeeded(); }

private:
    void parameterChanged (const juce::String& parameterID, float newValue) override;
    void handleAsyncUpdate() override;

    juce::AudioProcessorValueTreeState& apvts;
    juce::StringArray parameterIds;
    std::function<void (const juce::String&, const juce::var&)> sendEvent;

    juce::CriticalSection dirtyLock;
    juce::StringArray dirtyIds;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (ParameterBridge)
};

} // namespace vsreact
