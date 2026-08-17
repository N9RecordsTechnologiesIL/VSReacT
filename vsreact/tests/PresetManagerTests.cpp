#include <vsreact/vsreact.h>

// Presets are the boilerplate every shipping plugin rebuilds; these tests pin
// the parts that go quietly wrong when hand-rolled: dirty tracking that fires
// on real edits but not on the load itself, prev/next order (factory first,
// then user alphabetically), reserved factory names, and round-tripping the
// APVTS through a saved file.

namespace
{
    struct PresetTestProcessor final : public juce::AudioProcessor
    {
        PresetTestProcessor()
            : AudioProcessor (BusesProperties().withOutput ("Out", juce::AudioChannelSet::stereo(), true)),
              state (*this, nullptr, "PARAMS",
                     { std::make_unique<juce::AudioParameterFloat> (
                           "gain", "Gain", juce::NormalisableRange<float> (-60.0f, 6.0f, 0.1f), 0.0f),
                       std::make_unique<juce::AudioParameterFloat> (
                           "mix", "Mix", juce::NormalisableRange<float> (0.0f, 100.0f, 1.0f), 100.0f) })
        {}

        const juce::String getName() const override { return "PresetTest"; }
        void prepareToPlay (double, int) override {}
        void releaseResources() override {}
        void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override {}
        double getTailLengthSeconds() const override { return 0.0; }
        bool acceptsMidi() const override { return false; }
        bool producesMidi() const override { return false; }
        juce::AudioProcessorEditor* createEditor() override { return nullptr; }
        bool hasEditor() const override { return false; }
        int getNumPrograms() override { return 1; }
        int getCurrentProgram() override { return 0; }
        void setCurrentProgram (int) override {}
        const juce::String getProgramName (int) override { return {}; }
        void changeProgramName (int, const juce::String&) override {}
        void getStateInformation (juce::MemoryBlock&) override {}
        void setStateInformation (const void*, int) override {}

        juce::AudioProcessorValueTreeState state;
    };

    juce::var nameArg (const juce::String& name)
    {
        auto* object = new juce::DynamicObject();
        object->setProperty ("name", name);
        return juce::var (object);
    }
}

class PresetManagerTests final : public juce::UnitTest
{
public:
    PresetManagerTests() : juce::UnitTest ("vsreact::PresetManager") {}

