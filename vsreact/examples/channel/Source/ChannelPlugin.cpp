// VSReacT example channel strip: three RBJ biquad EQ bands (the same
// cookbook math the React EQCurve draws), a simple RMS compressor with
// a gain-reduction meter, and an output stage. Meters ride native
// events; PostHog gets sessions and screens.

#include <juce_audio_utils/juce_audio_utils.h>
#include <vsreact/vsreact.h>

namespace
{
/** One RBJ biquad, coefficients from the cookbook (mirrors eq.tsx). */
struct Biquad
{
    float b0 = 1, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
    float x1 = 0, x2 = 0, y1 = 0, y2 = 0;

    enum class Kind { lowshelf, peak, highshelf };

    void configure (Kind kind, double sampleRate, float freq, float gainDb, float q)
    {
        const auto A = std::pow (10.0f, gainDb / 40.0f);
        const auto w0 = float (juce::MathConstants<double>::twoPi * freq / sampleRate);
        const auto cosw = std::cos (w0);
        const auto sinw = std::sin (w0);
        const auto alpha = sinw / (2.0f * q);
        const auto rootA2Alpha = 2.0f * std::sqrt (A) * alpha;

        float rb0, rb1, rb2, ra0, ra1, ra2;
        if (kind == Kind::peak)
        {
            rb0 = 1 + alpha * A; rb1 = -2 * cosw; rb2 = 1 - alpha * A;
            ra0 = 1 + alpha / A; ra1 = -2 * cosw; ra2 = 1 - alpha / A;
        }
        else if (kind == Kind::lowshelf)
        {
            rb0 = A * (A + 1 - (A - 1) * cosw + rootA2Alpha);
            rb1 = 2 * A * (A - 1 - (A + 1) * cosw);
            rb2 = A * (A + 1 - (A - 1) * cosw - rootA2Alpha);
            ra0 = A + 1 + (A - 1) * cosw + rootA2Alpha;
            ra1 = -2 * (A - 1 + (A + 1) * cosw);
            ra2 = A + 1 + (A - 1) * cosw - rootA2Alpha;
        }
        else
        {
            rb0 = A * (A + 1 + (A - 1) * cosw + rootA2Alpha);
            rb1 = -2 * A * (A - 1 + (A + 1) * cosw);
            rb2 = A * (A + 1 + (A - 1) * cosw - rootA2Alpha);
            ra0 = A + 1 - (A - 1) * cosw + rootA2Alpha;
            ra1 = 2 * (A - 1 - (A + 1) * cosw);
            ra2 = A + 1 - (A - 1) * cosw - rootA2Alpha;
        }

        b0 = rb0 / ra0; b1 = rb1 / ra0; b2 = rb2 / ra0;
        a1 = ra1 / ra0; a2 = ra2 / ra0;
    }

    float process (float x)
    {
        const float y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
        x2 = x1; x1 = x;
        y2 = y1; y1 = y;
        return y;
    }
};
} // namespace

