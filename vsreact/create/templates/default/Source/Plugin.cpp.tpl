// {{PRODUCT_NAME}} — gain + pan starter. The whole UI lives in
// ui/src/main.tsx; parameters bind through vsreact::ParameterBridge.

#include <juce_audio_utils/juce_audio_utils.h>
#include <vsreact/vsreact.h>

#include "BinaryData.h"

class {{TARGET}}Processor final : public juce::AudioProcessor
{
public:
    {{TARGET}}Processor()
        : AudioProcessor (BusesProperties()
                              .withInput ("Input", juce::AudioChannelSet::stereo(), true)
                              .withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
          state (*this, nullptr, "PARAMS", createLayout())
    {}

    static juce::AudioProcessorValueTreeState::ParameterLayout createLayout()
    {
        juce::AudioProcessorValueTreeState::ParameterLayout layout;

        layout.add (std::make_unique<juce::AudioParameterFloat> (
            "gain", "Gain",
            juce::NormalisableRange<float> (-60.0f, 6.0f, 0.1f), 0.0f,
            juce::AudioParameterFloatAttributes().withLabel ("dB")));

        layout.add (std::make_unique<juce::AudioParameterFloat> (
            "pan", "Pan",
            juce::NormalisableRange<float> (-1.0f, 1.0f, 0.01f), 0.0f));

        return layout;
    }

    void prepareToPlay (double, int) override {}
    void releaseResources() override {}

    bool isBusesLayoutSupported (const BusesLayout& layouts) const override
    {
        return layouts.getMainOutputChannelSet() == juce::AudioChannelSet::stereo()
            && layouts.getMainInputChannelSet() == juce::AudioChannelSet::stereo();
    }

    void processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer&) override
    {
        juce::ScopedNoDenormals noDenormals;

        const auto gainDb = state.getRawParameterValue ("gain")->load();
        const auto pan = state.getRawParameterValue ("pan")->load();
        const auto gain = juce::Decibels::decibelsToGain (gainDb, -60.0f);

        const auto angle = (pan + 1.0f) * juce::MathConstants<float>::pi * 0.25f;
        const auto leftGain = gain * std::cos (angle) * juce::MathConstants<float>::sqrt2;
        const auto rightGain = gain * std::sin (angle) * juce::MathConstants<float>::sqrt2;

        if (buffer.getNumChannels() >= 2)
        {
            buffer.applyGain (0, 0, buffer.getNumSamples(), leftGain);
            buffer.applyGain (1, 0, buffer.getNumSamples(), rightGain);
        }
        else
        {
            buffer.applyGain (gain);
        }
    }

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "{{PRODUCT_NAME}}"; }
    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }
    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram (int) override {}
    const juce::String getProgramName (int) override { return {}; }
    void changeProgramName (int, const juce::String&) override {}

    void getStateInformation (juce::MemoryBlock& destData) override
    {
        if (auto xml = state.copyState().createXml())
            copyXmlToBinary (*xml, destData);
    }

    void setStateInformation (const void* data, int sizeInBytes) override
    {
        if (auto xml = getXmlFromBinary (data, sizeInBytes))
            state.replaceState (juce::ValueTree::fromXml (*xml));
    }

    juce::AudioProcessorValueTreeState state;

private:
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR ({{TARGET}}Processor)
};

//==============================================================================
class {{TARGET}}Editor final : public juce::AudioProcessorEditor
{
public:
    explicit {{TARGET}}Editor ({{TARGET}}Processor& p)
        : AudioProcessorEditor (&p),
          bridge (p.state)
    {
{{#IF_POSTHOG}}
        // PostHog analytics — put YOUR project's API key here (PostHog →
        // Settings → Project). It's a client-side ingestion token, but
        // it's yours: never commit someone else's, and think twice
        // before committing your own to a public repo.
        vsreact::PostHogBridge::Options analytics;
        analytics.apiKey = "phc_YOUR_PROJECT_API_KEY";
        analytics.host = "https://us.i.posthog.com"; // or https://eu.i.posthog.com
        analytics.stateFile = juce::File::getSpecialLocation (juce::File::userApplicationDataDirectory)
                                  .getChildFile ("{{TARGET}}").getChildFile ("posthog-id.txt");
        posthog = std::make_unique<vsreact::PostHogBridge> (analytics);

{{/IF_POSTHOG}}
        vsreact::RootOptions options;

#if {{TARGET_UPPER}}_DEV
        // Dev: load the bundle from disk and hot-reload on save.
        options.bundleFile = juce::File (juce::String ({{TARGET_UPPER}}_UI_BUNDLE_PATH));
        options.watchForChanges = true;
#else
        // Ship: the bundle is compiled in — works on any machine.
        options.bundleSource = juce::String::fromUTF8 (BinaryData::main_js,
                                                       BinaryData::main_jsSize);
#endif
        options.onNativeCall = [this] (const juce::String& name, const juce::var& args) -> juce::var
        {
{{#IF_POSTHOG}}
            if (auto handled = posthog->handleNativeCall (name, args))
                return *handled;

{{/IF_POSTHOG}}
            if (auto handled = bridge.handleNativeCall (name, args))
                return *handled;

            return {};
        };

        root = std::make_unique<vsreact::RootView> (std::move (options));
        bridge.attach (*root);
        addAndMakeVisible (*root);
        setSize (420, 290);
    }

    void resized() override
    {
        root->setBounds (getLocalBounds());
    }

private:
    vsreact::ParameterBridge bridge;
{{#IF_POSTHOG}}
    std::unique_ptr<vsreact::PostHogBridge> posthog;
{{/IF_POSTHOG}}
    std::unique_ptr<vsreact::RootView> root;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR ({{TARGET}}Editor)
};

juce::AudioProcessorEditor* {{TARGET}}Processor::createEditor()
{
    return new {{TARGET}}Editor (*this);
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new {{TARGET}}Processor();
}
