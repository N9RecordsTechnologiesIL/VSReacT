// VSReacT example: a feed-forward peak compressor.
//
// This one started as `create-vsreact compressor` and grew — so it also shows
// what the scaffold turns into. Unlike the other examples there is no
// reference art: the whole panel is the SDK's stock components, themed.
//
// The interesting seam is the transfer curve. The soft-knee gain computer
// below is mirrored, formula for formula, in ui/src/compressor.ts — the UI
// draws the same curve the audio thread is applying, from the same parameter
// values, without either side reporting curve points to the other. Only the
// three live meter values cross the bridge, at 30Hz.

#include <juce_audio_utils/juce_audio_utils.h>
#include <vsreact/vsreact.h>

#include <atomic>
#include <cmath>

namespace
{
/** Output level in dB for an input level in dB, per the classic soft-knee
    gain computer (Reiss & McPherson, "Audio Effects", fig. 6.6). Ratio is
    :1, knee is the total width in dB centred on the threshold — so a knee of
    12 starts bending 6dB below it.

    The twin of `outputDb` in ui/src/compressor.ts. Keep them in step. */
float computeOutputDb (float inputDb, float thresholdDb, float ratio, float kneeDb) noexcept
{
    const auto over = inputDb - thresholdDb;

    if (kneeDb > 0.0f && 2.0f * std::abs (over) <= kneeDb)
    {
        const auto bend = over + kneeDb * 0.5f;
        return inputDb + (1.0f / ratio - 1.0f) * bend * bend / (2.0f * kneeDb);
    }

    return 2.0f * over > kneeDb ? thresholdDb + over / ratio : inputDb;
}

/** One-pole smoothing coefficient for a time constant in milliseconds. */
float coefficientFor (float milliseconds, double sampleRate) noexcept
{
    if (milliseconds <= 0.0f)
        return 1.0f;

    return 1.0f - std::exp (-1.0f / (static_cast<float> (sampleRate) * milliseconds * 0.001f));
}
} // namespace

