#pragma once

#include <juce_gui_basics/juce_gui_basics.h>

namespace vsreact
{

/** RN-redbox-style overlay shown when the JS bundle throws. */
class ErrorOverlay final : public juce::Component
{
public:
    ErrorOverlay()
    {
        setInterceptsMouseClicks (true, false);
    }

    void show (const juce::String& newMessage, const juce::String& newStack)
    {
        message = newMessage;
        stack = newStack;
        setVisible (true);
        toFront (false);
        repaint();
    }

    void paint (juce::Graphics& g) override
    {
        g.fillAll (juce::Colour (0xee3b0d12));

        auto area = getLocalBounds().reduced (24);

        g.setColour (juce::Colour (0xffff5f6d));
        g.setFont (juce::FontOptions { 20.0f, juce::Font::bold });
        g.drawText ("VSReacT — JavaScript error", area.removeFromTop (32),
                    juce::Justification::centredLeft);

        area.removeFromTop (8);

        g.setColour (juce::Colours::white);
        g.setFont (juce::FontOptions { 15.0f, juce::Font::bold });
        g.drawFittedText (message, area.removeFromTop (60), juce::Justification::topLeft, 3);

        area.removeFromTop (8);

        g.setColour (juce::Colour (0xffffc2c8));
        g.setFont (juce::FontOptions { juce::Font::getDefaultMonospacedFontName(), 12.0f, 0 });
        g.drawFittedText (stack, area, juce::Justification::topLeft, 40);
    }

private:
    juce::String message, stack;
};

} // namespace vsreact
