// The smallest real VSReacT plugin: gain + pan, UI entirely in React,
// parameters bound through vsreact::ParameterBridge.

#include <juce_audio_utils/juce_audio_utils.h>
#include <vsreact/vsreact.h>

class GainProcessor final : public juce::AudioProcessor
{
public:
    GainProcessor()
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

        // Constant-power pan.
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

    const juce::String getName() const override { return "VSReacT Gain"; }
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
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (GainProcessor)
};

//==============================================================================
class GainEditor final : public juce::AudioProcessorEditor
{
public:
    explicit GainEditor (GainProcessor& p)
        : AudioProcessorEditor (&p),
          bridge (p.state)
    {
        vsreact::RootOptions options;
        options.bundleFile = juce::File (juce::String (GAIN_EXAMPLE_BUNDLE_PATH));
        options.watchForChanges = true;
        options.onNativeCall = [this] (const juce::String& name, const juce::var& args) -> juce::var
        {
            if (auto handled = bridge.handleNativeCall (name, args))
                return *handled;

            return {};
        };

        root = std::make_unique<vsreact::RootView> (std::move (options));
        bridge.attach (*root);
        addAndMakeVisible (*root);
        setSize (768, 512); // PlainGain plate aspect (1536×1024 ÷ 2)
    }

    void resized() override
    {
        root->setBounds (getLocalBounds());
    }

private:
    vsreact::ParameterBridge bridge;
    std::unique_ptr<vsreact::RootView> root;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (GainEditor)
};

juce::AudioProcessorEditor* GainProcessor::createEditor()
{
    return new GainEditor (*this);
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new GainProcessor();
}