class ChannelProcessor final : public juce::AudioProcessor
{
public:
    ChannelProcessor()
        : AudioProcessor (BusesProperties()
                              .withInput ("Input", juce::AudioChannelSet::stereo(), true)
                              .withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
          state (*this, nullptr, "PARAMS", createLayout())
    {}

    static juce::AudioProcessorValueTreeState::ParameterLayout createLayout()
    {
        juce::AudioProcessorValueTreeState::ParameterLayout layout;
        auto db = [] (const char* id, const char* name)
        {
            return std::make_unique<juce::AudioParameterFloat> (
                id, name, juce::NormalisableRange<float> (-12.0f, 12.0f, 0.1f), 0.0f,
                juce::AudioParameterFloatAttributes().withLabel ("dB"));
        };

        layout.add (db ("low_gain", "Low"));
        layout.add (db ("mid_gain", "Mid"));
        layout.add (std::make_unique<juce::AudioParameterFloat> (
            "mid_freq", "Mid Freq",
            juce::NormalisableRange<float> (200.0f, 5000.0f, 1.0f, 0.35f), 1000.0f,
            juce::AudioParameterFloatAttributes().withLabel ("Hz")));
        layout.add (db ("high_gain", "High"));
        layout.add (std::make_unique<juce::AudioParameterFloat> (
            "comp", "Compress", juce::NormalisableRange<float> (0.0f, 1.0f, 0.01f), 0.3f));
        layout.add (db ("out_gain", "Output"));
        return layout;
    }

    void prepareToPlay (double sr, int) override
    {
        sampleRate = sr;
        for (auto& channelFilters : filters)
            for (auto& filter : channelFilters)
                filter = {};
        envelope = 0.0f;
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

        const float lowGain = state.getRawParameterValue ("low_gain")->load();
        const float midGain = state.getRawParameterValue ("mid_gain")->load();
        const float midFreq = state.getRawParameterValue ("mid_freq")->load();
        const float highGain = state.getRawParameterValue ("high_gain")->load();
        const float comp = state.getRawParameterValue ("comp")->load();
        const float outGain = juce::Decibels::decibelsToGain (state.getRawParameterValue ("out_gain")->load());

        for (int channel = 0; channel < juce::jmin (2, buffer.getNumChannels()); ++channel)
        {
            filters[size_t (channel)][0].configure (Biquad::Kind::lowshelf, sampleRate, 200.0f, lowGain, 0.71f);
            filters[size_t (channel)][1].configure (Biquad::Kind::peak, sampleRate, midFreq, midGain, 0.9f);
            filters[size_t (channel)][2].configure (Biquad::Kind::highshelf, sampleRate, 4000.0f, highGain, 0.71f);
        }

        float inPeak = 0.0f, outPeak = 0.0f;
        const float attackCoefficient = 1.0f - std::exp (-1.0f / (0.005f * float (sampleRate)));
        const float releaseCoefficient = 1.0f - std::exp (-1.0f / (0.12f * float (sampleRate)));

        for (int i = 0; i < buffer.getNumSamples(); ++i)
        {
            float linked = 0.0f;
            std::array<float, 2> shaped {};

            for (int channel = 0; channel < juce::jmin (2, buffer.getNumChannels()); ++channel)
            {
                float sample = buffer.getReadPointer (channel)[i];
                inPeak = juce::jmax (inPeak, std::abs (sample));
                for (auto& filter : filters[size_t (channel)])
                    sample = filter.process (sample);
                shaped[size_t (channel)] = sample;
                linked = juce::jmax (linked, std::abs (sample));
            }

            const float coefficient = linked > envelope ? attackCoefficient : releaseCoefficient;
            envelope += coefficient * (linked - envelope);

            const float envelopeDb = juce::Decibels::gainToDecibels (envelope, -60.0f);
            const float threshold = -30.0f + 18.0f * (1.0f - comp);
            const float over = juce::jmax (0.0f, envelopeDb - threshold);
            const float reductionDb = juce::jmin (18.0f, over * comp * 0.8f);
            const float reduction = juce::Decibels::decibelsToGain (-reductionDb);

            currentReduction = juce::jmax (currentReduction * 0.9995f, reductionDb);

            for (int channel = 0; channel < juce::jmin (2, buffer.getNumChannels()); ++channel)
            {
                const float sample = shaped[size_t (channel)] * reduction * outGain;
                buffer.getWritePointer (channel)[i] = sample;
                outPeak = juce::jmax (outPeak, std::abs (sample));
            }
        }

        inputLevel.store (juce::jmax (inPeak, inputLevel.load() * 0.86f));
        outputLevel.store (juce::jmax (outPeak, outputLevel.load() * 0.86f));
        gainReductionDb.store (currentReduction);
    }

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "VSReacT Channel"; }
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
    std::atomic<float> inputLevel { 0.0f };
    std::atomic<float> outputLevel { 0.0f };
    std::atomic<float> gainReductionDb { 0.0f };

private:
    std::array<std::array<Biquad, 3>, 2> filters;
    double sampleRate = 48000.0;
    float envelope = 0.0f;
    float currentReduction = 0.0f;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (ChannelProcessor)
};

//==============================================================================
class ChannelEditor final : public juce::AudioProcessorEditor,
                            private juce::Timer
{
public:
    explicit ChannelEditor (ChannelProcessor& p)
        : AudioProcessorEditor (&p), processor (p), bridge (p.state)
    {
        vsreact::PostHogBridge::Options analytics;
        analytics.apiKey = "phc_YOUR_PROJECT_API_KEY";
        analytics.host = "https://eu.i.posthog.com";
        analytics.stateFile = juce::File::getSpecialLocation (juce::File::userApplicationDataDirectory)
                                  .getChildFile ("VSReacT Examples").getChildFile ("channel-posthog-id.txt");
        posthog = std::make_unique<vsreact::PostHogBridge> (analytics);

        vsreact::RootOptions options;
        options.bundleFile = juce::File (juce::String (CHANNEL_EXAMPLE_BUNDLE_PATH));
        options.watchForChanges = true;
        options.onNativeCall = [this] (const juce::String& name, const juce::var& args) -> juce::var
        {
            if (auto handled = posthog->handleNativeCall (name, args)) return *handled;
            if (auto handled = bridge.handleNativeCall (name, args)) return *handled;
            return {};
        };

        root = std::make_unique<vsreact::RootView> (std::move (options));
        bridge.attach (*root);
        addAndMakeVisible (*root);
        setSize (560, 400);
        startTimerHz (30);
    }

    void resized() override { root->setBounds (getLocalBounds()); }

private:
    void timerCallback() override
    {
        auto* payload = new juce::DynamicObject();
        payload->setProperty ("in", processor.inputLevel.load());
        payload->setProperty ("gr", processor.gainReductionDb.load());
        payload->setProperty ("out", processor.outputLevel.load());
        root->sendNativeEvent ("meters", juce::var (payload));
    }

    ChannelProcessor& processor;
    vsreact::ParameterBridge bridge;
    std::unique_ptr<vsreact::PostHogBridge> posthog;
    std::unique_ptr<vsreact::RootView> root;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (ChannelEditor)
};

juce::AudioProcessorEditor* ChannelProcessor::createEditor() { return new ChannelEditor (*this); }

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() { return new ChannelProcessor(); }