class CompressorProcessor final : public juce::AudioProcessor
{
public:
    CompressorProcessor()
        : AudioProcessor (BusesProperties()
                              .withInput ("Input", juce::AudioChannelSet::stereo(), true)
                              .withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
          state (*this, nullptr, "PARAMS", createLayout())
    {}

    static juce::AudioProcessorValueTreeState::ParameterLayout createLayout()
    {
        using Range = juce::NormalisableRange<float>;
        using Attributes = juce::AudioParameterFloatAttributes;

        // Every range here reaches the UI over the bridge as param:list
        // metadata, so nothing in TypeScript restates a minimum, a maximum or
        // a skew. Change a number and the knob follows.
        const auto dbText = [] (float value, int) { return juce::String (value, 1) + " dB"; };

        juce::AudioProcessorValueTreeState::ParameterLayout layout;

        layout.add (std::make_unique<juce::AudioParameterFloat> (
            "threshold", "Threshold", Range (-60.0f, 0.0f, 0.1f), -18.0f,
            Attributes().withLabel ("dB").withStringFromValueFunction (dbText)));

        layout.add (std::make_unique<juce::AudioParameterFloat> (
            "ratio", "Ratio", Range (1.0f, 20.0f, 0.1f, 0.4f), 4.0f,
            Attributes().withStringFromValueFunction (
                [] (float value, int) { return juce::String (value, 1) + ":1"; })));

        layout.add (std::make_unique<juce::AudioParameterFloat> (
            "attack", "Attack", Range (0.1f, 100.0f, 0.01f, 0.35f), 8.0f,
            Attributes().withLabel ("ms").withStringFromValueFunction (
                [] (float value, int) { return juce::String (value, value < 10.0f ? 2 : 1) + " ms"; })));

        layout.add (std::make_unique<juce::AudioParameterFloat> (
            "release", "Release", Range (10.0f, 1000.0f, 1.0f, 0.4f), 140.0f,
            Attributes().withLabel ("ms").withStringFromValueFunction (
                [] (float value, int) { return juce::String (juce::roundToInt (value)) + " ms"; })));

        layout.add (std::make_unique<juce::AudioParameterFloat> (
            "knee", "Knee", Range (0.0f, 24.0f, 0.1f), 6.0f,
            Attributes().withLabel ("dB").withStringFromValueFunction (dbText)));

        layout.add (std::make_unique<juce::AudioParameterFloat> (
            "makeup", "Makeup", Range (-12.0f, 24.0f, 0.1f), 0.0f,
            Attributes().withLabel ("dB").withStringFromValueFunction (dbText)));

        layout.add (std::make_unique<juce::AudioParameterFloat> (
            "mix", "Mix", Range (0.0f, 100.0f, 0.1f), 100.0f,
            Attributes().withLabel ("%").withStringFromValueFunction (
                [] (float value, int) { return juce::String (juce::roundToInt (value)) + "%"; })));

        return layout;
    }

    void prepareToPlay (double newSampleRate, int) override
    {
        sampleRate = newSampleRate;
        envelopeDb = 0.0f;
        inputPeak = outputPeak = 0.0f;
    }

    void releaseResources() override {}

    bool isBusesLayoutSupported (const BusesLayout& layouts) const override
    {
        return layouts.getMainOutputChannelSet() == juce::AudioChannelSet::stereo()
            && layouts.getMainInputChannelSet() == juce::AudioChannelSet::stereo();
    }

    void processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer&) override
    {
        juce::ScopedNoDenormals noDenormals;

        const auto threshold = state.getRawParameterValue ("threshold")->load();
        const auto ratio = state.getRawParameterValue ("ratio")->load();
        const auto knee = state.getRawParameterValue ("knee")->load();
        const auto makeup = juce::Decibels::decibelsToGain (state.getRawParameterValue ("makeup")->load());
        const auto mix = state.getRawParameterValue ("mix")->load() * 0.01f;

        const auto attackCoeff = coefficientFor (state.getRawParameterValue ("attack")->load(), sampleRate);
        const auto releaseCoeff = coefficientFor (state.getRawParameterValue ("release")->load(), sampleRate);

        const auto numSamples = buffer.getNumSamples();
        const auto numChannels = juce::jmin (2, buffer.getNumChannels());

        auto blockInputPeak = 0.0f;
        auto blockOutputPeak = 0.0f;
        auto blockMaxReduction = 0.0f;

        for (int sample = 0; sample < numSamples; ++sample)
        {
            // Stereo-linked detection: one gain for both channels, so the
            // image doesn't wander when only one side is loud.
            auto detector = 0.0f;
            for (int channel = 0; channel < numChannels; ++channel)
                detector = juce::jmax (detector, std::abs (buffer.getSample (channel, sample)));

            blockInputPeak = juce::jmax (blockInputPeak, detector);

            const auto inputDb = juce::Decibels::gainToDecibels (detector, -100.0f);
            const auto targetDb = inputDb - computeOutputDb (inputDb, threshold, ratio, knee);

            // Attack when reduction is deepening, release when it's letting
            // go — the coefficient is chosen per sample from the direction.
            const auto coeff = targetDb > envelopeDb ? attackCoeff : releaseCoeff;
            envelopeDb += (targetDb - envelopeDb) * coeff;

            blockMaxReduction = juce::jmax (blockMaxReduction, envelopeDb);

            const auto gain = juce::Decibels::decibelsToGain (-envelopeDb) * makeup;

            for (int channel = 0; channel < numChannels; ++channel)
            {
                const auto dry = buffer.getSample (channel, sample);
                const auto wet = dry * gain;
                const auto out = dry + (wet - dry) * mix;
                buffer.setSample (channel, sample, out);
                blockOutputPeak = juce::jmax (blockOutputPeak, std::abs (out));
            }
        }

        // Decay the published peaks toward the block's own, so the meters fall
        // smoothly between the 30Hz reads instead of flickering.
        const auto decay = 0.6f;
        inputPeak = juce::jmax (blockInputPeak, inputPeak * decay);
        outputPeak = juce::jmax (blockOutputPeak, outputPeak * decay);

        inputDb.store (juce::Decibels::gainToDecibels (inputPeak, -100.0f));
        outputDb.store (juce::Decibels::gainToDecibels (outputPeak, -100.0f));
        reductionDb.store (blockMaxReduction);
    }

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "VSReacT Compressor"; }
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

    // Read by the editor's timer, written by the audio thread.
    std::atomic<float> inputDb { -100.0f };
    std::atomic<float> outputDb { -100.0f };
    std::atomic<float> reductionDb { 0.0f };

