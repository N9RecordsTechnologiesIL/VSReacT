#pragma once

#include <juce_graphics/juce_graphics.h>

#include <map>
#include <vector>

namespace vsreact
{

/** Owns typefaces registered from font-file bytes so `fontFamily` can resolve
    to a bundled font instead of a system-installed one. Message thread only. */
class FontRegistry
{
public:
    /** Decodes `src` (a base64 `data:` URI or a file path) and stores the
        resulting typeface under `family` at `weight`. False if undecodable. */
    bool registerFont (const juce::String& family, const juce::String& src, int weight);

    /** Nearest-weight typeface for a family, or nullptr if none registered. */
    juce::Typeface::Ptr find (const juce::String& family, int weight) const;

    bool isEmpty() const noexcept { return faces.empty(); }

private:
    struct Face { int weight; juce::Typeface::Ptr typeface; };
    std::map<juce::String, std::vector<Face>> faces;

    static juce::MemoryBlock decodeBytes (const juce::String& src);
};

} // namespace vsreact
