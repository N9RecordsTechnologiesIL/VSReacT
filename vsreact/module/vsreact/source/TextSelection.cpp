#include "TextSelection.h"

#include <cmath>
#include <limits>

namespace vsreact
{

juce::String TextSelection::visibleText (const Node& node)
{
    return visibleText (node, node.effectiveStyle());
}

juce::String TextSelection::visibleText (const Node& node, const Style& style)
{
    auto text = node.textContent();
    const auto caseTransform = style.getString ("textTransform");

    if (caseTransform == "uppercase")
        text = text.toUpperCase();
    else if (caseTransform == "lowercase")
        text = text.toLowerCase();
    else if (caseTransform == "capitalize")
    {
        auto words = juce::StringArray::fromTokens (text, " ", {});

        for (auto& word : words)
            if (word.isNotEmpty())
                word = word.substring (0, 1).toUpperCase() + word.substring (1);

        text = words.joinIntoString (" ");
    }

    return text;
}

std::vector<juce::Rectangle<float>> TextSelection::characterBoxes (const Node& node)
{
    const auto style = node.effectiveStyle();
    const auto text = visibleText (node, style);

    std::vector<juce::Rectangle<float>> boxes (static_cast<size_t> (text.length()));

    if (text.isEmpty() || node.frame.isEmpty())
        return boxes;

    const auto font = style.font();

    juce::AttributedString attributed;
    attributed.setText (text);
    attributed.setFont (font);
    attributed.setJustification (style.textAlign());

    const auto lineHeight = style.getFloat ("lineHeight", 0.0f);

    if (lineHeight > 0.0f)
        attributed.setLineSpacing (juce::jmax (0.0f, lineHeight - font.getHeight()));

    juce::TextLayout layout;
    layout.createLayout (attributed, node.frame.getWidth());

    const auto y = node.frame.getY()
                 + juce::jmax (0.0f, (node.frame.getHeight() - layout.getHeight()) * 0.5f);

    for (int lineIndex = 0; lineIndex < layout.getNumLines(); ++lineIndex)
    {
        const auto& line = layout.getLine (lineIndex);
        const auto lineTop = y + line.lineOrigin.y - line.ascent;
        const auto lineHeightPx = line.ascent + line.descent;

        for (const auto* run : line.runs)
        {
            // Glyph order tracks character order within the run; ligatures
            // may merge characters (the fixup below fills the holes).
            const auto base = run->stringRange.getStart();
            const auto last = juce::jmax (base, run->stringRange.getEnd() - 1);

            for (int glyphIndex = 0; glyphIndex < run->glyphs.size(); ++glyphIndex)
            {
                const auto& glyph = run->glyphs.getReference (glyphIndex);
                const auto charIndex = juce::jlimit (base, last, base + glyphIndex);

                if (charIndex >= 0 && charIndex < static_cast<int> (boxes.size()))
                    boxes[static_cast<size_t> (charIndex)] = {
                        node.frame.getX() + line.lineOrigin.x + glyph.anchor.x,
                        lineTop,
                        juce::jmax (1.0f, glyph.width),
                        lineHeightPx,
                    };
            }
        }
    }

    juce::Rectangle<float> previous;

    for (auto& box : boxes)
    {
        if (box.isEmpty() && ! previous.isEmpty())
            box = { previous.getRight(), previous.getY(), 1.0f, previous.getHeight() };

        if (! box.isEmpty())
            previous = box;
    }

    return boxes;
}

int TextSelection::caretIndexAt (const Node& node, juce::Point<float> position)
{
    const auto boxes = characterBoxes (node);

    if (boxes.empty())
        return 0;

    // Pick the vertically nearest line…
    auto bestDistance = std::numeric_limits<float>::max();
    float lineTop = 0.0f;

    for (const auto& box : boxes)
    {
        if (box.isEmpty())
            continue;

        const auto distance = position.y < box.getY()      ? box.getY() - position.y
                            : position.y > box.getBottom() ? position.y - box.getBottom()
                                                           : 0.0f;

        if (distance < bestDistance)
        {
            bestDistance = distance;
            lineTop = box.getY();
        }
    }

    // …then the nearest character boundary along it.
    int caret = 0;
    bool foundLine = false;

    for (int i = 0; i < static_cast<int> (boxes.size()); ++i)
    {
        const auto& box = boxes[static_cast<size_t> (i)];

        if (box.isEmpty() || std::abs (box.getY() - lineTop) > 0.5f)
            continue;

        if (! foundLine)
        {
            foundLine = true;
            caret = i;
        }

        if (position.x >= box.getCentreX())
            caret = i + 1;
    }

    return caret;
}

std::vector<juce::Rectangle<float>> TextSelection::selectionRects (const Node& node,
                                                                   int start, int end)
{
    std::vector<juce::Rectangle<float>> rects;
    const auto boxes = characterBoxes (node);

    start = juce::jlimit (0, static_cast<int> (boxes.size()), start);
    end = juce::jlimit (0, static_cast<int> (boxes.size()), end);

    juce::Rectangle<float> current;

    for (int i = start; i < end; ++i)
    {
        const auto& box = boxes[static_cast<size_t> (i)];

        if (box.isEmpty())
            continue;

        if (current.isEmpty())
            current = box;
        else if (std::abs (box.getY() - current.getY()) < 0.5f)
            current = current.getUnion (box);
        else
        {
            rects.push_back (current);
            current = box;
        }
    }

    if (! current.isEmpty())
        rects.push_back (current);

    return rects;
}

juce::Range<int> TextSelection::wordRangeAt (const juce::String& text, int index)
{
    const auto length = text.length();

    if (length == 0)
        return {};

    index = juce::jlimit (0, length - 1, index);

    const auto isWordChar = [] (juce::juce_wchar c)
    {
        return juce::CharacterFunctions::isLetterOrDigit (c) || c == '_';
    };

    if (! isWordChar (text[index]))
        return { index, index + 1 };

    auto start = index;
    auto end = index + 1;

    while (start > 0 && isWordChar (text[start - 1]))
        --start;

    while (end < length && isWordChar (text[end]))
        ++end;

    return { start, end };
}

} // namespace vsreact