    void runTest() override
    {
        PresetTestProcessor processor;

        const auto tempDir = juce::File::getSpecialLocation (juce::File::tempDirectory)
                                 .getChildFile ("vsreact-preset-tests");
        tempDir.deleteRecursively();

        vsreact::PresetManager::Options options;
        options.appName = "VSReacT Preset Tests";
        options.userDirectory = tempDir;
        options.factoryPresets = {
            { "Default", { { "gain", 0.0f }, { "mix", 100.0f } } },
            { "Quiet", { { "gain", -24.0f }, { "mix", 50.0f } } },
        };

        vsreact::PresetManager presets (processor.state, options);

        int events = 0;
        juce::var lastEvent;
        presets.setEventSink ([&] (const juce::String&, const juce::var& payload)
        {
            ++events;
            lastEvent = payload;
        });

        auto* gain = processor.state.getParameter ("gain");
        auto* mix = processor.state.getParameter ("mix");

        beginTest ("list starts with the factory presets, no current, not dirty");
        {
            const auto list = presets.handleNativeCall ("preset:list", juce::var());
            expect (list.has_value());
            expectEquals ((*list)["current"].toString(), juce::String());
            expect (! static_cast<bool> ((*list)["dirty"]));

            const auto* entries = (*list)["presets"].getArray();
            expect (entries != nullptr && entries->size() == 2);
            expectEquals ((*entries)[0]["name"].toString(), juce::String ("Default"));
            expect (static_cast<bool> ((*entries)[1]["factory"]));
        }

        beginTest ("loading a factory preset applies natural values and clears dirty");
        {
            const auto result = presets.handleNativeCall ("preset:load", nameArg ("Quiet"));
            expect (static_cast<bool> ((*result)["ok"]));
            expectEquals (presets.currentPreset(), juce::String ("Quiet"));
            expect (! presets.isDirty());

            expectWithinAbsoluteError (gain->convertFrom0to1 (gain->getValue()), -24.0f, 0.05f);
            expectWithinAbsoluteError (mix->convertFrom0to1 (mix->getValue()), 50.0f, 0.5f);
        }

        beginTest ("a real edit dirties the preset exactly once, asynchronously");
        {
            const auto before = events;
            gain->setValueNotifyingHost (gain->convertTo0to1 (-6.0f));
            gain->setValueNotifyingHost (gain->convertTo0to1 (-3.0f));
            presets.flushPendingEvents();

            expect (presets.isDirty());
            expectEquals (events, before + 1); // two tweaks, one event
            expect (static_cast<bool> (lastEvent["dirty"]));
        }

        beginTest ("save writes a user preset, clears dirty, and lists it after factory");
        {
            const auto result = presets.handleNativeCall ("preset:save", nameArg ("My Sound"));
            expect (static_cast<bool> ((*result)["ok"]));
            expect (! presets.isDirty());
            expectEquals (presets.currentPreset(), juce::String ("My Sound"));
            expect (tempDir.getChildFile ("My Sound.preset").existsAsFile());

            const auto* entries = lastEvent["presets"].getArray();
            expect (entries != nullptr && entries->size() == 3);
            expectEquals ((*entries)[2]["name"].toString(), juce::String ("My Sound"));
            expect (! static_cast<bool> ((*entries)[2]["factory"]));
        }

        beginTest ("a saved preset round-trips the APVTS through its file");
        {
            gain->setValueNotifyingHost (gain->convertTo0to1 (5.0f));
            presets.handleNativeCall ("preset:load", nameArg ("My Sound"));
            expectWithinAbsoluteError (gain->convertFrom0to1 (gain->getValue()), -3.0f, 0.05f);
            expect (! presets.isDirty());
        }

        beginTest ("factory names are reserved against saving over");
        {
            const auto result = presets.handleNativeCall ("preset:save", nameArg ("Default"));
            expect (! static_cast<bool> ((*result)["ok"]));
        }

        beginTest ("next/prev walk factory-then-user and wrap");
        {
            presets.handleNativeCall ("preset:load", nameArg ("Default"));
            presets.handleNativeCall ("preset:next", juce::var());
            expectEquals (presets.currentPreset(), juce::String ("Quiet"));
            presets.handleNativeCall ("preset:next", juce::var());
            expectEquals (presets.currentPreset(), juce::String ("My Sound"));
            presets.handleNativeCall ("preset:next", juce::var());
            expectEquals (presets.currentPreset(), juce::String ("Default")); // wrapped
            presets.handleNativeCall ("preset:prev", juce::var());
            expectEquals (presets.currentPreset(), juce::String ("My Sound")); // wrapped back
        }

        beginTest ("delete removes user presets only");
        {
            expect (! static_cast<bool> ((*presets.handleNativeCall ("preset:delete", nameArg ("Default")))["ok"]));
            expect (static_cast<bool> ((*presets.handleNativeCall ("preset:delete", nameArg ("My Sound")))["ok"]));
            expect (! tempDir.getChildFile ("My Sound.preset").existsAsFile());
            expectEquals (presets.currentPreset(), juce::String()); // it was current
        }

        beginTest ("preset names are sanitised for the filesystem");
        {
            const auto result = presets.handleNativeCall ("preset:save", nameArg ("../..\\evil: name?"));
            expect (static_cast<bool> ((*result)["ok"]));
            // Whatever the legal name became, it must live inside the dir.
            expect (tempDir.getNumberOfChildFiles (juce::File::findFiles, "*.preset") == 1);
        }

        tempDir.deleteRecursively();
    }
};

static PresetManagerTests presetManagerTests;