private:
    double sampleRate = 44100.0;
    float envelopeDb = 0.0f;
    float inputPeak = 0.0f;
    float outputPeak = 0.0f;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (CompressorProcessor)
};

//==============================================================================
class CompressorEditor final : public juce::AudioProcessorEditor,
                               private juce::Timer
{
public:
    explicit CompressorEditor (CompressorProcessor& p)
        : AudioProcessorEditor (&p), processor (p), bridge (p.state),
          presets (p.state, presetOptions())
    {
        vsreact::RootOptions options;
        options.bundleFile = juce::File (juce::String (COMPRESSOR_EXAMPLE_BUNDLE_PATH));
        options.watchForChanges = true;
        options.onNativeCall = [this] (const juce::String& name, const juce::var& args) -> juce::var
        {
            if (auto handled = presets.handleNativeCall (name, args))
                return *handled;
            if (auto handled = bridge.handleNativeCall (name, args))
                return *handled;

            return {};
        };

        root = std::make_unique<vsreact::RootView> (std::move (options));
        bridge.attach (*root);
        presets.attach (*root);
        addAndMakeVisible (*root);

        // Resizable, with the size surviving the session: the whole panel is
        // flexbox, so any size in the limits reflows instead of scaling.
        // Read the saved size BEFORE installing the constrainer — its limits
        // fire resized(), and persisting from that call would overwrite the
        // saved size with the clamped construction-time bounds.
        const int savedW = (int) processor.state.state.getProperty ("uiWidth", 720);
        const int savedH = (int) processor.state.state.getProperty ("uiHeight", 420);
        setSize (savedW, savedH);
        constructed = true;
        startTimerHz (30);
    }

    void resized() override
    {
        if (root != nullptr)
            root->setBounds (getLocalBounds());

        // Persist through the APVTS state tree — rides along with
        // get/setStateInformation for free, so reopening a project reopens
        // the editor at the size you left it.
        if (constructed)
        {
            processor.state.state.setProperty ("uiWidth", getWidth(), nullptr);
            processor.state.state.setProperty ("uiHeight", getHeight(), nullptr);
        }
    }

private:
    static vsreact::PresetManager::Options presetOptions()
    {
        // Factory presets are parameter values in natural units — the same
        // numbers you'd dial in by hand. User presets save alongside them as
        // files under the per-user app-data directory.
        vsreact::PresetManager::Options options;
        options.appName = "VSReacT Compressor";
        options.factoryPresets = {
            { "Default",
              { { "threshold", -18.0f }, { "ratio", 4.0f }, { "attack", 8.0f },
                { "release", 140.0f }, { "knee", 6.0f }, { "makeup", 0.0f }, { "mix", 100.0f } } },
            { "Gentle Bus",
              { { "threshold", -12.0f }, { "ratio", 2.0f }, { "attack", 30.0f },
                { "release", 250.0f }, { "knee", 12.0f }, { "makeup", 1.5f }, { "mix", 100.0f } } },
            { "Drum Smash",
              { { "threshold", -30.0f }, { "ratio", 10.0f }, { "attack", 1.0f },
                { "release", 60.0f }, { "knee", 3.0f }, { "makeup", 6.0f }, { "mix", 80.0f } } },
            { "Vocal Leveler",
              { { "threshold", -22.0f }, { "ratio", 3.0f }, { "attack", 15.0f },
                { "release", 180.0f }, { "knee", 9.0f }, { "makeup", 3.0f }, { "mix", 100.0f } } },
        };
        return options;
    }

    void timerCallback() override
    {
        // Three numbers, thirty times a second. The curve the UI draws around
        // them is computed in TypeScript from the parameters it already has.
        auto* payload = new juce::DynamicObject();
        payload->setProperty ("in", processor.inputDb.load());
        payload->setProperty ("gr", processor.reductionDb.load());
        payload->setProperty ("out", processor.outputDb.load());
        root->sendNativeEvent ("meters", juce::var (payload));
    }

    CompressorProcessor& processor;
    vsreact::ParameterBridge bridge;
    vsreact::PresetManager presets;
    std::unique_ptr<vsreact::RootView> root;
    bool constructed = false;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (CompressorEditor)
};

juce::AudioProcessorEditor* CompressorProcessor::createEditor()
{
    return new CompressorEditor (*this);
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new CompressorProcessor();
}
