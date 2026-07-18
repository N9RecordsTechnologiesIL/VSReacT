#pragma once

#include "ShadowTree.h"

#include <juce_gui_basics/juce_gui_basics.h>

#include <array>

namespace vsreact
{

/** Hosts a real juce::TextEditor for a textinput node. The editor's chrome is
    stripped — VSReacT paints the box, border and focus ring — while the editor
    supplies the caret, selection, IME and keyboard handling. */
class TextInputHost final : public juce::Component,
                            private juce::TextEditor::Listener
{
public:
    /** type: change | submit | focus | blur; payload: { value } */
    std::function<void (const juce::String& type, const juce::var& payload)> onEvent;

    TextInputHost()
    {
        editor.setMultiLine (false);
        editor.setReturnKeyStartsNewLine (false);
        // Tab leaves the field (bubbles up to RootView's focus cycle)
        // instead of typing a character — the web model.
        editor.setTabKeyUsedAsCharacter (false);
        editor.setJustification (juce::Justification::centredLeft);
        editor.setColour (juce::TextEditor::backgroundColourId, juce::Colours::transparentBlack);
        editor.setColour (juce::TextEditor::outlineColourId, juce::Colours::transparentBlack);
        editor.setColour (juce::TextEditor::focusedOutlineColourId, juce::Colours::transparentBlack);
        editor.setColour (juce::TextEditor::shadowColourId, juce::Colours::transparentBlack);
        editor.addListener (this);

        editor.onFocusChanged = [this] (bool gained)
        { emit (gained ? "focus" : "blur"); };

        addAndMakeVisible (editor);
    }

    ~TextInputHost() override
    {
        editor.removeListener (this);
    }

    /** Tab-focus from the RootView cycle lands on the editor itself. */
    void focusGained (FocusChangeType) override
    {
        editor.grabKeyboardFocus();
    }

    /** Applies the node's style + props to the editor. */
    void applyNode (const Node& node)
    {
        const auto style = node.effectiveStyle();

        const auto textColour = style.getColour ("color").value_or (juce::Colours::white);
        const auto caretColour = style.getColour ("caretColor").value_or (textColour);

        editor.setFont (style.font());
        editor.applyFontToAllText (style.font());
        editor.setColour (juce::TextEditor::textColourId, textColour);
        editor.applyColourToAllText (textColour);
        editor.setColour (juce::CaretComponent::caretColourId, caretColour);
        editor.setColour (juce::TextEditor::highlightColourId, caretColour.withAlpha (0.35f));
        editor.setColour (juce::TextEditor::highlightedTextColourId, textColour);

        const auto placeholder = node.props["placeholder"].toString();
        const auto placeholderColour = style.getColour ("placeholderColor")
                                           .value_or (textColour.withAlpha (0.4f));
        editor.setTextToShowWhenEmpty (placeholder, placeholderColour);

        if (const auto* object = node.props.getDynamicObject())
        {
            if (object->hasProperty ("value"))
            {
                const auto value = object->getProperty ("value").toString();

                if (editor.getText() != value)
                    editor.setText (value, juce::dontSendNotification);
            }
            else if (object->hasProperty ("defaultValue") && ! defaultApplied)
            {
                editor.setText (object->getProperty ("defaultValue").toString(),
                                juce::dontSendNotification);
            }

            editor.setEnabled (! static_cast<bool> (object->getProperty ("disabled")));
        }

        defaultApplied = true;

        const auto edgeInset = [&style] (const char* side) -> float
        {
            const auto padding = style.getFloat (side, style.getFloat ("padding", 0.0f));
            return padding + style.getFloat ("borderWidth", 0.0f);
        };

        insets = { edgeInset ("paddingLeft"), edgeInset ("paddingTop"),
                   edgeInset ("paddingRight"), edgeInset ("paddingBottom") };
        resized();
    }

    juce::String getValue() const { return editor.getText(); }

    void resized() override
    {
        editor.setBounds (juce::Rectangle<float> (insets[0], insets[1],
                                                  getWidth() - insets[0] - insets[2],
                                                  getHeight() - insets[1] - insets[3])
                              .toNearestInt());
    }

private:
    struct FocusReportingEditor final : juce::TextEditor
    {
        std::function<void (bool)> onFocusChanged;

        void focusGained (FocusChangeType cause) override
        {
            juce::TextEditor::focusGained (cause);

            if (onFocusChanged != nullptr)
                onFocusChanged (true);
        }

        void focusLost (FocusChangeType cause) override
        {
            juce::TextEditor::focusLost (cause);

            if (onFocusChanged != nullptr)
                onFocusChanged (false);
        }
    };

    void emit (const juce::String& type)
    {
        if (onEvent == nullptr)
            return;

        auto* payload = new juce::DynamicObject();
        payload->setProperty ("value", editor.getText());
        onEvent (type, juce::var (payload));
    }

    void textEditorTextChanged (juce::TextEditor&) override { emit ("change"); }
    void textEditorReturnKeyPressed (juce::TextEditor&) override { emit ("submit"); }

    FocusReportingEditor editor;
    std::array<float, 4> insets { 0.0f, 0.0f, 0.0f, 0.0f };
    bool defaultApplied = false;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (TextInputHost)
};

} // namespace vsreact
