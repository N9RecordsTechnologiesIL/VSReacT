#pragma once

#include "RootView.h"

#include <juce_audio_processors/juce_audio_processors.h>

#include <optional>
#include <vector>

namespace vsreact
{

/** Presets for an AudioProcessorValueTreeState, exposed to the JS app —
    the boilerplate every shipping plugin rebuilds, done once.

    Two kinds of preset:
      - Factory presets: named parameter values (in each parameter's natural
        units) compiled into the plugin. Read-only from the UI.
      - User presets: full APVTS snapshots saved as XML files in a per-user
        directory (defaults to userApplicationDataDirectory/<appName>/Presets).

    Plugin wiring, mirroring ParameterBridge:
      - chain handleNativeCall() inside RootOptions::onNativeCall
      - attach() the RootView so preset changes and the dirty flag push
        "preset" events to JS (the usePresets hook / <PresetBrowser>).

    JS protocol:
      call  preset:list {}          -> {current, dirty, presets: [{name, factory}]}
      call  preset:load {name}      -> {ok}
      call  preset:save {name}      -> {ok}   (user preset; overwrites)
      call  preset:delete {name}    -> {ok}   (user presets only)
      call  preset:next {} / preset:prev {}   (wraps around the list)
      event preset {current, dirty, presets}  (after load/save/delete, and
                                               when a tweak first dirties
                                               the loaded preset)

    Dirty means "a parameter moved since the last load or save". It's
    tracked from parameter listeners (audio-thread safe, delivered async),
    so the UI's asterisk appears without polling. */
class PresetManager : private juce::AudioProcessorValueTreeState::Listener,
                      private juce::AsyncUpdater
{
public:
    struct FactoryPreset
    {
        juce::String name;
        /** Parameter values in NATURAL units (the ranges the APVTS declares —
            dB, Hz, ratios), keyed by parameter ID. Parameters absent from the
            map keep their current value. */
        std::vector<std::pair<juce::String, float>> values;
    };

    struct Options
    {
        /** Names the per-user preset directory. Required. */
        juce::String appName;
        std::vector<FactoryPreset> factoryPresets;
        /** Override the storage directory (tests use a temp dir). Empty =
            userApplicationDataDirectory/<appName>/Presets. */
        juce::File userDirectory;
    };

    PresetManager (juce::AudioProcessorValueTreeState& state, Options options);
    ~PresetManager() override;

    void attach (RootView& root);

    /** Returns nullopt when the call isn't a preset:* call. */
    std::optional<juce::var> handleNativeCall (const juce::String& name, const juce::var& args);

    /** The current preset name ("" when none) and whether it's been edited
        since load/save — put them in getStateInformation if you want the
        selection to survive a session reload. */
    juce::String currentPreset() const { return current; }
    bool isDirty() const { return dirty; }

    /** Test hooks, same shape as ParameterBridge's. */
    void setEventSink (std::function<void (const juce::String&, const juce::var&)> sink);
    void flushPendingEvents() { handleUpdateNowIfNeeded(); }

private:
    void parameterChanged (const juce::String& parameterID, float newValue) override;
    void handleAsyncUpdate() override;

    juce::var snapshotList() const;
    juce::var stateEvent() const;
    void emitState();
    juce::StringArray orderedNames() const;
    bool loadByName (const juce::String& name);
    juce::File fileFor (const juce::String& name) const;

    juce::AudioProcessorValueTreeState& apvts;
    Options options;
    juce::File directory;
    juce::StringArray parameterIds;

    juce::String current;
    bool dirty = false;
    /** Loading writes parameters, which fires the listeners; this window
        keeps those self-inflicted changes from marking the preset dirty. */
    bool applyingPreset = false;

    std::function<void (const juce::String&, const juce::var&)> sendEvent;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (PresetManager)
};

} // namespace vsreact
